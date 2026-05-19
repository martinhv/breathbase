// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Foundations — the single guided 5-day program. A curated tour of the
// foundational techniques, one per day, in an order that introduces
// complexity gradually: slow breath → resonance → symmetry with holds →
// long exhale → on-demand reset.
//
// The curriculum deliberately omits upregulate techniques (breath holds,
// cyclic hyperventilation) — those carry safety constraints and are not
// appropriate for a week-1 introduction.
//
// Each day carries a structured `intro` (a brief pre-session lesson card)
// and a `takeaway` (a "use this when..." anchor shown on the complete
// screen). Days 2+ also include a one-sentence `callback` to the previous
// day, so the program feels like a continuous arc rather than five
// disconnected sessions.
//
// Goal-driven groupings (sleep, stress, focus, energy) are a separate
// concept; see lib/themes.ts. Themes don't impose a curriculum — they're
// just collections of relevant techniques.
//
// State lives on `Settings.program` and is mutated through `useSettings().update`.

export type ProgramDayIntro = {
  /** What you're learning today. 1 short sentence. */
  learn: string;
  /** Why it works — the single science nugget for this day. 1-2 sentences. */
  science: string;
  /** What to notice during practice. 1 sentence. */
  notice: string;
  /** Callback to the previous day's lesson (day 2+). 1 sentence. */
  callback?: string;
};

export type ProgramDayTakeaway = {
  /** "Use this when..." anchor — when in real life to reach for this technique. */
  useWhen: string;
};

export type ProgramDay = {
  /** 1-indexed within the program. */
  day: number;
  techniqueId: string;
  durationMin: number;
  /** Short title shown on the day card, e.g. "Settle in". */
  headline: string;
  /** One-sentence framing for the day card on the program list. */
  why: string;
  /** Pre-session lesson card. */
  intro: ProgramDayIntro;
  /** Post-session takeaway shown on the complete screen. */
  takeaway: ProgramDayTakeaway;
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
      intro: {
        learn: "Belly-led breathing — the foundation everything else builds on.",
        science:
          "A slow nasal inhale that expands the belly and a longer exhale engages the vagus nerve, lowering heart rate and blood pressure.",
        notice:
          "Rest a hand on your belly. It should rise on the inhale — not your chest.",
      },
      takeaway: {
        useWhen:
          "Anytime you catch yourself shallow-chest breathing — at the desk, in traffic, before sleep.",
      },
    },
    {
      day: 2,
      techniqueId: "coherent-breathing",
      durationMin: 5,
      headline: "Find your resonance",
      why: "Around six breaths a minute maximizes heart rate variability — the body's measure of autonomic flexibility.",
      intro: {
        learn: "Find your resonance — roughly five and a half breaths per minute.",
        science:
          "At this pace heart rate, blood pressure, and breath synchronize. This 'coherence' maximizes heart rate variability, a marker of autonomic flexibility.",
        notice:
          "Smooth and even, in and out. The pace should feel slow but never strained.",
        callback:
          "Yesterday you grounded the breath in the belly. Today we tune its pace.",
      },
      takeaway: {
        useWhen:
          "As a daily five-minute reset — pre-meeting, post-work, or as a stress baseline.",
      },
    },
    {
      day: 3,
      techniqueId: "box-breathing",
      durationMin: 5,
      headline: "Add a hold",
      why: "Equal in, hold, out, hold. Holds train tolerance and steady the nervous system.",
      intro: {
        learn: "Equal counts, in all four directions: in, hold, out, hold.",
        science:
          "Brief breath holds train CO₂ tolerance and steady the nervous system. It's why combat units use it before high-stakes moments.",
        notice:
          "The holds shouldn't feel like white-knuckling. Soften the throat and shoulders while you wait.",
        callback:
          "Yesterday's rhythm was a two-beat cycle. Today we make it four.",
      },
      takeaway: {
        useWhen:
          "Before anything that spikes your heart rate — a presentation, a hard conversation, a workout.",
      },
    },
    {
      day: 4,
      techniqueId: "four-seven-eight",
      durationMin: 4,
      headline: "Lean into the exhale",
      why: "A long exhale with a held breath strongly activates the parasympathetic branch — useful before sleep.",
      intro: {
        learn: "Lean into the exhale. Inhale four, hold seven, exhale eight.",
        science:
          "Long exhales — especially after a hold — strongly activate the parasympathetic branch. It's the breath pattern most reliably linked to faster sleep onset.",
        notice:
          "The exhale through pursed lips should feel slow and audible — like fogging a mirror.",
        callback:
          "Yesterday's holds were symmetric. Today we tilt the ratio toward calm.",
      },
      takeaway: {
        useWhen:
          "In bed when you can't sleep, or in the five minutes before something stressful.",
      },
    },
    {
      day: 5,
      techniqueId: "physiological-sigh",
      durationMin: 5,
      headline: "A reset on demand",
      why: "The fastest tool for de-escalating arousal in the moment. Keep this one in your pocket.",
      intro: {
        learn: "A reset on demand — two quick nasal inhales, one long mouth exhale.",
        science:
          "The double-inhale re-inflates collapsed alveoli; the long exhale offloads CO₂ fast. In a randomized comparison against meditation, it was the single most effective protocol for reducing acute stress.",
        notice:
          "The second inhale is short — just a top-off. The long exhale is where the work happens.",
        callback:
          "The last four days were structured practices. Today's tool you can do in ten seconds, anywhere.",
      },
      takeaway: {
        useWhen:
          "Mid-stress, mid-spiral, mid-anything. One to three sighs and the body resets.",
      },
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
