// Single source of truth for all breathwork techniques.
//
// Every technique is a declarative object describing:
//   - one canonical `cycle` of breath phases, plus
//   - a `layout` describing how that cycle assembles into a session.
//
// The session state machine (`useBreathSession`) calls `expandSession(t, mins)`
// to flatten this into a linear list of phases, then walks the list in order.
// To add a new technique, push a new entry into TECHNIQUES below — no other
// code changes required.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Category = "downregulate" | "upregulate" | "balance" | "focus";

export type PhaseKind = "inhale" | "exhale" | "hold_in" | "hold_out";

/** Default chime frequency (Hz) per phase kind: brighter for inhale, lower for exhale. */
export const DEFAULT_CHIME_HZ: Record<PhaseKind, number> = {
  inhale: 440,
  hold_in: 330,
  exhale: 220,
  hold_out: 330,
};

export type BreathPhase = {
  kind: PhaseKind;
  durationMs: number;
  /** Large on-screen label, e.g. "Breathe in", "Hold", "Breathe out". */
  label: string;
  /** Optional SpeechSynthesis prompt (falls back to label if absent). */
  voicePrompt?: string;
  /** Optional override for chime frequency (else DEFAULT_CHIME_HZ[kind]). */
  chimeFreqHz?: number;
  /** Per-phase metadata for techniques that need more than the basics. */
  meta?: {
    nostril?: "left" | "right" | "both";
    mouth?: boolean;
    pursed?: boolean;
    note?: string;
  };
};

/** How a technique's `cycle` is repeated to form a full session. */
export type Layout =
  // Repeat `cycle` until the chosen duration elapses (always finishes the
  // current cycle — never cuts mid-phase).
  | { kind: "fillDuration" }
  // Repeat `cycle` exactly N times. Duration setting is ignored.
  | { kind: "fixedCycles"; cycles: number }
  // Round-based. Each round = `cyclesPerRound` repetitions of `cycle`,
  // optionally followed by `roundEnd` phases (e.g. retention hold).
  // Between rounds, `rest` phases play (skipped after the final round).
  | {
      kind: "rounds";
      rounds: number;
      cyclesPerRound: number;
      roundEnd?: BreathPhase[];
      rest?: BreathPhase[];
    };

export type CategoryMeta = {
  id: Category;
  title: string;
  emoji: string;
  tagline: string;
  description: string;
};

export const CATEGORIES: Record<Category, CategoryMeta> = {
  downregulate: {
    id: "downregulate",
    title: "Downregulate",
    emoji: "🌙",
    tagline: "Calm the nervous system",
    description:
      "Longer exhales than inhales activate the parasympathetic branch of the autonomic nervous system, lowering arousal.",
  },
  upregulate: {
    id: "upregulate",
    title: "Upregulate",
    emoji: "☀️",
    tagline: "Energize and alert",
    description:
      "More vigorous inhales than exhales recruit sympathetic tone, increasing alertness and energy.",
  },
  balance: {
    id: "balance",
    title: "Balance",
    emoji: "⚖️",
    tagline: "Restore equilibrium",
    description:
      "Equal inhale–exhale ratios stabilize autonomic tone and maximize heart rate variability.",
  },
  focus: {
    id: "focus",
    title: "Focus",
    emoji: "🎯",
    tagline: "Sharpen attention",
    description:
      "Rhythmic, attention-anchoring patterns improve sustained concentration.",
  },
};

export const CATEGORY_ORDER: Category[] = [
  "downregulate",
  "upregulate",
  "balance",
  "focus",
];

export type Technique = {
  id: string;
  name: string;
  category: Category;
  shortDescription: string;
  scientificRationale: string;
  citation: string;
  /** Default session duration in minutes (user-adjustable in settings). */
  defaultDurationMin: number;
  /** Allowed duration range [min, max] in minutes. */
  durationRangeMin: [number, number];
  /** One repetition of the breath pattern. */
  cycle: BreathPhase[];
  layout: Layout;
  /** Optional safety notes shown before the session begins. */
  safetyNotes?: string[];
};

// ---------------------------------------------------------------------------
// Phase helpers — keep technique definitions concise and readable.
// ---------------------------------------------------------------------------

type PhaseOpts = Partial<Omit<BreathPhase, "kind" | "durationMs">>;

const inhale = (seconds: number, opts: PhaseOpts = {}): BreathPhase => ({
  kind: "inhale",
  durationMs: Math.round(seconds * 1000),
  label: "Breathe in",
  voicePrompt: "Breathe in",
  ...opts,
});

