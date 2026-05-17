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
 *     all melodic content. The chord progression walks through 8 voicings in
 *     C major / A minor — vi-IV-I-V then iii-vi-ii-V — a Yasunori Mitsuda /
 *     Nobuo Uematsu staple that reads as both contemplative (Final Fantasy
 *     "To Zanarkand") and uplifting (Xenoblade "Forest of the Nopon").
 *   - Music is driven by the breath cycle, not by a fixed timer:
 *       inhale  → ascending arpeggio over the phase's exact duration
 *       hold_in → ringing chord + a single high melodic accent at midpoint
 *       exhale  → descending arpeggio
 *       hold_out→ low bass + soft inner chord
 *     The chord advances at every new cycle boundary, so the harmony
 *     develops in time with the breath rather than independently.
 *   - Every time the 8-chord progression wraps, a `passIndex` counter
 *     increments. Phrase shapes consult `passIndex` to subtly re-voice the
 *     same harmony on each loop (skipping chord tones, octave shifts on
 *     accent notes), so longer sessions don't lock into a perceptible loop.
 *   - Three ambient layers sit underneath the piano on the same music bus:
 *       * pad      – a slow, filter-modulated triangle/sine bed that holds
 *                    the current chord between piano triggers (the biggest
 *                    contributor to "presence"; fills the silent moments)
 *       * air      – very quiet band-passed pink noise with a slow LFO on
 *                    the filter, giving organic motion (~-30 dB under piano)
 *       * bell     – a single FM bell that rings each time the progression
 *                    wraps. Sparse by design — marks completion of a full
 *                    8-chord journey, ~once every 1–2 min depending on cycle.
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
  // ── First half: classical pop turnaround vi-IV-I-V ─────────────────────
  // Am9 — vi9: A C E G B
  { bass: "A2", notes: ["A3", "C4", "E4", "G4", "B4"] },
  // Fmaj9 — IV9: F A C E G
  { bass: "F2", notes: ["F3", "A3", "C4", "E4", "G4"] },
  // Cmaj9 — I9: C E G B D
  { bass: "C3", notes: ["C4", "E4", "G4", "B4", "D5"] },
  // G6sus4 — V suspended: G C D E A
  { bass: "G2", notes: ["G3", "C4", "D4", "E4", "A4"] },
  // ── Second half: wander through iii-vi-ii-V before returning ───────────
  // Em9 — iii9: E G B D F#  (the F# adds a lift / chromatic interest)
  { bass: "E3", notes: ["E3", "G3", "B3", "D4", "F#4"] },
  // Am11 — vi with extension, higher voicing: A E G B D
  { bass: "A2", notes: ["E4", "G4", "B4", "D5", "E5"] },
  // Dm9 — ii9: D F A C E
  { bass: "D3", notes: ["F3", "A3", "C4", "E4", "G4"] },
  // G7sus4 — V7sus, preps the return to vi: G C D F A
  { bass: "G2", notes: ["G3", "C4", "D4", "F4", "A4"] },
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

  // Ambient layers. All route through pianoVolume so a single bus controls
  // the entire musical mix (musicEnabled / musicVolume / fadeOutMusic).
  private pad: Tone.PolySynth | null = null;
  private padFilter: Tone.Filter | null = null;
  // LFOs need a held reference or they may be GC'd and stop modulating.
  private padLfo: Tone.LFO | null = null;
  private padVolume: Tone.Volume | null = null;
  /** Currently-held pad chord; we release these before triggering the next. */
  private padCurrentNotes: string[] = [];
  private noise: Tone.Noise | null = null;
  private noiseFilter: Tone.Filter | null = null;
  private noiseLfo: Tone.LFO | null = null;
  private noiseVolume: Tone.Volume | null = null;
  private bell: Tone.FMSynth | null = null;
  private bellVolume: Tone.Volume | null = null;

  private started = false;
  private musicPlaying = false;
  private chordIdx = 0;
  /** Increments each time the chord progression wraps back to index 0.
   * Phrase shapes use `passIndex % 2` to re-voice on alternate loops. */
  private passIndex = 0;
  private lastCycleNumber = 0;

  private settings: Settings = DEFAULT_SETTINGS;

  /**
   * Build the audio graph. Idempotent. Called from `unlock()` after
   * Tone.start() so all nodes are constructed against a running context.
   *
   *   piano  → pianoVolume → reverb → master → destination
   *   pad    → padFilter   → padVolume   ┐
   *   noise  → noiseFilter → noiseVolume ┼─→ pianoVolume (shared music bus)
   *   bell   →              → bellVolume ┘
   *   chime  → chimeVolume → destination (bypasses music bus + reverb)
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

    // ── Pad layer ──────────────────────────────────────────────────────
    // Warm, slow-attack triangle bed. Filter cutoff sweeps slowly via LFO
    // so the timbre breathes even while the chord is held.
    this.padVolume = new Tone.Volume(-14).connect(this.pianoVolume);
    this.padFilter = new Tone.Filter({
      frequency: 700,
      type: "lowpass",
      Q: 0.8,
    }).connect(this.padVolume);
    this.padLfo = new Tone.LFO({
      frequency: 0.07,
      min: 400,
      max: 1100,
      type: "sine",
    }).connect(this.padFilter.frequency);
    this.padLfo.start();
    this.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fattriangle", count: 3, spread: 18 },
      envelope: { attack: 3, decay: 1.5, sustain: 0.8, release: 5 },
    }).connect(this.padFilter);
    // PolySynth's per-voice volume is a touch hot at default; tame it here.
    this.pad.volume.value = -6;

    // ── Air layer ──────────────────────────────────────────────────────
    // Band-passed pink noise — adds organic "presence" without timbre.
    // Starts silenced; startMusic() fades it in.
    this.noiseVolume = new Tone.Volume(-Infinity).connect(this.pianoVolume);
    this.noiseFilter = new Tone.Filter({
      frequency: 700,
      type: "bandpass",
      Q: 1.5,
    }).connect(this.noiseVolume);
    this.noiseLfo = new Tone.LFO({
      frequency: 0.04,
      min: 400,
      max: 1400,
      type: "sine",
    }).connect(this.noiseFilter.frequency);
    this.noiseLfo.start();
    this.noise = new Tone.Noise("pink").connect(this.noiseFilter);
    this.noise.start();

    // ── Bell layer ─────────────────────────────────────────────────────
    // Sparse FM bell — rings once per full progression pass.
    this.bellVolume = new Tone.Volume(-8).connect(this.pianoVolume);
    this.bell = new Tone.FMSynth({
      harmonicity: 3.5,
      modulationIndex: 14,
      oscillator: { type: "sine" },
      modulation: { type: "sine" },
      envelope: { attack: 0.005, decay: 1.8, sustain: 0, release: 4.5 },
      modulationEnvelope: {
        attack: 0.005,
        decay: 0.6,
        sustain: 0,
        release: 1.5,
      },
    }).connect(this.bellVolume);

    this.chimeVolume = new Tone.Volume(
      s.chimesEnabled ? linearToDb(s.chimeVolume) - 6 : -Infinity,
    ).toDestination();
    this.chime = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0, release: 1.6 },
    }).connect(this.chimeVolume);
  }

  /** Attack the next chord on the pad, releasing the previous one. The pad
   *  envelope's long release overlaps the new attack, producing a natural
   *  crossfade between chords with no audible seam. */
  private triggerPad(chord: ChordEntry): void {
    if (!this.pad) return;
    if (this.padCurrentNotes.length) {
      try {
        this.pad.triggerRelease(this.padCurrentNotes);
      } catch {
        /* PolySynth can throw if a voice was stolen — ignore. */
      }
    }
    // Use the lower 3 chord tones for the pad. Bass + extensions live on
    // the piano; the pad's job is to fill the harmonic middle.
    const notes = chord.notes.slice(0, 3);
    try {
      this.pad.triggerAttack(notes);
    } catch {
      /* noop */
    }
    this.padCurrentNotes = notes;
  }

  /** Ring the bell once. Used to open a session and to mark each time the
   *  8-chord progression completes a full pass. */
  private triggerBell(velocity = 0.4): void {
    if (!this.bell) return;
    try {
      // C6 is the 5th of F major / tonic of C major — consonant against
      // every chord in the progression.
      this.bell.triggerAttackRelease("C6", "2n", undefined, velocity);
    } catch {
      /* noop */
    }
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
    this.passIndex = 0;
    this.lastCycleNumber = 0;
    // Soft intro chord at low velocity — sits under the "Get ready" countdown.
    if (this.piano.loaded) {
      const chord = PROGRESSION[0];
      const t = Tone.now();
      this.piano.triggerAttackRelease(chord.bass, 4, t, 0.35);
      this.piano.triggerAttackRelease(chord.notes.slice(0, 3), 4, t + 0.15, 0.25);
    }
    // Ambient bed: pad attacks the opening chord (slow 3s attack means it
    // swells under the intro), noise fades in over the prelude, and a gentle
    // bell rings as a "we're starting" cue.
    this.triggerPad(PROGRESSION[0]);
    if (this.noiseVolume) this.noiseVolume.volume.rampTo(-30, 2.5);
    this.triggerBell(0.3);
  }

  stopMusic(): void {
    if (!this.musicPlaying) return;
    this.musicPlaying = false;
    this.piano?.releaseAll();
    if (this.pad && this.padCurrentNotes.length) {
      try {
        this.pad.triggerRelease(this.padCurrentNotes);
      } catch {
        /* noop */
      }
    }
    this.padCurrentNotes = [];
    if (this.noiseVolume)
      this.noiseVolume.volume.rampTo(-Infinity, 0.3);
  }

  /**
   * Smoothly fade music to silence over `seconds`, then release the piano
   * voices. Used at session completion so the harmony doesn't cut abruptly.
   * Idempotent — calling during an in-flight fade just resets the target.
   */
  fadeOutMusic(seconds = 1.5): void {
    if (!this.musicPlaying) return;
    const v = this.pianoVolume;
    if (!v) {
      this.stopMusic();
      return;
    }
    this.musicPlaying = false;
    // Ramp piano channel to silence, then release any voices and restore the
    // settings-driven volume so the next session starts at the right level.
    v.volume.cancelScheduledValues(Tone.now());
    v.volume.rampTo(-Infinity, seconds);
    const restoreDb = this.settings.musicEnabled
      ? linearToDb(this.settings.musicVolume)
      : -Infinity;
    window.setTimeout(
      () => {
        this.piano?.releaseAll();
        if (this.pad && this.padCurrentNotes.length) {
          try {
            this.pad.triggerRelease(this.padCurrentNotes);
          } catch {
            /* noop */
          }
          this.padCurrentNotes = [];
        }
        if (this.noiseVolume) this.noiseVolume.volume.value = -Infinity;
        if (this.pianoVolume) this.pianoVolume.volume.value = restoreDb;
      },
      Math.ceil(seconds * 1000) + 50,
    );
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
      let chordChanged = false;
      if (this.lastCycleNumber > 0) {
        this.chordIdx = (this.chordIdx + 1) % PROGRESSION.length;
        chordChanged = true;
        if (this.chordIdx === 0) {
          this.passIndex += 1;
          // The progression just looped — mark the moment with a bell.
          this.triggerBell();
        }
      }
      this.lastCycleNumber = cycleNumber;
      if (chordChanged) this.triggerPad(PROGRESSION[this.chordIdx]);
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

    const altPass = this.passIndex % 2 === 1;

    switch (phaseKind) {
      case "inhale": {
        // Ascending arpeggio over the exact phase duration.
        // Bass anchors the start. On alternate passes, drop a chord tone and
        // top the arpeggio with an octave leap — same chord, sparser shape.
        this.piano.triggerAttackRelease(chord.bass, dur + 2, now, 0.55);
        const notes = altPass
          ? [
              chord.notes[0],
              chord.notes[2],
              chord.notes[chord.notes.length - 1],
              shiftOctave(chord.notes[chord.notes.length - 1], 1),
            ]
          : chord.notes;
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
        // Ringing chord (top 3 notes). A single melodic accent at the
        // midpoint adds variation within an otherwise sustained moment.
        // Alternate passes flip the accent: high on even, low on odd, so
        // back-to-back holds don't feel identical.
        const topThree = chord.notes.slice(-3);
        this.piano.triggerAttackRelease(topThree, dur + 1, now, 0.45);
        const top = chord.notes[chord.notes.length - 1];
        const accent = altPass
          ? shiftOctave(chord.notes[1] ?? top, -1)
          : shiftOctave(top, 1);
        this.piano.triggerAttackRelease(accent, Math.max(0.8, dur / 2), now + dur / 2, 0.35);
        break;
      }

      case "exhale": {
        // Descending arpeggio. Bass on the downbeat.
        // On alternate passes, lead in from one octave above the top note —
        // the descent feels like it falls from higher.
        this.piano.triggerAttackRelease(chord.bass, dur + 2, now, 0.45);
        const reversed = [...chord.notes].reverse();
        const notes = altPass
          ? [shiftOctave(reversed[0], 1), ...reversed]
          : reversed;
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
        // On alternate passes, add a whisper of the top tone late in the
        // hold — a hint of the next inhale.
        this.piano.triggerAttackRelease(chord.bass, dur + 1, now, 0.32);
        this.piano.triggerAttackRelease(
          chord.notes.slice(0, 2),
          dur + 1,
          now + 0.15,
          0.22,
        );
        if (altPass) {
          const top = chord.notes[chord.notes.length - 1];
          this.piano.triggerAttackRelease(
            top,
            0.6,
            now + Math.max(0.1, dur - 0.4),
            0.18,
          );
        }
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
