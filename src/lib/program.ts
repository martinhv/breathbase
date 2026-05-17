// Guided programs — a small library of curated 7-day curricula, each tuned
// to a specific goal. Users pick one during onboarding ("What brought you
// here?") and the chosen program drives the /program page and Home tile.
//
// Data shape:
//   PROGRAMS              record keyed by program id
//   PROGRAM_FOR_GOAL      maps the onboarding answer to a program id
//   ProgramState          per-user state: which program, which days done
//
// State lives on `Settings.program` and is mutated through `useSettings().update`.

export type ProgramId =
  | "foundations"
  | "sleep"
  | "stress"
  | "focus"
  | "energy";

/** The onboarding question's answer. Maps 1:1 to a program (curiosity → foundations). */
export type ProgramGoal =
  | "curiosity"
  | "sleep"
  | "stress"
  | "focus"
  | "energy";

export const FOUNDATIONS_ID: ProgramId = "foundations";

export type ProgramDay = {
  /** 1-indexed within the program. */
  day: number;
  techniqueId: string;
  durationMin: number;
  /** Short title shown on the day card, e.g. "Settle in". */
  headline: string;
  /** One-sentence framing for the day. */
  why: string;
};

export type Program = {
  id: ProgramId;
  /** Display name in the UI, e.g. "Sleep". */
  name: string;
  /** Short subtitle / one-line tagline. */
  tagline: string;
  /** Emoji used on the Home tile and Program header. */
  emoji: string;
  days: ProgramDay[];
};

export type ProgramState = {
  enrolled: boolean;
  /** Which program the user is currently working through. */
  programId: ProgramId;
  /** ISO timestamp of enrollment; null until the user begins. */
  startedAt: string | null;
  /** 1-indexed day numbers completed in the current program. Sorted, unique.
   *  Resetting on program change is the caller's responsibility (see enrollState). */
  completedDays: number[];
};

export const DEFAULT_PROGRAM_STATE: ProgramState = {
  enrolled: false,
  programId: FOUNDATIONS_ID,
  startedAt: null,
  completedDays: [],
};

// ---------------------------------------------------------------------------
// The program library
// ---------------------------------------------------------------------------

const FOUNDATIONS: Program = {
  id: "foundations",
  name: "Foundations",
  tagline: "A tour of the basics",
  emoji: "🗓️",
  days: [
    {
      day: 1,
      techniqueId: "diaphragmatic",
      durationMin: 5,
      headline: "Settle into the breath",
      why: "Belly-led breathing is the foundation. Notice the body softening as the exhale lengthens.",
    },
    {
      day: 2,
      techniqueId: "coherent-breathing",
      durationMin: 5,
      headline: "Find your resonance",
      why: "Around six breaths a minute maximizes heart rate variability — the body's measure of autonomic flexibility.",
    },
    {
      day: 3,
      techniqueId: "box-breathing",
      durationMin: 5,
      headline: "Add a hold",
      why: "Equal in, hold, out, hold. Holds train tolerance and steady the nervous system.",
    },
    {
      day: 4,
      techniqueId: "four-seven-eight",
      durationMin: 4,
      headline: "Lean into the exhale",
      why: "A long exhale with a held breath strongly activates the parasympathetic branch — useful before sleep.",
    },
    {
      day: 5,
      techniqueId: "equal-breathing",
      durationMin: 5,
      headline: "Anchor attention",
      why: "A simple symmetric rhythm trains sustained focus. Let the count be the only thing in mind.",
    },
    {
      day: 6,
      techniqueId: "alternate-nostril",
      durationMin: 5,
      headline: "Balance left and right",
      why: "Switching nostrils balances autonomic tone and brings the mind into a single track.",
    },
    {
      day: 7,
      techniqueId: "physiological-sigh",
      durationMin: 5,
      headline: "A reset on demand",
      why: "The fastest tool for de-escalating arousal in the moment. Keep this one in your pocket.",
    },
  ],
};

