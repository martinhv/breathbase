// LocalStorage-backed persistence for settings, session history, and derived
// streak/total-minutes stats. Keep all reads/writes funneled through here so
// schema migrations only need to touch one file.

export type Mood = -2 | -1 | 0 | 1 | 2;

export type SessionEntry = {
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
  voiceURI: string | null;
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
  voiceURI: null,
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

const SETTINGS_KEY = "bb.settings.v1";
const HISTORY_KEY = "bb.history.v1";
const HISTORY_LIMIT = 200; // keep last 200 sessions; surface last 30 in UI

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const loadSettings = (): Settings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const stored = safeParse<Partial<Settings>>(
    window.localStorage.getItem(SETTINGS_KEY),
    {},
  );
  return { ...DEFAULT_SETTINGS, ...stored };
};

export const saveSettings = (s: Settings): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
};

export const loadHistory = (): SessionEntry[] => {
  if (typeof window === "undefined") return [];
  return safeParse<SessionEntry[]>(
    window.localStorage.getItem(HISTORY_KEY),
    [],
  );
};

export const appendHistory = (entry: SessionEntry): SessionEntry[] => {
  const next = [entry, ...loadHistory()].slice(0, HISTORY_LIMIT);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }
  return next;
};

/** Update the most-recent history entry in place (used by the mood check-in). */
export const updateLatestMood = (mood: Mood): void => {
  const history = loadHistory();
  if (history.length === 0) return;
  history[0] = { ...history[0], mood };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
};

// ---------------------------------------------------------------------------
// Derived stats
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
  // Walk back day by day. Allow the streak to start either today or
  // yesterday (so missing today before evening doesn't reset it).
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