const exhale = (seconds: number, opts: PhaseOpts = {}): BreathPhase => ({
  kind: "exhale",
  durationMs: Math.round(seconds * 1000),
  label: "Breathe out",
  voicePrompt: "Breathe out",
  ...opts,
});

const holdIn = (seconds: number, opts: PhaseOpts = {}): BreathPhase => ({
  kind: "hold_in",
  durationMs: Math.round(seconds * 1000),
  label: "Hold",
  voicePrompt: "Hold",
  ...opts,
});

const holdOut = (seconds: number, opts: PhaseOpts = {}): BreathPhase => ({
  kind: "hold_out",
  durationMs: Math.round(seconds * 1000),
  label: "Hold",
  voicePrompt: "Hold",
  ...opts,
});

// ---------------------------------------------------------------------------
// Techniques
// ---------------------------------------------------------------------------

export const TECHNIQUES: Technique[] = [
  // ── DOWNREGULATE ───────────────────────────────────────────────────────
  {
    id: "physiological-sigh",
    name: "Physiological Sigh",
    category: "downregulate",
    shortDescription:
      "Double-inhale through the nose, long extended exhale through the mouth.",
    scientificRationale:
      "Most effective single technique for rapidly reducing physiological arousal and improving mood in a randomized comparison of breathwork protocols against mindfulness meditation.",
    citation:
      "Balban, M. Y., Neri, E., Kogon, M. M., Weed, L., Nouriani, B., Jiang, B., Holl, G., Zeitzer, J. M., Spiegel, D., & Huberman, A. D. (2023). Brief structured respiration practices enhance mood and reduce physiological arousal. Cell Reports Medicine, 4(1), 100895.",
    defaultDurationMin: 5,
    durationRangeMin: [1, 10],
    cycle: [
      inhale(1.5),
      inhale(1.0, {
        label: "Top off",
        voicePrompt: "Top up",
        meta: { note: "Second short inhale" },
      }),
      exhale(7.0, {
        label: "Long exhale",
        voicePrompt: "Long exhale",
        meta: { mouth: true },
      }),
    ],
    layout: { kind: "fillDuration" },
  },
  {
    id: "four-seven-eight",
    name: "4-7-8 Breathing",
    category: "downregulate",
    shortDescription:
      "Inhale 4s through the nose, hold 7s, exhale 8s through pursed lips.",
    scientificRationale:
      "A long-exhale, breath-hold pattern that increases vagal tone; widely taught for relaxation and sleep onset.",
    citation:
      "Weil, A. (2016). The 4-7-8 (Relaxing) Breath Technique. Dr. Weil's Wellness Programs.",
    defaultDurationMin: 4,
    durationRangeMin: [1, 8],
    cycle: [
      inhale(4),
      holdIn(7),
      exhale(8, { meta: { mouth: true, pursed: true } }),
    ],
    layout: { kind: "fillDuration" },
  },
  {
    id: "diaphragmatic",
    name: "Diaphragmatic (Belly) Breathing",
    category: "downregulate",
    shortDescription:
      "Slow nasal inhale expanding the belly; longer slow exhale.",
    scientificRationale:
      "Foundational vagal-nerve stimulation technique; slow, belly-led breathing reliably lowers heart rate and blood pressure.",
    citation:
      "Russo, M. A., Santarelli, D. M., & O'Rourke, D. (2017). The physiological effects of slow breathing in the healthy human. Breathe, 13(4), 298–309.",
    defaultDurationMin: 5,
    durationRangeMin: [3, 15],
    cycle: [
      inhale(4, { meta: { note: "Belly expands" } }),
      exhale(6, { meta: { note: "Belly falls" } }),
    ],
    layout: { kind: "fillDuration" },
  },

  // ── UPREGULATE ─────────────────────────────────────────────────────────
  {
    id: "energizing-breath",
    name: "Energizing Breath",
    category: "upregulate",
    shortDescription:
      "30 active 2s nasal inhales / 1s passive mouth exhales, then a long exhale-hold. 2 rounds.",
    scientificRationale:
      "A beginner-safe cyclic hyperventilation modeled on the Wim Hof Method. Raises sympathetic tone and adrenaline, producing alertness and warmth.",
    citation:
      "Kox, M., et al. (2014). Voluntary activation of the sympathetic nervous system and attenuation of the innate immune response in humans. PNAS, 111(20), 7379–7384.",
    defaultDurationMin: 5,
    durationRangeMin: [3, 12],
    cycle: [
      inhale(2, { label: "Active in", voicePrompt: "In" }),
      exhale(1, {
        label: "Let go",
        voicePrompt: "Out",
        meta: { mouth: true, note: "Passive release" },
      }),
    ],
    layout: {
      kind: "rounds",
      rounds: 2,
      cyclesPerRound: 30,
      roundEnd: [
        exhale(2, {
          label: "Final exhale",
          voicePrompt: "Empty the lungs",
          meta: { mouth: true },
        }),
        holdOut(20, {
          label: "Hold (empty)",
          voicePrompt: "Hold",
          meta: { note: "Release whenever you feel the urge to breathe" },
        }),
      ],
      rest: [
        inhale(2, { label: "Recovery in" }),
        holdIn(15, { label: "Recovery hold", voicePrompt: "Hold" }),
        exhale(4, { label: "Release", meta: { mouth: true } }),
      ],
    },
    safetyNotes: [
      "Do not practice in or near water.",
      "Do not practice while driving or operating machinery.",
      "Avoid if pregnant or with cardiovascular, respiratory, or seizure conditions.",
      "Stop immediately if you feel dizzy or lightheaded — these techniques can cause fainting.",
    ],
  },
  {
    id: "bellows-breath",
    name: "Bellows Breath (Bhastrika)",
    category: "upregulate",
    shortDescription:
      "Equal vigorous 2s nasal inhale and exhale for ~30 seconds, then 15s rest. 3 rounds.",
    scientificRationale:
      "Rapid forced breathing increases sympathetic activity and alertness; a gentle, equal-ratio version is beginner-appropriate.",
    citation:
      "Telles, S., Singh, N., & Balkrishna, A. (2011). Heart rate variability changes during high-frequency yoga breathing and breath awareness. Medical Science Monitor, 17(7), CR396–CR401.",
    defaultDurationMin: 4,
    durationRangeMin: [2, 8],
    cycle: [
      inhale(2, { label: "Active in" }),
      exhale(2, { label: "Active out" }),
    ],
    layout: {
      kind: "rounds",
      rounds: 3,
      cyclesPerRound: 8, // ~32s of active breathing per round
      rest: [
        inhale(5, {
          label: "Settle",
          voicePrompt: "Settle",
          meta: { note: "Slow nasal inhale — let the body unwind" },
        }),
        exhale(10, {
          label: "Rest",
          voicePrompt: "Rest",
          meta: { note: "Soften shoulders and jaw. Notice tingling, warmth." },
        }),
      ],
    },
    safetyNotes: [
      "Stop if you feel dizzy or lightheaded.",
      "Do not practice while driving or in water.",
      "Skip if pregnant or with cardiovascular conditions.",
    ],
  },

  // ── BALANCE ────────────────────────────────────────────────────────────
  {
    id: "box-breathing",
    name: "Box Breathing (4-4-4-4)",
    category: "balance",
    shortDescription:
      "Inhale 4s, hold 4s, exhale 4s, hold 4s. Used by Navy SEALs.",
    scientificRationale:
      "Equal-ratio breath-holding patterns stabilize autonomic tone and are well tolerated by beginners.",
    citation:
      "Röttger, S., et al. (2021). The effectiveness of combat tactical breathing as compared with prolonged exhalation. Applied Psychophysiology and Biofeedback, 46, 19–28.",
    defaultDurationMin: 5,
    durationRangeMin: [2, 15],
    cycle: [inhale(4), holdIn(4), exhale(4), holdOut(4)],
    layout: { kind: "fillDuration" },
  },
  {
    id: "coherent-breathing",
    name: "Coherent (Resonant) Breathing",
    category: "balance",
    shortDescription:
      "Inhale 5.5s, exhale 5.5s. ~5.5 breaths/min — the HRV sweet spot.",
    scientificRationale:
      "Breathing at ~5.5–6 breaths per minute maximizes baroreflex gain and heart rate variability, the marker of autonomic flexibility.",
    citation:
      "Lehrer, P. M., & Gevirtz, R. (2014). Heart rate variability biofeedback: how and why does it work? Frontiers in Psychology, 5, 756.",
    defaultDurationMin: 6,
    durationRangeMin: [3, 15],
    cycle: [inhale(5.5), exhale(5.5)],
    layout: { kind: "fillDuration" },
  },

  // ── FOCUS ──────────────────────────────────────────────────────────────
  {
    id: "alternate-nostril",
    name: "Alternate Nostril Breathing",
    category: "focus",
    shortDescription:
      "Inhale left, exhale right, inhale right, exhale left — repeat.",
    scientificRationale:
      "Alternate nostril breathing (Nadi Shodhana) improves attention, autonomic balance, and cognitive performance.",
    citation:
      "Telles, S., Sharma, S. K., & Balkrishna, A. (2014). Blood pressure and heart rate variability during yoga-based alternate nostril breathing practice and breath awareness. Medical Science Monitor Basic Research, 20, 184–193.",
    defaultDurationMin: 5,
    durationRangeMin: [3, 10],
    cycle: [
      inhale(4, {
        label: "In — left",
        voicePrompt: "Inhale left",
        meta: { nostril: "left" },
      }),
      exhale(4, {
        label: "Out — right",
        voicePrompt: "Exhale right",
        meta: { nostril: "right" },
      }),
      inhale(4, {
        label: "In — right",
        voicePrompt: "Inhale right",
        meta: { nostril: "right" },
      }),
      exhale(4, {
        label: "Out — left",
        voicePrompt: "Exhale left",
        meta: { nostril: "left" },
      }),
    ],
    layout: { kind: "fillDuration" },
  },
  {
    id: "equal-breathing",
    name: "Equal Breathing (Sama Vritti)",
    category: "focus",
    shortDescription: "Inhale 4s, exhale 4s. A steady rhythm for attention.",
    scientificRationale:
      "Simple symmetric breathing serves as an attention anchor; consistent practice is associated with improved sustained attention.",
    citation:
      "Zaccaro, A., et al. (2018). How breath-control can change your life: a systematic review on psycho-physiological correlates of slow breathing. Frontiers in Human Neuroscience, 12, 353.",
    defaultDurationMin: 4,
    durationRangeMin: [2, 10],
    cycle: [inhale(4), exhale(4)],
    layout: { kind: "fillDuration" },
  },
];

