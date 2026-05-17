// Foundations — the single guided 7-day program. A curated tour of the
// foundational techniques, one per day, in an order that introduces
// complexity gradually: slow breath → resonance → symmetry with holds →
// long exhale → focus.
//
// The curriculum deliberately omits upregulate techniques (breath holds,
// cyclic hyperventilation) — those carry safety constraints and are not
// appropriate for a week-1 introduction.
//
// Goal-driven groupings (sleep, stress, focus, energy) are a separate
// concept; see lib/themes.ts. Themes don't impose a curriculum — they're
// just collections of relevant techniques.
//
// State lives on `Settings.program` and is mutated through `useSettings().update`.

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
  id: "foundations";
  name: string;
  /** Short subtitle / one-line tagline. */
  tagline: string;
  /** Emoji used on the Home tile and Program header. */
  emoji: string;
  days: ProgramDay[];
};

export type ProgramState = {
  enrolled: boolean;
  /** ISO timestamp of enrollment; null until the user begins. */
  startedAt: string | null;
  /** 1-indexed day numbers completed. Sorted, unique. */
  completedDays: number[];
};

export const DEFAULT_PROGRAM_STATE: ProgramState = {
  enrolled: false,
  startedAt: null,
  completedDays: [],
};

export const PROGRAM: Program = {
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

export const PROGRAM_LENGTH = PROGRAM.days.length;

export const getProgramDay = (day: number): ProgramDay | undefined =>
  PROGRAM.days.find((d) => d.day === day);

export const isDayComplete = (state: ProgramState, day: number): boolean =>
  state.completedDays.includes(day);

/** Day 1 is always unlocked. Day N (N>1) unlocks once day N-1 is complete. */
export const isDayUnlocked = (state: ProgramState, day: number): boolean => {
  if (day < 1 || day > PROGRAM_LENGTH) return false;
  if (day === 1) return true;
  return state.completedDays.includes(day - 1);
};

export const isProgramComplete = (state: ProgramState): boolean =>
  PROGRAM.days.every((d) => state.completedDays.includes(d.day));

/** Lowest day number not yet completed, or null when the program is done. */
export const nextProgramDay = (state: ProgramState): number | null => {
  for (const d of PROGRAM.days) {
    if (!state.completedDays.includes(d.day)) return d.day;
  }
  return null;
};

/** Returns a new state with `day` marked complete (idempotent + sorted). */
export const markDayComplete = (
  state: ProgramState,
  day: number,
): ProgramState => {
  if (day < 1 || day > PROGRAM_LENGTH) return state;
  if (state.completedDays.includes(day)) return state;
  return {
    ...state,
    completedDays: [...state.completedDays, day].sort((a, b) => a - b),
  };
};

/** Build a fresh enrollment state. */
export const enrollState = (now: Date = new Date()): ProgramState => ({
  enrolled: true,
  startedAt: now.toISOString(),
  completedDays: [],
});
