// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useCallback } from "react";
import { useSettings } from "@/lib/settings";

/**
 * Thin guarded wrapper around navigator.vibrate. No-op on unsupported
 * platforms (iOS Safari, desktop browsers) and when the user has disabled
 * haptics in settings.
 */
export function useHaptics() {
  const { settings } = useSettings();
  return useCallback(
    (durationMs: number | number[] = 50) => {
      if (!settings.hapticsEnabled) return;
      if (typeof navigator === "undefined" || !navigator.vibrate) return;
      try {
        navigator.vibrate(durationMs);
      } catch {
        // some browsers throw if called too frequently; ignore.
      }
    },
    [settings.hapticsEnabled],
  );
}