import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";

/**
 * Returns true when motion should be reduced. Combines the user's setting
 * ("on" | "off" | "auto") with the OS-level `prefers-reduced-motion` query.
 */
export function useReducedMotion(): boolean {
  const { settings } = useSettings();
  const [osPrefersReduced, setOsPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setOsPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setOsPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (settings.reducedMotion === "on") return true;
  if (settings.reducedMotion === "off") return false;
  return osPrefersReduced;
}
