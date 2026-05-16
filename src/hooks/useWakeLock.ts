import { useEffect, useRef } from "react";

// Hold the screen wake lock for the duration this hook is `active`. The
// browser drops the lock automatically when the document is hidden, so we
// also re-acquire on visibilitychange while still active. Failure (Safari
// pre-16.4, unsupported browsers) is silently ignored — meditation still
// works, just the screen may dim.

type WakeLockSentinel = {
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;

    let cancelled = false;
    const acquire = async () => {
      try {
        const s = await nav.wakeLock!.request("screen");
        if (cancelled) {
          void s.release();
          return;
        }
        sentinelRef.current = s;
        s.addEventListener("release", () => {
          if (sentinelRef.current === s) sentinelRef.current = null;
        });
      } catch {
        /* unsupported or permission denied */
      }
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s) void s.release().catch(() => {});
    };
  }, [active]);
}
