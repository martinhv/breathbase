// Per-user persistence for settings, session history, and derived stats.
// All reads/writes are scoped to the caller-supplied UID.
//
// Two backends, switched by the `localMode` flag in firebase.ts:
//   - Firestore (production): /users/{uid}/profile/settings + sessions/*
//   - localStorage (local mode): JSON blobs under `breathbase:{uid}:*`
//
// Stats (streak, totalMinutes, lastSession) remain pure functions over a
// SessionEntry[] — they don't know about either backend.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db, localMode } from "./firebase";
import { DEFAULT_VOICE_PROFILE } from "./voiceProfiles";
import { DEFAULT_PROGRAM_STATE, type ProgramState } from "./program";

export type SessionEntry = {
  /** Firestore document ID (omitted on write; populated on read). */
  id?: string;
  techniqueId: string;
  techniqueName: string;
  category: string;
  startedAt: string; // ISO 8601
  durationMs: number;
  cyclesCompleted: number;
};

export type Theme = "dark" | "light" | "auto";
export type ReducedMotionPref = "auto" | "on" | "off";
export type Soundscape = "piano" | "ocean" | "rain" | "brown" | "silent";

export type Settings = {
  voiceEnabled: boolean;
  /** Voice profile id; see VOICE_PROFILES in voiceProfiles.ts. */
  voiceProfile: string;
  /** Whisper-style countdown of the remaining seconds in each phase. */
  countdownEnabled: boolean;
  musicEnabled: boolean;
  /** Which audio bed to play during sessions when music is enabled. */
  soundscape: Soundscape;
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
  /** Seven-day guided program state. See lib/program.ts. */
  program: ProgramState;
  /** Daily practice reminder — fires while the tab is open at this time. */
  reminderEnabled: boolean;
  /** "HH:MM" in 24h format. */
  reminderTime: string;
  /** YYYY-MM-DD of the last day the user dismissed the home-screen theme
   *  suggestion. Empty string = never dismissed (so the banner shows). */
  lastDismissedSuggestionDate: string;
  onboarded: boolean;
  disclaimerAcknowledged: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  voiceEnabled: true,
  voiceProfile: DEFAULT_VOICE_PROFILE,
  countdownEnabled: true,
  musicEnabled: true,
  soundscape: "piano",
  chimesEnabled: true,
  hapticsEnabled: true,
  masterVolume: 0.8,
  musicVolume: 0.6,
  chimeVolume: 0.7,
  voiceVolume: 0.8,
  theme: "dark",
  reducedMotion: "auto",
  durationOverrides: {},
  program: DEFAULT_PROGRAM_STATE,
  reminderEnabled: false,
  reminderTime: "08:00",
  lastDismissedSuggestionDate: "",
  onboarded: false,
  disclaimerAcknowledged: false,
};

const HISTORY_LIMIT = 200; // cap reads to last 200 sessions

const settingsDoc = (uid: string) => doc(db, "users", uid, "profile", "settings");
const sessionsCol = (uid: string) => collection(db, "users", uid, "sessions");

// ---------------------------------------------------------------------------
// localStorage adapter (local mode)
// ---------------------------------------------------------------------------
//
// Keys: `breathbase:{uid}:settings` and `breathbase:{uid}:sessions`. Sessions
// are stored as a single JSON array (newest first) — no need for the document
// indexing Firestore provides at this scale.

const LS_NS = "breathbase";
const lsKey = (uid: string, kind: "settings" | "sessions") =>
  `${LS_NS}:${uid}:${kind}`;

const lsReadJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const lsWriteJson = (key: string, value: unknown): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — swallow; data is non-critical.
  }
};

const localLoadSettings = (uid: string): Settings => {
  const data = lsReadJson<Partial<Settings>>(lsKey(uid, "settings"), {});
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    program: { ...DEFAULT_PROGRAM_STATE, ...(data.program ?? {}) },
  };
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const loadSettings = async (uid: string): Promise<Settings> => {
  if (localMode) return localLoadSettings(uid);
  const snap = await getDoc(settingsDoc(uid));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  const data = snap.data() as Partial<Settings>;
  // Defensive merge on nested objects so a stored doc that predates a new
  // field (e.g. program.programId) still picks up defaults for what's missing.
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    program: { ...DEFAULT_PROGRAM_STATE, ...(data.program ?? {}) },
  };
};

export const saveSettings = async (uid: string, s: Settings): Promise<void> => {
  if (localMode) {
    lsWriteJson(lsKey(uid, "settings"), s);
    return;
  }
  await setDoc(settingsDoc(uid), s, { merge: true });
};

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export const loadHistory = async (uid: string): Promise<SessionEntry[]> => {
  if (localMode) {
    const list = lsReadJson<SessionEntry[]>(lsKey(uid, "sessions"), []);
    return list
      .slice()
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, HISTORY_LIMIT);
  }
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
): Promise<void> => {
  if (localMode) {
    const list = lsReadJson<SessionEntry[]>(lsKey(uid, "sessions"), []);
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Cap to 1000 to bound localStorage growth (well above the read cap).
    const next = [{ id, ...entry }, ...list].slice(0, 1000);
    lsWriteJson(lsKey(uid, "sessions"), next);
    return;
  }
  await setDoc(doc(sessionsCol(uid)), entry);
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

// ---------------------------------------------------------------------------
// Export + delete (GDPR-style data portability and erasure)
// ---------------------------------------------------------------------------

/** Snapshot of everything we have for a user. Returned as plain JSON. */
export const exportAllUserData = async (
  uid: string,
): Promise<{
  exportedAt: string;
  uid: string;
  settings: Settings | null;
  sessions: SessionEntry[];
}> => {
  if (localMode) {
    return {
      exportedAt: new Date().toISOString(),
      uid,
      settings: localLoadSettings(uid),
      sessions: lsReadJson<SessionEntry[]>(lsKey(uid, "sessions"), []),
    };
  }
  const [settingsSnap, sessionsSnap] = await Promise.all([
    getDoc(settingsDoc(uid)),
    getDocs(
      query(sessionsCol(uid), orderBy("startedAt", "desc"), limit(10_000)),
    ),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    uid,
    settings: settingsSnap.exists() ? (settingsSnap.data() as Settings) : null,
    sessions: sessionsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SessionEntry, "id">),
    })),
  };
};

/**
 * Delete every Firestore document under users/{uid}. The Firebase Auth user
 * record is handled separately (see auth.tsx's deleteAccount) because that
 * requires a recent re-auth on the client SDK. In local mode this just
 * clears the corresponding localStorage entries.
 */
export const deleteAllUserData = async (uid: string): Promise<void> => {
  if (localMode) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(lsKey(uid, "settings"));
      window.localStorage.removeItem(lsKey(uid, "sessions"));
    } catch {
      /* noop */
    }
    return;
  }
  const sessionsSnap = await getDocs(sessionsCol(uid));
  if (!sessionsSnap.empty) {
    // writeBatch caps at 500 ops; chunk if a user somehow has >500 sessions.
    let batch = writeBatch(db);
    let count = 0;
    for (const d of sessionsSnap.docs) {
      batch.delete(d.ref);
      count += 1;
      if (count >= 500) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
  }
  await deleteDoc(settingsDoc(uid)).catch(() => {
    // The settings doc may not exist yet for brand-new users; treat as no-op.
  });
};
