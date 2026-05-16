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
