// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Theme } from "./storage";

// Mirror src/index.html's inline script: keep them in sync if the logic
// changes. The HTML version reads localStorage so the very first paint is
// already in the right theme; this module's applyTheme is called by React
// once settings are loaded from Firestore and may switch themes again.

const STORAGE_KEY = "sough:theme";

export function isDarkMode(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDarkMode(theme));
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private window etc. — non-fatal */
  }
}

/**
 * Subscribe to system color-scheme changes. Returns an unsubscribe function.
 * Only relevant when settings.theme === "auto"; callers should pass the
 * current theme value and re-run the effect when it changes.
 */
export function subscribeSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}