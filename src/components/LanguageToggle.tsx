// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Compact pre-auth language picker used on Login + Onboarding.
//
// Writes directly to i18next (which caches to localStorage). The chosen
// language survives sign-in: SettingsProvider's effect calls applyLanguage on
// the saved preference, but settings.language defaults to "auto", which
// resolveLanguage() interprets as "trust what i18next already has".

import { useTranslation } from "react-i18next";

type Variant = "light" | "dark";

export function LanguageToggle({ variant = "dark" }: { variant?: Variant }) {
  const { i18n } = useTranslation();
  const current = i18n.language.startsWith("de") ? "de" : "en";

  const isLight = variant === "light";
  const baseClasses = isLight
    ? "bg-white/15 text-white border-white/20 hover:bg-white/25"
    : "bg-slate-100 dark:bg-ink-700 border-slate-900/10 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-ink-600";

  return (
    <select
      value={current}
      onChange={(e) => void i18n.changeLanguage(e.target.value)}
      aria-label="Language"
      className={`text-xs px-2 py-1 rounded-lg border transition outline-none ${baseClasses}`}
    >
      <option value="en">English</option>
      <option value="de">Deutsch</option>
    </select>
  );
}