const SLEEP: Program = {
  id: "sleep",
  name: "Sleep",
  tagline: "Wind the body down",
  emoji: "🌙",
  days: [
    {
      day: 1,
      techniqueId: "diaphragmatic",
      durationMin: 5,
      headline: "Settle the body",
      why: "Belly breathing lowers heart rate and signals the brain that it's safe to rest.",
    },
    {
      day: 2,
      techniqueId: "physiological-sigh",
      durationMin: 5,
      headline: "Release the day",
      why: "Double-inhales empty the lungs more completely; long exhales drop sympathetic tone fast.",
    },
    {
      day: 3,
      techniqueId: "four-seven-eight",
      durationMin: 4,
      headline: "Lean into the exhale",
      why: "The hold + long exhale combination is the strongest single tool for parasympathetic activation.",
    },
    {
      day: 4,
      techniqueId: "coherent-breathing",
      durationMin: 6,
      headline: "Slow into rest",
      why: "Slower, longer breaths bring the system to its resonant frequency — bedtime territory.",
    },
    {
      day: 5,
      techniqueId: "four-seven-eight",
      durationMin: 5,
      headline: "Deepen the breath",
      why: "A minute longer than day 3. Same pattern; let the body memorize it.",
    },
    {
      day: 6,
      techniqueId: "coherent-breathing",
      durationMin: 8,
      headline: "Sustained calm",
      why: "Extending the practice trains your system to stay at the lower arousal level for longer.",
    },
    {
      day: 7,
      techniqueId: "diaphragmatic",
      durationMin: 8,
      headline: "Drift off",
      why: "The simplest pattern, the longest duration — what you'll keep for the long term.",
    },
  ],
};

const STRESS: Program = {
  id: "stress",
  name: "Stress reset",
  tagline: "Tools for the hard moments",
  emoji: "🌀",
  days: [
    {
      day: 1,
      techniqueId: "physiological-sigh",
      durationMin: 3,
      headline: "Your fastest tool",
      why: "The physiological sigh works in seconds. Learn the shape today; use it for life.",
    },
    {
      day: 2,
      techniqueId: "diaphragmatic",
      durationMin: 5,
      headline: "Slow it down",
      why: "Belly breathing is the baseline the body returns to once the alarm passes.",
    },
    {
      day: 3,
      techniqueId: "physiological-sigh",
      durationMin: 5,
      headline: "Practice the reset",
      why: "Repetition builds the reflex — when you actually need this, it's already there.",
    },
    {
      day: 4,
      techniqueId: "box-breathing",
      durationMin: 5,
      headline: "Steady the system",
      why: "The symmetric pattern Navy SEALs use to stay calm under pressure.",
    },
    {
      day: 5,
      techniqueId: "coherent-breathing",
      durationMin: 5,
      headline: "Find your center",
      why: "Resonant breathing maximizes HRV — the marker of stress resilience.",
    },
    {
      day: 6,
      techniqueId: "physiological-sigh",
      durationMin: 4,
      headline: "Re-anchor",
      why: "Coming back to the fastest tool — by now it should feel familiar.",
    },
    {
      day: 7,
      techniqueId: "coherent-breathing",
      durationMin: 8,
      headline: "Settled equilibrium",
      why: "A longer practice. The capacity you build here is the buffer for everything outside.",
    },
  ],
};

const FOCUS: Program = {
  id: "focus",
  name: "Focus",
  tagline: "Train sustained attention",
  emoji: "🎯",
  days: [
    {
      day: 1,
      techniqueId: "equal-breathing",
      durationMin: 4,
      headline: "Attention anchor",
      why: "A simple, symmetric rhythm gives the mind one thing to do. Notice when it drifts.",
    },
    {
      day: 2,
      techniqueId: "box-breathing",
      durationMin: 5,
      headline: "Symmetric control",
      why: "Adding holds extends the pattern. Each hold is a moment of pure attention.",
    },
    {
      day: 3,
      techniqueId: "alternate-nostril",
      durationMin: 5,
      headline: "Left and right",
      why: "Switching nostrils requires the mind to stay sharp on which side comes next.",
    },
    {
      day: 4,
      techniqueId: "coherent-breathing",
      durationMin: 5,
      headline: "Steady cadence",
      why: "Slower breath = slower mind. Train the system to stay at a single tempo.",
    },
    {
      day: 5,
      techniqueId: "equal-breathing",
      durationMin: 6,
      headline: "Deepen the anchor",
      why: "A minute longer. Sustained attention is built one minute at a time.",
    },
    {
      day: 6,
      techniqueId: "box-breathing",
      durationMin: 6,
      headline: "Extended hold",
      why: "The breath holds are where attention sharpens. Lean into them.",
    },
    {
      day: 7,
      techniqueId: "alternate-nostril",
      durationMin: 8,
      headline: "Sustained focus",
      why: "The hardest practice for the final day — a real test of the attention you've trained.",
    },
  ],
};

