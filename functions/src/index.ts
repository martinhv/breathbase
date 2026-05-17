// Cloud Function for daily reminder push notifications.
//
// Runs every 5 minutes via Cloud Scheduler. Reads all device docs across
// users, computes each device's local time, and sends an FCM push to any
// device whose reminder time falls within the current 5-min slot.
//
// Schema (set by the client in src/lib/push.ts):
//   /users/{uid}/devices/{fcmToken} = {
//     fcmToken: string;
//     reminderTime: string;     // "HH:MM" in 24h local time
//     reminderTimezone: string; // IANA, e.g. "Europe/Berlin"
//     updatedAt: Timestamp;
//   }
//
// Deploying:
//   cd functions && npm install
//   firebase deploy --only functions
//
// The Blaze (pay-as-you-go) plan is required to deploy functions, but with
// a 5-minute schedule for a small user base, this fits inside the free
// tier (2M invocations/month).

import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();

const SCHEDULE_MINUTES = 5;

/** Current hour:minute in the given IANA timezone, or null if invalid. */
function currentLocalTime(timezone: string): { hour: number; minute: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    let hour = NaN;
    let minute = NaN;
    for (const p of parts) {
      if (p.type === "hour") hour = Number(p.value);
      if (p.type === "minute") minute = Number(p.value);
    }
    // Intl can emit "24" instead of "00" for midnight in some locales.
    if (hour === 24) hour = 0;
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return { hour, minute };
  } catch {
    return null;
  }
}

/** Parses "HH:MM". Returns null if invalid. */
function parseTime(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** True if `reminder` falls within the last SCHEDULE_MINUTES of `now`.
 *  Handles minute-wrap and hour-wrap. */
function isDue(
  reminder: { hour: number; minute: number },
  now: { hour: number; minute: number },
): boolean {
  const reminderMin = reminder.hour * 60 + reminder.minute;
  const nowMin = now.hour * 60 + now.minute;
  // Window: (nowMin - SCHEDULE_MINUTES, nowMin], modulo 1440.
  for (let i = 0; i < SCHEDULE_MINUTES; i++) {
    const slot = (nowMin - i + 1440) % 1440;
    if (slot === reminderMin) return true;
  }
  return false;
}

interface DeviceDoc {
  fcmToken?: string;
  reminderTime?: string;
  reminderTimezone?: string;
}

export const sendReminders = onSchedule(
  {
    schedule: `every ${SCHEDULE_MINUTES} minutes`,
    timeZone: "UTC",
    retryCount: 0,
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();

    // Collection-group query reads every /users/*/devices/* doc in one pass.
    const snap = await db.collectionGroup("devices").get();
    if (snap.empty) {
      console.info("[sendReminders] no devices registered");
      return;
    }

    const dueTokens: string[] = [];
    const staleRefs: FirebaseFirestore.DocumentReference[] = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as DeviceDoc;
      if (!data.fcmToken || !data.reminderTime || !data.reminderTimezone) continue;
      const reminder = parseTime(data.reminderTime);
      if (!reminder) continue;
      const localNow = currentLocalTime(data.reminderTimezone);
      if (!localNow) continue;
      if (isDue(reminder, localNow)) {
        dueTokens.push(data.fcmToken);
      }
    }

    if (dueTokens.length === 0) {
      console.info("[sendReminders] nothing due this slot");
      return;
    }

    console.info(`[sendReminders] sending to ${dueTokens.length} device(s)`);

    // sendEachForMulticast caps at 500 per call; chunk if needed.
    for (let i = 0; i < dueTokens.length; i += 500) {
      const batch = dueTokens.slice(i, i + 500);
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: {
          title: "Time to practice",
          body: "A few minutes of breathwork.",
        },
        webpush: {
          fcmOptions: { link: "/" },
          notification: {
            icon: "/icon-512.svg",
            tag: "breathbase-reminder",
          },
        },
      });

      // Collect tokens FCM tells us are dead (uninstalled app, etc.) and
      // delete their device docs.
      result.responses.forEach((r, idx) => {
        if (r.success) return;
        const code = r.error?.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          const token = batch[idx];
          const stale = snap.docs.find(
            (d) => (d.data() as DeviceDoc).fcmToken === token,
          );
          if (stale) staleRefs.push(stale.ref);
        } else if (r.error) {
          console.warn(
            `[sendReminders] send failed for token: ${code} — ${r.error.message}`,
          );
        }
      });
    }

    if (staleRefs.length > 0) {
      console.info(`[sendReminders] cleaning ${staleRefs.length} stale token(s)`);
      const writer = db.bulkWriter();
      for (const ref of staleRefs) writer.delete(ref);
      await writer.close();
    }
  },
);
