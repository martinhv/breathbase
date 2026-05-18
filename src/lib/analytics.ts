// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Privacy-respecting analytics via a self-hosted Umami instance.
//
// Activated only when BOTH VITE_UMAMI_WEBSITE_ID and VITE_UMAMI_SCRIPT_URL
// are set at build time AND the user hasn't opted out in Settings AND
// navigator.doNotTrack isn't on. No cookies, no IDs — Umami fingerprints by
// salted-hash-of-IP-and-UA, rotated daily.
//
// The script is injected lazily (no module-level side effects) so the bundle
// is unaffected for users who opt out or for Firebase-less local-mode builds.

type UmamiPayload = Record<string, unknown>;
type UmamiTrack = {
  // Custom event with optional data.
  (event: string, data?: UmamiPayload): void;
  // Pageview with an explicit payload (we use this for SPA route changes).
  (payload: UmamiPayload): void;
};

declare global {
  interface Window {
    umami?: { track: UmamiTrack };
  }
}

const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
const SCRIPT_URL = import.meta.env.VITE_UMAMI_SCRIPT_URL as string | undefined;

/** True when the build was given VITE_UMAMI_WEBSITE_ID + VITE_UMAMI_SCRIPT_URL.
 *  Other code uses this to gate UI (e.g. hide the opt-out toggle for builds
 *  that wouldn't send anything regardless). */
export const ANALYTICS_CONFIGURED: boolean = Boolean(WEBSITE_ID && SCRIPT_URL);

const isConfigured = (): boolean => ANALYTICS_CONFIGURED;

const dntEnabled = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const dnt =
    navigator.doNotTrack ??
    (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack;
  return dnt === "1" || dnt === "yes";
};

let scriptLoaded = false;
let enabled = false;
let errorHandlersInstalled = false;

// Per-session cap so a tight error loop can't flood the analytics endpoint
// or rack up costs. Resets on next page load.
const ERROR_CAP = 20;
let errorsSent = 0;

function truncate(s: string, max = 300): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function installErrorHandlers(): void {
  if (errorHandlersInstalled) return;
  if (typeof window === "undefined") return;
  errorHandlersInstalled = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    if (!enabled || errorsSent >= ERROR_CAP) return;
    errorsSent += 1;
    track("error", {
      message: truncate(e.message || "unknown"),
      source: truncate(e.filename || "", 200),
      line: e.lineno ?? 0,
      column: e.colno ?? 0,
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    if (!enabled || errorsSent >= ERROR_CAP) return;
    errorsSent += 1;
    const reason = e.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "unhandled rejection";
    track("error", {
      message: truncate(message),
      kind: "unhandledrejection",
    });
  });
}

/**
 * Call once on app boot (after settings have loaded). Decides whether to
 * inject the Umami script. Idempotent — repeated calls are no-ops, except
 * the `userOptedIn` flag is re-read so toggling the setting takes effect
 * on the next call (we don't pull the script back out, but we stop sending).
 */
export function initAnalytics(userOptedIn: boolean): void {
  enabled = userOptedIn && isConfigured() && !dntEnabled();
  if (!enabled || scriptLoaded) return;
  if (typeof document === "undefined") return;
  const script = document.createElement("script");
  script.async = true;
  script.defer = true;
  script.src = SCRIPT_URL!;
  script.setAttribute("data-website-id", WEBSITE_ID!);
  // Disable Umami's automatic pageview tracking — we drive it manually from
  // the router so SPA route changes are captured and the path matches the
  // route, not the underlying index.html.
  script.setAttribute("data-auto-track", "false");
  document.head.appendChild(script);
  scriptLoaded = true;
  installErrorHandlers();
}

/** True when analytics are active for this user/build. */
export function isAnalyticsEnabled(): boolean {
  return enabled;
}

/**
 * Fire a custom event. Silently no-ops if analytics aren't active or the
 * Umami script hasn't loaded yet (we don't queue — losing one event during
 * the initial paint is fine for this use case).
 */
export function track(
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!enabled) return;
  if (typeof window === "undefined") return;
  try {
    window.umami?.track(event, data);
  } catch {
    // Never let an analytics failure break a session.
  }
}

/** SPA pageview. Pass the new pathname; query/hash are dropped. */
export function trackPageView(path: string): void {
  if (!enabled) return;
  if (typeof window === "undefined") return;
  try {
    window.umami?.track({ url: path });
  } catch {
    // ignore
  }
}