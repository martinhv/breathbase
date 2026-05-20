// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect } from "react";
import * as Tone from "tone";
import { useSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/storage";
import { DEFAULT_CHIME_HZ, type PhaseKind } from "@/lib/techniques";
import type { Soundscape } from "@/lib/storage";

// Switch the AudioContext to a larger render buffer on mobile devices BEFORE
// any Tone.js node is constructed. Tone.js will lazily create its context on
// first use (e.g. when `Tone.start()` runs); once that happens the latencyHint
// is frozen. So this guard runs at module load and must complete before
// AudioEngineImpl methods touch Tone.
//
// "interactive" (Tone.js default): ~10 ms buffer. Snappy chime/voice cueing
// on desktop but every CPU spike risks an underrun = audible stutter.
// "playback":                      ~256 ms buffer. Adds latency to chimes
// and music-start but absorbs spikes without dropouts — the right trade for
// breathwork on a throttled mid-tier phone. Voice prompts via HTMLAudioElement
// aren't affected (they don't route through Tone's context).
//
// Gated on `pointer: coarse`, which matches touch-primary devices (phones +
// tablets) without false-positiving on desktops connected to touchscreens —
// those still report a fine pointer for the mouse.
if (typeof window !== "undefined") {
  try {
    if (window.matchMedia("(pointer: coarse)").matches) {
      Tone.setContext(new Tone.Context({ latencyHint: "playback" }));
      // eslint-disable-next-line no-console
      console.info("[audio] latencyHint=playback (mobile)");
    }
  } catch {
    /* matchMedia or Tone.Context unavailable — fall back to defaults. */
  }
}

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
 *   - Underneath the piano sits a pre-rendered ambient pad — eight chord
 *     clips at `public/sounds/pad-chord-{0..7}.mp3`, one per progression
 *     voicing. Each clip is a 24 s recording of the original cello + pad +
 *     strings + air-noise ensemble (baked offline, see
 *     `scripts/render-pad-clips.html`). The runtime engine plays one clip
 *     at a time via `Tone.Player`; when the harmony advances it stops the
 *     previous player (with a built-in fadeOut) and starts the next from
 *     the beginning, so the new chord's baked attack swells in while the
 *     previous chord's tail dies out — a natural crossfade.
 *   - This swap was made deliberately to remove the per-device variability
 *     of the synthesized ensemble: the same sample-playback CPU cost on a
 *     phone as on a desktop, with no lite-mode heuristic to maintain.
 *   - A separate sine Synth still handles per-transition chimes; brushed
 *     snare swells still mark round boundaries; a sparse FM bell still
 *     rings at the opening and at each full progression wrap.
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

/** Seconds to ramp the music bus from silence to settings level on startMusic.
 *  Long enough to feel like a fade-in rather than a level change. */
const MUSIC_FADE_IN_S = 3.0;

/** Minimum seconds between sustained-voice chord changes. On fast techniques
 *  (bellows: 4 s/cycle, energizing: 3 s/cycle) a per-cycle chord change rotates
 *  voices faster than each clip's baked attack can establish itself. 8 s keeps
 *  slow techniques (coherent, box, 4-7-8) on their natural per-cycle cadence
 *  while consolidating fast-technique changes to every-2-or-3-cycles. */
const MIN_CHORD_INTERVAL_S = 8;

/** Shift a pitch string up by N octaves. Returns input if unparseable. */
function shiftOctave(note: string, by: number): string {
  const m = note.match(/^([A-G]#?b?)(-?\d+)$/);
  if (!m) return note;
  return `${m[1]}${Number(m[2]) + by}`;
}

class AudioEngineImpl {
  // ── Core graph: piano + reverb + master ─────────────────────────────
  private piano: Tone.Sampler | null = null;
  private pianoVolume: Tone.Volume | null = null;
  private reverb: Tone.Reverb | null = null;
  private chime: Tone.Synth | null = null;
  private chimeVolume: Tone.Volume | null = null;
  private master: Tone.Volume | null = null;

  // ── Pre-rendered pad clips, one per chord ───────────────────────────
  // Built once in buildGraph(); the active chord's player is started on
  // each triggerHarmony() and stopped (with built-in fadeOut) when the
  // harmony advances. Loaded lazily over HTTP via Tone.Player's url option.
  private padPlayers: Tone.Player[] = [];
  /** Index of the pad player currently playing. -1 = silent. */
  private currentPadIdx = -1;

  // ── Event-driven layers: bell + snare ──────────────────────────────
  private bell: Tone.FMSynth | null = null;
  private bellVolume: Tone.Volume | null = null;
  private snare: Tone.NoiseSynth | null = null;
  private snareFilter: Tone.Filter | null = null;
  private snareVolume: Tone.Volume | null = null;
  /** Tracks whether the previous phase was a cycle (vs. rest/roundEnd).
   * Null until the first phase fires. Used to detect round boundaries. */
  private lastWasCycle: boolean | null = null;

  // ── Alternative soundscapes (ocean / rain / brown) ─────────────────
  // Built once, gated by Volume nodes that stay at -Infinity except for
  // the active soundscape. Lets users pick a non-piano bed without
  // rebuilding the graph.
  private oceanNoise: Tone.Noise | null = null;
  private oceanFilter: Tone.Filter | null = null;
  private oceanTremolo: Tone.Tremolo | null = null;
  private oceanFilterLfo: Tone.LFO | null = null;
  private oceanVolume: Tone.Volume | null = null;
  private rainNoise: Tone.Noise | null = null;
  private rainFilter: Tone.Filter | null = null;
  private rainVolume: Tone.Volume | null = null;
  private brown: Tone.Noise | null = null;
  private brownVolume: Tone.Volume | null = null;

  private started = false;
  private musicPlaying = false;
  private chordIdx = 0;
  /** Increments each time the chord progression wraps back to index 0.
   * Phrase shapes use `passIndex % 2` to re-voice on alternate loops. */
  private passIndex = 0;
  private lastCycleNumber = 0;
  /** Tone.now() of the most recent triggerHarmony(). Used to throttle
   *  chord rotation to MIN_CHORD_INTERVAL_S — see playPhrase(). */
  private lastHarmonyAt = 0;

  private settings: Settings = DEFAULT_SETTINGS;

  /**
   * Build the audio graph. Idempotent. Called from `unlock()` after
   * Tone.start() so all nodes are constructed against a running context.
   *
   *   piano       → pianoVolume → reverb → master → destination
   *   padPlayer×8 → pianoVolume (music bus, only one active at a time)
   *   chime       → chimeVolume → destination (bypasses music bus + reverb)
   *   bell        → bellVolume  → pianoVolume
   *   snare       → snareFilter → snareVolume → pianoVolume
   *   ocean/rain/brown → their own Volume → pianoVolume (gated by user pick)
   */
  private buildGraph(): void {
    if (this.piano) return;
    const s = this.settings;
    // eslint-disable-next-line no-console
    console.info("[audio] buildGraph");
    this.master = new Tone.Volume(linearToDb(s.masterVolume)).toDestination();
    this.reverb = new Tone.Reverb({ decay: 6, wet: 0.35 }).connect(this.master);
    // Start the music bus silent — startMusic() will ramp it up so the
    // ensemble fades in instead of slamming on at full volume. (When music
    // is disabled in settings we just leave the bus at -Infinity.)
    this.pianoVolume = new Tone.Volume(-Infinity).connect(this.reverb);

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

    // ── Pre-rendered pad clips ─────────────────────────────────────────
    // One Tone.Player per chord in PROGRESSION. Each clip carries its own
    // baked attack + sustain + release; we never loop them. When the
    // harmony advances, stop() applies a 1.5 s fadeOut on the previous
    // player while the new one starts from t=0, crossfading naturally.
    // Players load lazily; until the buffer arrives, start() is a no-op
    // (we check `.loaded` before triggering).
    this.padPlayers = PROGRESSION.map(
      (_, i) =>
        new Tone.Player({
          url: `/sounds/pad-chord-${i}.mp3`,
          loop: false,
          // The clip's first ~3 s already ramps in; a tiny fadeIn just
          // smooths the initial sample step.
          fadeIn: 0.05,
          // Crossfade length when stop() is called mid-playback.
          fadeOut: 1.5,
          onload: () => {
            // eslint-disable-next-line no-console
            console.info(`[audio] pad-chord-${i} loaded`);
          },
          onerror: (e) => {
            // eslint-disable-next-line no-console
            console.warn(`[audio] pad-chord-${i} failed to load`, e);
          },
        }).connect(this.pianoVolume!),
    );

    // ── Snare layer ────────────────────────────────────────────────────
    // Brushed-snare swell. Pink noise through a band-pass for the "brush"
    // character, with a slow attack + decay envelope so it crescendos and
    // settles rather than cracking. Fires only at round boundaries.
    this.snareVolume = new Tone.Volume(-18).connect(this.pianoVolume);
    this.snareFilter = new Tone.Filter({
      frequency: 3500,
      type: "bandpass",
      Q: 1.2,
    }).connect(this.snareVolume);
    this.snare = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.6, decay: 1.4, sustain: 0, release: 0.5 },
    }).connect(this.snareFilter);

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

    // ── Soundscape: Ocean ──────────────────────────────────────────────
    // Pink noise through a low-pass + slow tremolo + LFO-swept filter to
    // produce wave-like swells. Tremolo period ~8 s; filter sweeps ~12 s.
    this.oceanVolume = new Tone.Volume(-Infinity).connect(this.pianoVolume);
    this.oceanTremolo = new Tone.Tremolo({
      frequency: 0.12,
      depth: 0.55,
      type: "sine",
    })
      .connect(this.oceanVolume)
      .start();
    this.oceanFilter = new Tone.Filter({
      frequency: 600,
      type: "lowpass",
      Q: 1.2,
    }).connect(this.oceanTremolo);
    this.oceanFilterLfo = new Tone.LFO({
      frequency: 0.08,
      min: 300,
      max: 900,
      type: "sine",
    }).connect(this.oceanFilter.frequency);
    this.oceanFilterLfo.start();
    this.oceanNoise = new Tone.Noise("pink").connect(this.oceanFilter);
    this.oceanNoise.start();

    // ── Soundscape: Rain ───────────────────────────────────────────────
    // White noise highpassed to bring up the hiss of rainfall. Steady level
    // (no tremolo) — rain has its own micro-texture from white noise itself.
    this.rainVolume = new Tone.Volume(-Infinity).connect(this.pianoVolume);
    this.rainFilter = new Tone.Filter({
      frequency: 1800,
      type: "highpass",
      Q: 0.8,
    }).connect(this.rainVolume);
    this.rainNoise = new Tone.Noise("white").connect(this.rainFilter);
    this.rainNoise.start();

    // ── Soundscape: Brown noise ────────────────────────────────────────
    // The deepest, most enveloping of the noises — pure brown, no shaping.
    this.brownVolume = new Tone.Volume(-Infinity).connect(this.pianoVolume);
    this.brown = new Tone.Noise("brown").connect(this.brownVolume);
    this.brown.start();
  }

  /** Start the pad player for `chordIdx`, fading out the previously-active
   *  one. The new clip's baked attack provides the swell-in; the previous
   *  clip's fadeOut (set on its Tone.Player) handles the crossfade tail.
   *  No-op if the clip's audio buffer hasn't loaded yet. */
  private triggerHarmony(chordIdx: number): void {
    if (
      this.currentPadIdx >= 0 &&
      this.currentPadIdx !== chordIdx &&
      this.padPlayers[this.currentPadIdx]
    ) {
      try {
        this.padPlayers[this.currentPadIdx]?.stop();
      } catch {
        /* noop — Player may already be stopped */
      }
    }
    const next = this.padPlayers[chordIdx];
    if (!next) return;
    this.currentPadIdx = chordIdx;
    if (!next.loaded) return; // first-load race — pad bed skipped this chord
    try {
      // If somehow the same chord re-fires, restart cleanly.
      if (next.state === "started") next.stop();
      next.start();
    } catch {
      /* noop */
    }
  }

  /** Fade out the currently-playing pad clip. */
  private releaseHarmony(): void {
    if (this.currentPadIdx >= 0 && this.padPlayers[this.currentPadIdx]) {
      try {
        this.padPlayers[this.currentPadIdx]?.stop();
      } catch {
        /* noop */
      }
    }
    this.currentPadIdx = -1;
  }

  /** Brushed snare swell. Used to mark round transitions in cyclic
   *  techniques (active → rest, rest → active). The slow-attack envelope
   *  means it crescendos into the new section rather than punching. */
  private triggerSnare(): void {
    if (!this.snare) return;
    try {
      // 2n = a half-note's worth of envelope. With attack 0.6 + decay 1.4
      // the audible swell runs ~1.5–2 s — long enough to feel like a brush
      // roll, short enough not to bleed into the next phrase.
      this.snare.triggerAttackRelease("2n");
    } catch {
      /* noop */
    }
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
    // Only re-target the music bus when music is actively playing — when idle
    // the bus is held at -Infinity so the next session can fade in. Otherwise
    // a volume-slider tweak between sessions would expose the bus and break
    // the fade-in on the next startMusic().
    if (this.pianoVolume && this.musicPlaying)
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

  private currentSoundscape(): Soundscape {
    return this.settings.soundscape ?? "piano";
  }

  /** Begin a musical session. The active soundscape decides what plays:
   *  piano (sampler + pre-rendered pad clips) or one of the noise-based beds. */
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
    console.info("[audio] startMusic", this.currentSoundscape());
    this.musicPlaying = true;
    this.chordIdx = 0;
    this.passIndex = 0;
    this.lastCycleNumber = 0;
    this.lastWasCycle = null;
    // Stamp the throttle clock at session start; the opening triggerHarmony
    // below counts as the first chord change, so any per-cycle advance from
    // playPhrase will be gated by MIN_CHORD_INTERVAL_S from this moment.
    this.lastHarmonyAt = Tone.now();

    // Fade the music bus up from silence so the opening doesn't slam on.
    // The bus level itself is the user's `musicVolume`; per-source attacks
    // happen on top of that, so they all rise together over the fade window.
    if (this.pianoVolume) {
      this.pianoVolume.volume.cancelScheduledValues(Tone.now());
      this.pianoVolume.volume.rampTo(
        this.settings.musicEnabled
          ? linearToDb(this.settings.musicVolume)
          : -Infinity,
        MUSIC_FADE_IN_S,
      );
    }

    const scape = this.currentSoundscape();
    if (scape === "piano") {
      // Soft intro chord at low velocity — sits under the "Get ready" countdown.
      if (this.piano.loaded) {
        const chord = PROGRESSION[0];
        const t = Tone.now();
        this.piano.triggerAttackRelease(chord.bass, 4, t, 0.35);
        this.piano.triggerAttackRelease(chord.notes.slice(0, 3), 4, t + 0.15, 0.25);
      }
      // Kick off the pre-rendered pad bed for the opening chord; its baked
      // 3 s attack swells in under the intro. A gentle bell rings as a
      // "we're starting" cue.
      this.triggerHarmony(0);
      this.triggerBell(0.3);
    } else if (scape === "ocean") {
      // Ramp the ocean bed in over the prelude.
      if (this.oceanVolume) this.oceanVolume.volume.rampTo(-12, 2.5);
    } else if (scape === "rain") {
      if (this.rainVolume) this.rainVolume.volume.rampTo(-22, 2.5);
    } else if (scape === "brown") {
      if (this.brownVolume) this.brownVolume.volume.rampTo(-18, 2.5);
    }
    // "silent" → musicPlaying is true so stopMusic/cleanup paths still run,
    // but nothing audible plays from the music bus. Chimes and voice still
    // fire normally on phase changes.
  }

  stopMusic(): void {
    if (!this.musicPlaying) return;
    this.musicPlaying = false;
    this.piano?.releaseAll();
    this.releaseHarmony();
    // Mute any soundscape that might be playing.
    if (this.oceanVolume) this.oceanVolume.volume.rampTo(-Infinity, 0.3);
    if (this.rainVolume) this.rainVolume.volume.rampTo(-Infinity, 0.3);
    if (this.brownVolume) this.brownVolume.volume.rampTo(-Infinity, 0.3);
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
    // Ramp the music bus to silence, then release voices. The bus stays at
    // -Infinity afterwards so the next startMusic() can fade in from silence
    // again rather than slamming on at the user's chosen level.
    v.volume.cancelScheduledValues(Tone.now());
    v.volume.rampTo(-Infinity, seconds);
    window.setTimeout(
      () => {
        this.piano?.releaseAll();
        this.releaseHarmony();
        if (this.oceanVolume) this.oceanVolume.volume.value = -Infinity;
        if (this.rainVolume) this.rainVolume.volume.value = -Infinity;
        if (this.brownVolume) this.brownVolume.volume.value = -Infinity;
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
    if (!this.settings.musicEnabled) return;
    // Non-piano soundscapes don't play chord-driven phrases. The bed runs
    // continuously; chimes still fire from playChime() independently.
    if (this.currentSoundscape() !== "piano") return;
    if (!this.piano || !this.piano.loaded) return;

    // Round-boundary detection: a brushed snare swell marks the transition
    // when we cross between active cycling (cycleNumber > 0) and a rest /
    // roundEnd phase (cycleNumber === 0). Skipped on the very first phase
    // of a session (lastWasCycle === null) so we don't double up with the
    // opening bell.
    const isCycle = cycleNumber > 0;
    if (this.lastWasCycle !== null && this.lastWasCycle !== isCycle) {
      this.triggerSnare();
    }
    this.lastWasCycle = isCycle;

    // Advance the chord when we cross a cycle boundary, but at most once per
    // MIN_CHORD_INTERVAL_S seconds. On slow techniques (coherent ~11 s/cycle,
    // box ~16 s, 4-7-8 ~19 s) every cycle still advances. On fast techniques
    // (bellows 4 s, energizing 3 s) we coalesce 2-3 cycles per chord, which
    // keeps the pad clips from being interrupted faster than their baked
    // attack can establish itself. cycleNumber 0 (rest, roundEnd) keeps the
    // current chord regardless.
    if (cycleNumber > 0 && cycleNumber !== this.lastCycleNumber) {
      let chordChanged = false;
      const nowSec = Tone.now();
      if (
        this.lastCycleNumber > 0 &&
        nowSec - this.lastHarmonyAt >= MIN_CHORD_INTERVAL_S
      ) {
        this.chordIdx = (this.chordIdx + 1) % PROGRESSION.length;
        chordChanged = true;
        if (this.chordIdx === 0) {
          this.passIndex += 1;
          // The progression just looped — mark the moment with a bell.
          this.triggerBell();
        }
      }
      this.lastCycleNumber = cycleNumber;
      if (chordChanged) {
        this.triggerHarmony(this.chordIdx);
        this.lastHarmonyAt = nowSec;
      }
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
   * Fire the closing bell — same FM bell used at progression-wrap moments,
   * but at a slightly higher velocity to mark the end of the session. Routes
   * through the music bus, so callers should trigger this BEFORE the music
   * fade so the bell rings out as the bed dies down. No-op when music is
   * disabled or the graph isn't built.
   */
  playClosingBell(): void {
    if (!this.settings.musicEnabled) return;
    this.triggerBell(0.55);
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
