// Firestore-backed persistence for settings, session history, and derived
// streak/total-minutes stats. All reads/writes are scoped to the currently
// signed-in user's UID, so the caller must pass `uid`.
//
//   /users/{uid}/profile/settings          ← single doc, Settings shape
//   /users/{uid}/sessions/{auto-id}        ← one doc per completed session
//
// Stats (streak, totalMinutes, lastSession) remain pure functions over a
// SessionEntry[] — they don't know about Firestore.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_VOICE_PROFILE } from "./voiceProfiles";

export type Mood = -2 | -1 | 0 | 1 | 2;

export type SessionEntry = {
  /** Firestore document ID (omitted on write; populated on read). */
  id?: string;
  techniqueId: string;
  techniqueName: string;
  category: string;
  startedAt: string; // ISO 8601
  durationMs: number;
  cyclesCompleted: number;
  mood?: Mood;
};

export type Theme = "dark" | "light" | "auto";
export type ReducedMotionPref = "auto" | "on" | "off";

export type Settings = {
  voiceEnabled: boolean;
  /** Voice profile id; see VOICE_PROFILES in voiceProfiles.ts. */
  voiceProfile: string;
  musicEnabled: boolean;
  chimesEnabled: boolean;
  hapticsEnabled: boolean;
  /** Linear 0..1 multipliers. */
  masterVolume: number;
  musicVolume: number;
  chimeVolume: number;
  voiceVolume: number;
  theme: Theme;
  reducedMotion: ReducedMotionPref;
  /** Per-technique duration overrides in minutes, keyed by technique id. */
  durationOverrides: Record<string, number>;
  onboarded: boolean;
  disclaimerAcknowledged: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  voiceEnabled: true,
  voiceProfile: DEFAULT_VOICE_PROFILE,
  musicEnabled: true,
  chimesEnabled: true,
  hapticsEnabled: true,
  masterVolume: 0.8,
  musicVolume: 0.6,
  chimeVolume: 0.7,
  voiceVolume: 0.8,
  theme: "dark",
  reducedMotion: "auto",
  durationOverrides: {},
  onboarded: false,
  disclaimerAcknowledged: false,
};

const HISTORY_LIMIT = 200; // cap reads to last 200 sessions

const settingsDoc = (uid: string) => doc(db, "users", uid, "profile", "settings");
const sessionsCol = (uid: string) => collection(db, "users", uid, "sessions");

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const loadSettings = async (uid: string): Promise<Settings> => {
  const snap = await getDoc(settingsDoc(uid));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<Settings>) };
};

export const saveSettings = async (uid: string, s: Settings): Promise<void> => {
  await setDoc(settingsDoc(uid), s, { merge: true });
};

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export const loadHistory = async (uid: string): Promise<SessionEntry[]> => {
  const q = query(
    sessionsCol(uid),
    orderBy("startedAt", "desc"),
    limit(HISTORY_LIMIT),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SessionEntry, "id">) }));
};

export const appendHistory = async (
  uid: string,
  entry: Omit<SessionEntry, "id">,
): Promise<string> => {
  // Use a client-generated ID so callers can immediately reference the entry
  // (e.g. to attach mood after the check-in) without a round-trip.
  const ref = doc(sessionsCol(uid));
  await setDoc(ref, entry);
  return ref.id;
};

/** Attach a mood rating to an existing session entry. */
export const updateMood = async (
  uid: string,
  sessionId: string,
  mood: Mood,
): Promise<void> => {
  await updateDoc(doc(sessionsCol(uid), sessionId), { mood });
};

// ---------------------------------------------------------------------------
// Derived stats (pure)
// ---------------------------------------------------------------------------

const toUTCDateKey = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
};

/** Consecutive UTC days, counting back from today, with ≥1 session. */
export const computeStreak = (history: SessionEntry[]): number => {
  if (history.length === 0) return 0;
  const days = new Set(history.map((e) => toUTCDateKey(e.startedAt)));
  let streak = 0;
  const now = new Date();
  const todayKey = toUTCDateKey(now.toISOString());
  const yesterday = new Date(now);
  yesterday.setUTCDate(now.getUTCDate() - 1);
  const yesterdayKey = toUTCDateKey(yesterday.toISOString());
  const cursor = new Date(now);
  if (!days.has(todayKey)) {
    if (!days.has(yesterdayKey)) return 0;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (days.has(toUTCDateKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
};

export const totalMinutes = (history: SessionEntry[]): number =>
  Math.round(history.reduce((sum, e) => sum + e.durationMs, 0) / 60_000);

export const lastSession = (history: SessionEntry[]): SessionEntry | null =>
  history[0] ?? null;
