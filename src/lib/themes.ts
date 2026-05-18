// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Themes — goal-driven groupings of techniques. Distinct from categories
// (which group by physiology: down/upregulate/balance/focus) and from the
// 7-day Foundations program (a curated sequential curriculum).
//
// Themes are top-level entries on Home: a user who "wants help sleeping" can
// tap Sleep and see the relevant techniques without first having to map
// their goal to a physiological category.

export type ThemeId = "sleep" | "stress" | "focus" | "energy";

export type Theme = {
  id: ThemeId;
  name: string;
  emoji: string;
  /** One-line label shown on the Home tile. */
  tagline: string;
  /** Longer paragraph shown on the theme page. */
  description: string;
  /** Techniques in the order they appear on the theme page. The first entry
   *  acts as the recommended starting point. */
  techniqueIds: string[];
};

export const THEMES: Record<ThemeId, Theme> = {
  sleep: {
    id: "sleep",
    name: "Sleep",
    emoji: "🌙",
    tagline: "Wind down for rest",
    description:
      "Slow breath and long exhales activate the parasympathetic nervous system, lowering arousal and preparing the body for sleep.",
    techniqueIds: [
      "diaphragmatic",
      "four-seven-eight",
      "physiological-sigh",
      "coherent-breathing",
    ],
  },
  stress: {
    id: "stress",
    name: "Stress reset",
    emoji: "🌀",
    tagline: "Tools for hard moments",
    description:
      "Fast-acting techniques to de-escalate the stress response, plus a few steady patterns to settle the system after the spike has passed.",
    techniqueIds: [
      "physiological-sigh",
      "diaphragmatic",
      "box-breathing",
      "coherent-breathing",
    ],
  },
  focus: {
    id: "focus",
    name: "Focus",
    emoji: "🎯",
    tagline: "Sharpen attention",
    description:
      "Symmetric and rhythm-based patterns that train sustained attention. The breath becomes a single thing to hold the mind to.",
    techniqueIds: [
      "equal-breathing",
      "box-breathing",
      "alternate-nostril",
      "coherent-breathing",
    ],
  },
  energy: {
    id: "energy",
    name: "Energy",
    emoji: "⚡",
    tagline: "Activate body and mind",
    description:
      "Active breathwork that raises sympathetic tone — useful for waking up, before a workout, or when the afternoon slump hits.",
    techniqueIds: [
      "bellows-breath",
      "energizing-breath",
      "equal-breathing",
    ],
  },
};

export const THEME_ORDER: ThemeId[] = ["sleep", "stress", "focus", "energy"];

export const getTheme = (id: ThemeId): Theme | undefined => THEMES[id];

/** Pick a theme to suggest based on the hour of day.
 *
 * - 05–10  → Energy   (morning lift)
 * - 11–16  → Focus    (work / mid-day)
 * - 17–19  → Stress   (afternoon dip / transition into evening)
 * - 20–04  → Sleep    (evening, late night)
 */
export function suggestedThemeForHour(hour: number): {
  id: ThemeId;
  period: string;
} {
  if (hour >= 5 && hour <= 10) return { id: "energy", period: "Morning" };
  if (hour >= 11 && hour <= 16) return { id: "focus", period: "Afternoon" };
  if (hour >= 17 && hour <= 19)
    return { id: "stress", period: "Late afternoon" };
  return { id: "sleep", period: "Evening" };
}