// ---------------------------------------------------------------------------
// Convenience lookups
// ---------------------------------------------------------------------------

export const techniquesByCategory = (category: Category): Technique[] =>
  TECHNIQUES.filter((t) => t.category === category);

export const findTechnique = (id: string): Technique | undefined =>
  TECHNIQUES.find((t) => t.id === id);

/** Total duration of one canonical cycle in milliseconds. */
export const cycleDurationMs = (t: Technique): number =>
  t.cycle.reduce((sum, p) => sum + p.durationMs, 0);

/**
 * Expand a Technique into a flat phase list for the requested duration.
 *
 * The session state machine in `useBreathSession` just walks this array
 * — it doesn't need to know about cycles, rounds, or layouts.
 *
 *   - `fillDuration`: repeat the cycle until target duration is met. We always
 *     complete the current cycle (never cut mid-phase), so actual length
 *     may overshoot by up to one cycle.
 *   - `fixedCycles`:  exact N repetitions; durationMin is ignored.
 *   - `rounds`:       rounds × cyclesPerRound, with optional roundEnd phases
 *     after every round and `rest` phases between rounds; durationMin ignored.
 */
export const expandSession = (
  t: Technique,
  durationMin: number,
): BreathPhase[] => {
  const phases: BreathPhase[] = [];
  const cycleMs = cycleDurationMs(t);

  switch (t.layout.kind) {
    case "fillDuration": {
      const targetMs = Math.max(durationMin, 0) * 60_000;
      let elapsed = 0;
      // Always run at least one full cycle, even if duration is 0.
      do {
        phases.push(...t.cycle);
        elapsed += cycleMs;
      } while (elapsed < targetMs);
      return phases;
    }
    case "fixedCycles": {
      for (let i = 0; i < t.layout.cycles; i++) phases.push(...t.cycle);
      return phases;
    }
    case "rounds": {
      const { rounds, cyclesPerRound, roundEnd, rest } = t.layout;
      for (let r = 0; r < rounds; r++) {
        for (let c = 0; c < cyclesPerRound; c++) phases.push(...t.cycle);
        if (roundEnd) phases.push(...roundEnd);
        if (rest && r < rounds - 1) phases.push(...rest);
      }
      return phases;
    }
  }
};

/** Total duration (ms) of an expanded session. */
export const sessionDurationMs = (phases: BreathPhase[]): number =>
  phases.reduce((sum, p) => sum + p.durationMs, 0);