const ENERGY: Program = {
  id: "energy",
  name: "Energy",
  tagline: "A gentle ramp into upregulate",
  emoji: "⚡",
  days: [
    {
      day: 1,
      techniqueId: "bellows-breath",
      durationMin: 2,
      headline: "Activate gently",
      why: "Equal, rhythmic active breathing. Notice warmth, alertness — the body waking up.",
    },
    {
      day: 2,
      techniqueId: "equal-breathing",
      durationMin: 5,
      headline: "Anchor the mind",
      why: "Active breathwork pairs well with a steady mind. Today is the steady part.",
    },
    {
      day: 3,
      techniqueId: "bellows-breath",
      durationMin: 2,
      headline: "Practice the rhythm",
      why: "Returning to bellows with more confidence. Stay relaxed in the face and shoulders.",
    },
    {
      day: 4,
      techniqueId: "box-breathing",
      durationMin: 5,
      headline: "Steadiness with control",
      why: "Symmetric breath with holds — the counterweight to active breathing.",
    },
    {
      day: 5,
      techniqueId: "energizing-breath",
      durationMin: 4,
      headline: "Full cyclic activation",
      why: "Wim Hof-style cyclic breathing with an exhale hold. Strongest tool in the program.",
    },
    {
      day: 6,
      techniqueId: "coherent-breathing",
      durationMin: 6,
      headline: "Recovery and integration",
      why: "After the strongest day, return to slow resonant breathing. The body recalibrates.",
    },
    {
      day: 7,
      techniqueId: "energizing-breath",
      durationMin: 4,
      headline: "Confident practice",
      why: "Same shape as day 5, now familiar. This is the tool you take with you.",
    },
  ],
};

export const PROGRAMS: Record<ProgramId, Program> = {
  foundations: FOUNDATIONS,
  sleep: SLEEP,
  stress: STRESS,
  focus: FOCUS,
  energy: ENERGY,
};

/** Display order in the program picker. */
export const PROGRAM_ORDER: ProgramId[] = [
  "foundations",
  "sleep",
  "stress",
  "focus",
  "energy",
];

/** Map the onboarding goal answer to the recommended program. */
export const PROGRAM_FOR_GOAL: Record<ProgramGoal, ProgramId> = {
  curiosity: "foundations",
  sleep: "sleep",
  stress: "stress",
  focus: "focus",
  energy: "energy",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fall back to foundations if the id is unknown (e.g. stale settings doc). */
export const getProgram = (id: ProgramId): Program =>
  PROGRAMS[id] ?? PROGRAMS[FOUNDATIONS_ID];

export const programLength = (id: ProgramId): number => getProgram(id).days.length;

export const getProgramDay = (
  id: ProgramId,
  day: number,
): ProgramDay | undefined => getProgram(id).days.find((d) => d.day === day);

export const isDayComplete = (state: ProgramState, day: number): boolean =>
  state.completedDays.includes(day);

/** Day 1 is always unlocked. Day N (N>1) unlocks once day N-1 is complete. */
export const isDayUnlocked = (state: ProgramState, day: number): boolean => {
  const len = programLength(state.programId);
  if (day < 1 || day > len) return false;
  if (day === 1) return true;
  return state.completedDays.includes(day - 1);
};

export const isProgramComplete = (state: ProgramState): boolean => {
  const p = getProgram(state.programId);
  return p.days.every((d) => state.completedDays.includes(d.day));
};

/** Lowest day number not yet completed, or null when the program is done. */
export const nextProgramDay = (state: ProgramState): number | null => {
  const p = getProgram(state.programId);
  for (const d of p.days) {
    if (!state.completedDays.includes(d.day)) return d.day;
  }
  return null;
};

/** Returns a new state with `day` marked complete (idempotent + sorted). */
export const markDayComplete = (
  state: ProgramState,
  day: number,
): ProgramState => {
  const len = programLength(state.programId);
  if (day < 1 || day > len) return state;
  if (state.completedDays.includes(day)) return state;
  return {
    ...state,
    completedDays: [...state.completedDays, day].sort((a, b) => a - b),
  };
};

/** Build a fresh enrollment state for the chosen program. Resets completedDays. */
export const enrollState = (
  programId: ProgramId = FOUNDATIONS_ID,
  now: Date = new Date(),
): ProgramState => ({
  enrolled: true,
  programId,
  startedAt: now.toISOString(),
  completedDays: [],
});
