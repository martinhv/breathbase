// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// i18n bootstrap. Loaded once from main.tsx before React renders.
// English is the source of truth; German overrides live in i18n/de.ts.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { en } from "./i18n/en";
import { de } from "./i18n/de";

export type SupportedLanguage = "en" | "de";

/** Languages the user can pick. "auto" means: follow the browser. */
export const LANGUAGE_OPTIONS = ["auto", "en", "de"] as const;
export type LanguagePref = (typeof LANGUAGE_OPTIONS)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "de"],
    interpolation: { escapeValue: false },
    detection: {
      // localStorage only — we intentionally don't follow navigator.language
      // here. The first screen defaults to English (fallbackLng), and the
      // user opts into German via the picker on Login/Onboarding/Settings.
      order: ["localStorage"],
      lookupLocalStorage: "sough:i18nLng",
      caches: ["localStorage"],
    },
    returnObjects: true,
  });

/** Resolve a stored preference (including "auto") to a concrete language.
 *
 *  "auto" means "trust whatever i18next currently has" — typically the
 *  language picked on the first screen (cached to localStorage), or the
 *  fallback "en" if nothing was picked. We deliberately don't consult
 *  navigator.language so a German browser doesn't override an English-first
 *  experience.
 */
export function resolveLanguage(pref: LanguagePref): SupportedLanguage {
  if (pref === "en" || pref === "de") return pref;
  const current = i18n.language?.toLowerCase() ?? "en";
  return current.startsWith("de") ? "de" : "en";
}

/** Imperative language switch. Called from a setting effect in App.tsx. */
export function applyLanguage(pref: LanguagePref): void {
  const lang = resolveLanguage(pref);
  if (i18n.language !== lang) {
    void i18n.changeLanguage(lang);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
}

export default i18n;
