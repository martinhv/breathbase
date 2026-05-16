import { useEffect } from "react";
import * as Tone from "tone";
import { useSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/storage";
import { DEFAULT_CHIME_HZ, type PhaseKind } from "@/lib/techniques";

/**
 * Module-level audio engine singleton.
 *
 * Sound design:
 *   - Acoustic piano (Salamander Grand, loaded from the Tone.js CDN) carries
 *     all melodic content. The chord progression cycles vi → IV → I → V in
 *     C major (Am9 → Fmaj9 → Cmaj9 → G6sus) — a Yasunori Mitsuda / Nobuo
 *     Uematsu staple that reads as both contemplative (Final Fantasy
 *     "To Zanarkand") and uplifting (Xenoblade "Forest of the Nopon").
 *   - Music is driven by the breath cycle, not by a fixed timer:
 *       inhale  → ascending arpeggio over the phase's exact duration
 *       hold_in → ringing chord + a single high melodic accent at midpoint
 *       exhale  → descending arpeggio
 *       hold_out→ low bass + soft inner chord
 *     The chord advances at every new cycle boundary, so the harmony
 *     develops in time with the breath rather than independently.
 *   - A separate sine Synth still handles per-transition chimes.
 *
 * Lifecycle:
 *   The engine is a module-level singleton (NOT a hook-owned object) so its
 *   audio graph survives React StrictMode double-mounts, route changes, and
 *   re-renders. The graph is built lazily on first `unlock()` — which must
 *   be called from a real user gesture (Chrome autoplay policy).
 */

type ChordEntry = {
  /** Bass note an octave or two below the chord proper. */
  bass: string;
  /** Chord tones from low to high (used for ascending/descending arpeggios). */
  notes: string[];
};

const PROGRESSION: ChordEntry[] = [
  // Am9 — vi9: A C E G B
  { bass: "A2", notes: ["A3", "C4", "E4", "G4", "B4"] },
  // Fmaj9 — IV9: F A C E G
  { bass: "F2", notes: ["F3", "A3", "C4", "E4", "G4"] },
  // Cmaj9 — I9: C E G B D
  { bass: "C3", notes: ["C4", "E4", "G4", "B4", "D5"] },
  // G6sus4 — V suspended: G C D E A
  { bass: "G2", notes: ["G3", "C4", "D4", "E4", "A4"] },
];

const linearToDb = (x: number): number => {
  if (x <= 0) return -60;
  return Math.max(-60, 20 * Math.log10(x));
};

/** Shift a pitch string up by N octaves. Returns input if unparseable. */
function shiftOctave(note: string, by: number): string {
  const m = note.match(/^([A-G]#?b?)(-?\d+)$/);
  if (!m) return note;
  return `${m[1]}${Number(m[2]) + by}`;
}

class AudioEngineImpl {
  private piano: Tone.Sampler | null = null;
  private pianoVolume: Tone.Volume | null = null;
  private reverb: Tone.Reverb | null = null;
  private chime: Tone.Synth | null = null;
  private chimeVolume: Tone.Volume | null = null;
  private master: Tone.Volume | null = null;

  private started = false;
  private musicPlaying = false;
  private chordIdx = 0;
  private lastCycleNumber = 0;

  private settings: Settings = DEFAULT_SETTINGS;

  /**
   * Build the audio graph. Idempotent. Called from `unlock()` after
   * Tone.start() so all nodes are constructed against a running context.
   *
   *   piano → pianoVolume → reverb → master → destination
   *   chime → chimeVolume → destination
   */
  private buildGraph(): void {
    if (this.piano) return;
    const s = this.settings;
    this.master = new Tone.Volume(linearToDb(s.masterVolume)).toDestination();
    this.reverb = new Tone.Reverb({ decay: 6, wet: 0.35 }).connect(this.master);
    this.pianoVolume = new Tone.Volume(
      s.musicEnabled ? linearToDb(s.musicVolume) : -Infinity,
    ).connect(this.reverb);

    // Salamander Grand Piano samples are hosted by the Tone.js project as
    // unbundled mp3s. We list a handful of anchor notes and let the Sampler
    // pitch-shift to play everything in between.
    this.piano = new Tone.Sampler({
      urls: {
        A2: "A2.mp3",
        A3: "A3.mp3",
        A4: "A4.mp3",
        A5: "A5.mp3",
        C3: "C3.mp3",
        C4: "C4.mp3",
        C5: "C5.mp3",
        "F#2": "Fs2.mp3",
        "F#3": "Fs3.mp3",
        "F#4": "Fs4.mp3",
        "F#5": "Fs5.mp3",
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      release: 2.5,
      onload: () => {
        // eslint-disable-next-line no-console
        console.info("[audio] piano samples loaded");
      },
    }).connect(this.pianoVolume);

    this.chimeVolume = new Tone.Volume(
      s.chimesEnabled ? linearToDb(s.chimeVolume) - 6 : -Infinity,
    ).toDestination();
    this.chime = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0, release: 1.6 },
    }).connect(this.chimeVolume);
  }

  async unlock(): Promise<void> {
    try {
      await Tone.start();
    } catch {
      /* AudioContext may already be running. */
    }
    this.buildGraph();
    this.started = true;
  }

  applySettings(next: Settings): void {
    this.settings = next;
    if (this.master)
      this.master.volume.rampTo(linearToDb(next.masterVolume), 0.1);
    if (this.pianoVolume)
      this.pianoVolume.volume.rampTo(
        next.musicEnabled ? linearToDb(next.musicVolume) : -Infinity,
        0.2,
      );
    if (this.chimeVolume)
      this.chimeVolume.volume.rampTo(
        next.chimesEnabled ? linearToDb(next.chimeVolume) - 6 : -Infinity,
        0.1,
      );
  }

  /** Begin a musical session. Resets the progression and plays an opening
   * voicing softly during the ready countdown. */
  startMusic(): void {
    if (this.musicPlaying) return;
    if (!this.settings.musicEnabled) {
      // eslint-disable-next-line no-console
      console.info("[audio] startMusic: music disabled in settings");
      return;
    }
    if (!this.piano) {
      // eslint-disable-next-line no-console
      console.warn("[audio] startMusic: graph not built — call unlock() first");
      return;
    }
    // eslint-disable-next-line no-console
    console.info("[audio] startMusic");
    this.musicPlaying = true;
    this.chordIdx = 0;
    this.lastCycleNumber = 0;
    // Soft intro chord at low velocity — sits under the "Get ready" countdown.
    if (this.piano.loaded) {
      const chord = PROGRESSION[0];
      const t = Tone.now();
      this.piano.triggerAttackRelease(chord.bass, 4, t, 0.35);
      this.piano.triggerAttackRelease(chord.notes.slice(0, 3), 4, t + 0.15, 0.25);
    }
  }

  stopMusic(): void {
    if (!this.musicPlaying) return;
    this.musicPlaying = false;
    this.piano?.releaseAll();
  }

  /**
   * Play a musical phrase tightly aligned to the given breath phase.
   * Called from Session.tsx's `onPhaseEnter` so the rhythm of the music IS
   * the rhythm of the breath.
   *
   * @param phaseKind     inhale | exhale | hold_in | hold_out
   * @param durationMs    exact duration of this phase from techniques.ts
   * @param cycleNumber   1-based canonical cycle (0 for rest/roundEnd)
   */
  playPhrase(
    phaseKind: PhaseKind,
    durationMs: number,
    cycleNumber: number,
  ): void {
    if (!this.musicPlaying) return;
    if (!this.piano || !this.piano.loaded) return;
    if (!this.settings.musicEnabled) return;

    // Advance the chord when we cross a cycle boundary. cycleNumber 0 means
    // a non-cycle phase (rest, roundEnd) — those keep the current chord.
    if (cycleNumber > 0 && cycleNumber !== this.lastCycleNumber) {
      if (this.lastCycleNumber > 0) {
        this.chordIdx = (this.chordIdx + 1) % PROGRESSION.length;
      } else {
        this.chordIdx = 0;
      }
      this.lastCycleNumber = cycleNumber;
    }

    const chord = PROGRESSION[this.chordIdx];
    const now = Tone.now();
    const dur = durationMs / 1000;

    // Non-cycle phases (rest / roundEnd): keep it minimal — bass drone with
    // soft lower chord. Lets the recovery period feel like breathing space.
    if (cycleNumber === 0) {
      this.piano.triggerAttackRelease(chord.bass, dur + 1, now, 0.28);
      this.piano.triggerAttackRelease(
        chord.notes.slice(0, 2),
        dur + 1,
        now + 0.2,
        0.18,
      );
      return;
    }

    switch (phaseKind) {
      case "inhale": {
        // Ascending arpeggio over the exact phase duration.
        // Bass anchors the start.
        this.piano.triggerAttackRelease(chord.bass, dur + 2, now, 0.55);
        const notes = chord.notes;
        const step = Math.max(0.18, dur / notes.length);
        notes.forEach((n, i) => {
          const t = now + i * step;
          // Slight crescendo as the breath rises.
          const v = 0.5 + (i / Math.max(1, notes.length - 1)) * 0.2;
          // Each note rings into the next; tail set by remaining time.
          this.piano!.triggerAttackRelease(n, dur + 1.5 - i * step, t, v);
        });
        break;
      }

      case "hold_in": {
        // Ringing chord (top 3 notes). A single high melodic accent at the
        // midpoint adds variation within an otherwise sustained moment.
        const topThree = chord.notes.slice(-3);
        this.piano.triggerAttackRelease(topThree, dur + 1, now, 0.45);
        const top = chord.notes[chord.notes.length - 1];
        const accent = shiftOctave(top, 1);
        this.piano.triggerAttackRelease(accent, Math.max(0.8, dur / 2), now + dur / 2, 0.35);
        break;
      }

      case "exhale": {
        // Descending arpeggio. Bass on the downbeat.
        this.piano.triggerAttackRelease(chord.bass, dur + 2, now, 0.45);
        const notes = [...chord.notes].reverse();
        const step = Math.max(0.18, dur / notes.length);
        notes.forEach((n, i) => {
          const t = now + i * step;
          // Slight decrescendo as the breath falls.
          const v = 0.5 - (i / Math.max(1, notes.length - 1)) * 0.18;
          this.piano!.triggerAttackRelease(n, dur + 1.5 - i * step, t, v);
        });
        break;
      }

      case "hold_out": {
        // Quietest moment of the cycle — just bass and a low cluster.
        this.piano.triggerAttackRelease(chord.bass, dur + 1, now, 0.32);
        this.piano.triggerAttackRelease(
          chord.notes.slice(0, 2),
          dur + 1,
          now + 0.15,
          0.22,
        );
        break;
      }
    }
  }

  playChime(kind: PhaseKind, freqHz?: number): void {
    if (!this.settings.chimesEnabled) return;
    if (!this.chime) return;
    const f = freqHz ?? DEFAULT_CHIME_HZ[kind];
    try {
      this.chime.triggerAttackRelease(f, "8n");
    } catch {
      /* triggering too fast in a row can throw; ignore. */
    }
  }

  /**
   * Plays an unconditional chime + chord so Settings can verify audio
   * routing. Ignores musicEnabled/chimesEnabled flags.
   */
  async testSound(): Promise<void> {
    await this.unlock();
    if (this.chime) {
      try {
        this.chime.triggerAttackRelease(523.25, "8n");
      } catch {
        /* noop */
      }
    }
    if (this.piano) {
      // If samples aren't loaded yet, the Sampler silently no-ops.
      const chord = PROGRESSION[0];
      const t = Tone.now();
      this.piano.triggerAttackRelease(chord.bass, 2.5, t, 0.5);
      this.piano.triggerAttackRelease(chord.notes, 2.5, t + 0.1, 0.4);
    }
  }

  isStarted(): boolean {
    return this.started;
  }
  isMusicPlaying(): boolean {
    return this.musicPlaying;
  }
}

export const audioEngine = new AudioEngineImpl();
export type AudioEngine = AudioEngineImpl;

export function useAudioEngine(): AudioEngineImpl {
  const { settings } = useSettings();
  useEffect(() => {
    audioEngine.applySettings(settings);
  }, [settings]);
  return audioEngine;
}
