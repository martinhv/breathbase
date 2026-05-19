// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Firebase Cloud Messaging client wrapper.
//
// When push is configured (VITE_FIREBASE_VAPID_KEY is set AND we're not in
// local mode), enabling reminders registers an FCM token in Firestore so the
// scheduled Cloud Function can deliver notifications when the app is closed.
//
// When push is NOT configured, `lib/notifications.ts` falls back to a
// client-side setTimeout that only fires while a tab is open.

import { getMessaging, getToken, deleteToken } from "firebase/messaging";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, firebaseApp, isLocalUid, localMode } from "./firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as
  | string
  | undefined;

/** Push is "available" when we have Firebase + a VAPID key + browser support.
 *  Callers fall back to the client-side setTimeout when this is false. */
export function isPushAvailable(): boolean {
  if (localMode) return false;
  if (!VAPID_KEY) return false;
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  return true;
}

/** Best-effort timezone for this device. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Register the firebase-messaging-sw.js service worker. Idempotent. */
async function ensureMessagingSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration(
      "/firebase-cloud-messaging-push-scope",
    );
    if (existing) return existing;
    return await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/firebase-cloud-messaging-push-scope" },
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[push] SW registration failed:", e);
    return null;
  }
}

/** Request an FCM token. Returns null on failure (no VAPID key, permission
 *  denied, SW registration failed, etc.). */
export async function obtainPushToken(): Promise<string | null> {
  if (!isPushAvailable() || !VAPID_KEY) return null;
  const sw = await ensureMessagingSW();
  if (!sw) return null;
  try {
    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: sw,
    });
    return token || null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[push] getToken failed:", e);
    return null;
  }
}

type DeviceDoc = {
  fcmToken: string;
  reminderTime: string; // "HH:MM" local clock time
  reminderTimezone: string; // IANA, e.g. "Europe/Berlin"
};

/** Write the device registration to Firestore. Path:
 *  `/users/{uid}/devices/{token}`. The Cloud Function reads from this
 *  collection group on its schedule. */
export async function registerDevice(
  uid: string,
  data: DeviceDoc,
): Promise<void> {
  if (localMode || isLocalUid(uid)) return;
  await setDoc(
    doc(db, "users", uid, "devices", data.fcmToken),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Remove the device registration (e.g. user turns reminders off). Failure
 *  is logged but not thrown — best-effort cleanup. */
export async function unregisterDevice(
  uid: string,
  token: string,
): Promise<void> {
  if (localMode || isLocalUid(uid)) return;
  try {
    await deleteDoc(doc(db, "users", uid, "devices", token));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[push] unregister failed:", e);
  }
  try {
    const messaging = getMessaging(firebaseApp);
    await deleteToken(messaging);
  } catch {
    /* token may already be gone */
  }
}