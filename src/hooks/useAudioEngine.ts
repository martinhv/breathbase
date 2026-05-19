// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect } from "react";
import * as Tone from "tone";
import { useSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/storage";
import { DEFAULT_CHIME_HZ, type PhaseKind } from "@/lib/techniques";
import type { Soundscape } from "@/lib/storage";

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
 *   - A sustained ensemble sits underneath the piano on the same music bus
 *     and re-voices on every chord change, with each instrument owning its
 *     own register so the chord stacks instead of crowding:
 *       * cello    – a single fat-saw bass note on the chord root, deep
 *                    low-pass, very slow attack. Foundation between piano
 *                    bass triggers (no audible gap in the bottom).
 *       * pad      – warm fattriangle PolySynth playing the lower-mid
 *                    chord tones. The "choir" — fills the harmonic middle.
 *       * strings  – fatsawtooth PolySynth through chorus + filter LFO,
 *                    playing the upper chord tones. The brightest layer;
 *                    swells with each chord change like bowed strings.
 *       * air      – very quiet band-passed pink noise; subliminal motion.
 *       * bell     – sparse FM bell on each progression wrap (~1–2 min).
 *       * snare    – brushed snare swell at round boundaries — fires only
 *                    when crossing between active cycles and rest/roundEnd
 *                    phases, so it appears only in rounds-layout techniques
 *                    (energizing breath, bellows breath) where the shift
 *                    between active hyperventilation and recovery is a real
 *                    musical moment to mark.
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

/** Seconds to ramp the music bus from silence to settings level on startMusic.
 *  Long enough to feel like a fade-in rather than a level change. */
const MUSIC_FADE_IN_S = 3.0;

/** Minimum seconds between sustained-voice chord changes (cello / pad /
 *  strings). On fast techniques (bellows: 4 s/cycle, energizing: 3 s/cycle)
 *  a per-cycle chord change rotates voices faster than the ~5 s release
 *  envelopes can decay, stacking voices until PolySynth's polyphony cap is
 *  exceeded and notes are dropped. 8 s keeps slow techniques (coherent,
 *  box, 4-7-8) on their natural per-cycle cadence while consolidating
 *  fast-technique changes to every-2-or-3-cycles. */
const MIN_CHORD_INTERVAL_S = 8;

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
  private strings: Tone.PolySynth | null = null;
  private stringsFilter: Tone.Filter | null = null;
  private stringsLfo: Tone.LFO | null = null;
  private stringsChorus: Tone.Chorus | null = null;
  private stringsVolume: Tone.Volume | null = null;
  private stringsCurrentNotes: string[] = [];
  private cello: Tone.PolySynth | null = null;
  private celloFilter: Tone.Filter | null = null;
  private celloVolume: Tone.Volume | null = null;
  private celloCurrentNote: string | null = null;
  private noise: Tone.Noise | null = null;
  private noiseFilter: Tone.Filter | null = null;
  private noiseLfo: Tone.LFO | null = null;
  private noiseVolume: Tone.Volume | null = null;
  private bell: Tone.FMSynth | null = null;
  private bellVolume: Tone.Volume | null = null;
  // Soundscape alternatives — built once, gated by Volume nodes that stay at
  // -Infinity except for the active soundscape. Lets users pick a non-piano
  // bed (ocean, rain, brown noise, silent) without rebuilding the graph.
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
  private snare: Tone.NoiseSynth | null = null;
  private snareFilter: Tone.Filter | null = null;
  private snareVolume: Tone.Volume | null = null;
  /** Tracks whether the previous phase was a cycle (vs. rest/roundEnd).
   * Null until the first phase fires. Used to detect round boundaries. */
  private lastWasCycle: boolean | null = null;

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
  /** The lite-mode flag captured at the last buildGraph(). When the resolved
   * preference changes (e.g. user flips the setting), unlock() disposes the
   * graph so buildGraph() can re-run with the new layer set. */
  private currentLiteMode = false;

  private settings: Settings = DEFAULT_SETTINGS;

  /** Resolve the user's liteMusicMode preference into an effective boolean.
   * "auto" enables lite mode on devices that are likely to underrun the full
   * ensemble: phones/tablets (coarse pointer), low-core machines, or devices
   * reporting modest RAM. Each signal alone is noisy, so any one positive
   * trips the heuristic — better to ship lite by default than to glitch. */
  private resolveLite(): boolean {
    const pref = this.settings.liteMusicMode ?? "auto";
    if (pref === "on") return true;
    if (pref === "off") return false;
    if (typeof window === "undefined") return false;
    try {
      if (window.matchMedia("(pointer: coarse)").matches) return true;
      const cores = navigator.hardwareConcurrency;
      if (typeof cores === "number" && cores > 0 && cores < 4) return true;
      const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
      if (typeof mem === "number" && mem > 0 && mem < 4) return true;
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Build the audio graph. Idempotent. Called from `unlock()` after
   * Tone.start() so all nodes are constructed against a running context.
   *
   *   piano   → pianoVolume → reverb → master → destination
   *   cello   → celloFilter   → celloVolume   ┐
   *   pad     → padFilter     → padVolume     │
   *   strings → chorus → sFilter → sVolume    ├─→ pianoVolume (music bus)
   *   noise   → noiseFilter   → noiseVolume   │
   *   bell    →                → bellVolume   ┘
   *   chime   → chimeVolume → destination (bypasses music bus + reverb)
   */
  private buildGraph(): void {
    if (this.piano) return;
    const s = this.settings;
    const lite = this.resolveLite();
    this.currentLiteMode = lite;
    // eslint-disable-next-line no-console
    console.info("[audio] buildGraph lite=%s", lite);
    this.master = new Tone.Volume(linearToDb(s.masterVolume)).toDestination();
    // Lite mode: shorter reverb tail (less convolution work per render quantum).
    this.reverb = new Tone.Reverb({
      decay: lite ? 2.5 : 6,
      wet: lite ? 0.2 : 0.35,
    }).connect(this.master);
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

    // ── Cello-bass layer ───────────────────────────────────────────────
    // A single fat-saw note on the chord root, deeply low-passed. Sustains
    // between piano bass triggers so the bottom never drops out.
    this.celloVolume = new Tone.Volume(-16).connect(this.pianoVolume);
    this.celloFilter = new Tone.Filter({
      frequency: 450,
      type: "lowpass",
      Q: 1,
    }).connect(this.celloVolume);
    this.cello = new Tone.PolySynth(Tone.Synth, {
      // Lite: plain saw (1 osc) instead of 2-osc fatsaw.
      oscillator: lite
        ? { type: "sawtooth" }
        : { type: "fatsawtooth", count: 2, spread: 12 },
      // Shorter release in lite so the held voice frees up before the next
      // chord change, preventing release-tail stacking on fast techniques.
      envelope: {
        attack: lite ? 1.5 : 3,
        decay: 1.2,
        sustain: 0.75,
        release: lite ? 2.5 : 6,
      },
    }).connect(this.celloFilter);
    // Cap voice allocation tight, but leave headroom for the previous voice
    // to finish its release envelope while the new one attacks. With cap=1
    // the prior voice can't free up in time on bellows-rate chord changes.
    this.cello.maxPolyphony = lite ? 2 : 4;
    this.cello.volume.value = -4;

    // ── Pad layer (choir-like, mid register) ───────────────────────────
    // Warm, slow-attack triangle bed playing the lower-mid chord tones.
    // Filter cutoff sweeps slowly via LFO so the timbre breathes.
    this.padVolume = new Tone.Volume(-14).connect(this.pianoVolume);
    this.padFilter = new Tone.Filter({
      frequency: 700,
      type: "lowpass",
      Q: 0.8,
    }).connect(this.padVolume);
    // Skip the LFO in lite mode — modulating a Filter's frequency from an LFO
    // at audio rate is cheap, but it's one more graph node we don't need.
    if (!lite) {
      this.padLfo = new Tone.LFO({
        frequency: 0.07,
        min: 400,
        max: 1100,
        type: "sine",
      }).connect(this.padFilter.frequency);
      this.padLfo.start();
    }
    this.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: lite
        ? { type: "triangle" }
        : { type: "fattriangle", count: 3, spread: 18 },
      // Shorter release in lite so the prior 2 voices can decay before the
      // next chord arrives — pad with cap=2 + a 5 s tail would stack notes
      // on bellows-rate chord rotation. The 8 s chord throttle (see
      // playPhrase) is the primary defence; this is belt-and-braces.
      envelope: {
        attack: lite ? 2 : 3,
        decay: 1.5,
        sustain: 0.8,
        release: lite ? 2.5 : 5,
      },
    }).connect(this.padFilter);
    // Pad holds 2 chord tones; cap=4 gives one chord's worth of headroom for
    // the prior voices to finish their release envelope. In lite mode the
    // envelope is short enough that cap=2 wasn't quite tight — bump to 3.
    this.pad.maxPolyphony = lite ? 3 : 4;
    // PolySynth's per-voice volume is a touch hot at default; tame it here.
    this.pad.volume.value = -6;

    // ── Strings layer (upper register) ─────────────────────────────────
    // Fat-saw PolySynth through chorus + filter LFO — gives an ensemble
    // bowed-string character. Plays the top of the chord and swells with
    // each chord change, the most audible "instrumentation" addition.
    // Skipped entirely in lite mode (chorus + 3-osc fatsaw × 3 voices is
    // the single most expensive part of the graph on mobile).
    if (!lite) {
      this.stringsVolume = new Tone.Volume(-20).connect(this.pianoVolume);
      this.stringsChorus = new Tone.Chorus({
        frequency: 0.6,
        delayTime: 4,
        depth: 0.5,
        spread: 180,
        wet: 0.4,
      })
        .connect(this.stringsVolume)
        .start();
      this.stringsFilter = new Tone.Filter({
        frequency: 1400,
        type: "lowpass",
        Q: 0.7,
      }).connect(this.stringsChorus);
      this.stringsLfo = new Tone.LFO({
        frequency: 0.05,
        min: 900,
        max: 2000,
        type: "sine",
      }).connect(this.stringsFilter.frequency);
      this.stringsLfo.start();
      this.strings = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", count: 3, spread: 28 },
        envelope: { attack: 1.5, decay: 0.8, sustain: 0.75, release: 4 },
      }).connect(this.stringsFilter);
      this.strings.volume.value = -8;
    }

    // ── Air layer ──────────────────────────────────────────────────────
    // Band-passed pink noise — adds organic "presence" without timbre.
    // Starts silenced; startMusic() fades it in. Skipped in lite mode.
    if (!lite) {
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
    }

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

  /** Attack the next chord across all sustained voices (cello / pad /
   *  strings), releasing the previous one. Long envelope releases overlap
   *  the new attacks, producing a natural crossfade between chords with no
   *  audible seam. Voicing is split across registers:
   *    cello   = chord bass (single low note)
   *    pad     = chord.notes[0..1]   (lower-mid)
   *    strings = chord.notes[2..4]   (upper-mid + high)
   */
  private triggerHarmony(chord: ChordEntry): void {
    // Release everything we're currently holding first.
    if (this.pad && this.padCurrentNotes.length) {
      try {
        this.pad.triggerRelease(this.padCurrentNotes);
      } catch {
        /* PolySynth can throw if a voice was stolen — ignore. */
      }
    }
    if (this.strings && this.stringsCurrentNotes.length) {
      try {
        this.strings.triggerRelease(this.stringsCurrentNotes);
      } catch {
        /* noop */
      }
    }
    if (this.cello && this.celloCurrentNote) {
      try {
        this.cello.triggerRelease([this.celloCurrentNote]);
      } catch {
        /* noop */
      }
    }

    // Attack the new voicings. Each layer owns a distinct register.
    const padNotes = chord.notes.slice(0, 2);
    const stringsNotes = chord.notes.slice(2, 5);
    const celloNote = chord.bass;
    if (this.pad) {
      try {
        this.pad.triggerAttack(padNotes);
      } catch {
        /* noop */
      }
    }
    if (this.strings) {
      try {
        this.strings.triggerAttack(stringsNotes);
      } catch {
        /* noop */
      }
    }
    if (this.cello) {
      try {
        this.cello.triggerAttack([celloNote]);
      } catch {
        /* noop */
      }
    }
    this.padCurrentNotes = padNotes;
    this.stringsCurrentNotes = stringsNotes;
    this.celloCurrentNote = celloNote;
  }

  /** Release every currently-held sustained voice. */
  private releaseHarmony(): void {
    if (this.pad && this.padCurrentNotes.length) {
      try {
        this.pad.triggerRelease(this.padCurrentNotes);
      } catch {
        /* noop */
      }
    }
    if (this.strings && this.stringsCurrentNotes.length) {
      try {
        this.strings.triggerRelease(this.stringsCurrentNotes);
      } catch {
        /* noop */
      }
    }
    if (this.cello && this.celloCurrentNote) {
      try {
        this.cello.triggerRelease([this.celloCurrentNote]);
      } catch {
        /* noop */
      }
    }
    this.padCurrentNotes = [];
    this.stringsCurrentNotes = [];
    this.celloCurrentNote = null;
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

  /** Tear down the whole audio graph. Used when the resolved lite-mode flag
   * changes between sessions — buildGraph() will reconstruct with the new
   * layer set on the next unlock(). Safe to call multiple times. */
  private disposeGraph(): void {
    const nodes: (Tone.ToneAudioNode | null)[] = [
      this.piano, this.pianoVolume, this.reverb,
      this.chime, this.chimeVolume, this.master,
      this.pad, this.padFilter, this.padLfo, this.padVolume,
      this.strings, this.stringsFilter, this.stringsLfo,
      this.stringsChorus, this.stringsVolume,
      this.cello, this.celloFilter, this.celloVolume,
      this.noise, this.noiseFilter, this.noiseLfo, this.noiseVolume,
      this.bell, this.bellVolume,
      this.oceanNoise, this.oceanFilter, this.oceanTremolo,
      this.oceanFilterLfo, this.oceanVolume,
      this.rainNoise, this.rainFilter, this.rainVolume,
      this.brown, this.brownVolume,
      this.snare, this.snareFilter, this.snareVolume,
    ];
    for (const n of nodes) {
      try { n?.dispose(); } catch { /* noop */ }
    }
    this.piano = null;
    this.pianoVolume = null; this.reverb = null;
    this.chime = null; this.chimeVolume = null; this.master = null;
    this.pad = null; this.padFilter = null; this.padLfo = null; this.padVolume = null;
    this.strings = null; this.stringsFilter = null; this.stringsLfo = null;
    this.stringsChorus = null; this.stringsVolume = null;
    this.cello = null; this.celloFilter = null; this.celloVolume = null;
    this.noise = null; this.noiseFilter = null; this.noiseLfo = null; this.noiseVolume = null;
    this.bell = null; this.bellVolume = null;
    this.oceanNoise = null; this.oceanFilter = null; this.oceanTremolo = null;
    this.oceanFilterLfo = null; this.oceanVolume = null;
    this.rainNoise = null; this.rainFilter = null; this.rainVolume = null;
    this.brown = null; this.brownVolume = null;
    this.snare = null; this.snareFilter = null; this.snareVolume = null;
    this.padCurrentNotes = [];
    this.stringsCurrentNotes = [];
    this.celloCurrentNote = null;
  }

  async unlock(): Promise<void> {
    try {
      await Tone.start();
    } catch {
      /* AudioContext may already be running. */
    }
    // If the user flipped the lite-mode setting since the last build, throw
    // out the old graph so buildGraph() can reconstruct with the new layers.
    // We only do this when music isn't actively playing to avoid mid-session
    // audio drops.
    if (this.piano && !this.musicPlaying && this.resolveLite() !== this.currentLiteMode) {
      this.disposeGraph();
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
   *  piano (the full ensemble) or one of the noise-based beds. */
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
        this.settings.musicEnabled ? linearToDb(this.settings.musicVolume) : -Infinity,
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
      // Ambient ensemble: cello / pad / strings all attack the opening chord
      // (slow attacks mean they swell under the intro), noise fades in over
      // the prelude, and a gentle bell rings as a "we're starting" cue.
      this.triggerHarmony(PROGRESSION[0]);
      if (this.noiseVolume) this.noiseVolume.volume.rampTo(-30, 2.5);
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
    if (this.noiseVolume) this.noiseVolume.volume.rampTo(-Infinity, 0.3);
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
        if (this.noiseVolume) this.noiseVolume.volume.value = -Infinity;
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
    // keeps the sustained voices from rotating faster than their release
    // envelopes can decay — the source of the "Max polyphony exceeded" warnings.
    // cycleNumber 0 means a non-cycle phase (rest, roundEnd) — those keep
    // the current chord regardless.
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
        this.triggerHarmony(PROGRESSION[this.chordIdx]);
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