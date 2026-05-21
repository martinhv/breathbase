// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Daily practice reminders.
//
// Honest scope: this module schedules a one-shot setTimeout that fires while
// the Sough tab is alive. If the user closes the tab, no notification.
// True background push (when the app is closed) requires Web Push + a server
// to schedule sends — see the README's "Future: push" section, or wire up
// FCM via the existing Firebase project.
//
// What this gets us today:
//   - User picks a daily reminder time in Settings.
//   - When the tab is open at that time, a system notification fires.
//   - If the user installs the PWA and keeps it in the home-screen rotation,
//     iOS / Android often keep the tab in the background long enough to fire.

let activeTimer: number | null = null;

export const REMINDER_TAG = "sough-reminder";

export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotificationPermission {
  if (!isSupported()) return "denied";
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Parses "HH:MM" (24h). Returns null if invalid. */
function parseTime(time: string): { hours: number; minutes: number } | null {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { hours: h, minutes: min };
}

/** Next Date the reminder should fire at. If today's time has passed, picks
 *  tomorrow. Exported for testing. */
export function nextReminderAt(
  time: string,
  now: Date = new Date(),
): Date | null {
  const parsed = parseTime(time);
  if (!parsed) return null;
  const next = new Date(now);
  next.setHours(parsed.hours, parsed.minutes, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function show(): void {
  if (!isSupported() || Notification.permission !== "granted") return;
  try {
    new Notification("Time to practice", {
      body: "A few minutes of breathwork.",
      icon: "/icon-512.svg",
      tag: REMINDER_TAG,
    });
  } catch {
    // Some browsers throw when a Notification is constructed from a hidden
    // page — silently ignore; the next open tab will reschedule.
  }
}

export function cancelReminder(): void {
  if (activeTimer !== null) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
}

/** Schedule the next reminder. Cancels any pending timer first.
 *  Re-arms itself recursively each day after firing. */
export function scheduleReminder(time: string): void {
  cancelReminder();
  if (!isSupported() || Notification.permission !== "granted") return;
  const at = nextReminderAt(time);
  if (!at) return;
  const delay = Math.max(0, at.getTime() - Date.now());
  // setTimeout caps at ~24.8 days; we schedule at most 24h ahead so safe.
  activeTimer = window.setTimeout(() => {
    show();
    // After firing, queue tomorrow's reminder.
    scheduleReminder(time);
  }, delay);
}