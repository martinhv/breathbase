// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Shared history state. Loaded once per signed-in user and shared across
// pages via context, so Home, History, Theme, Category, and Settings can
// all read the same data without each page making its own Firestore round-
// trip.
//
// Session.tsx calls `reload()` after writing a new entry so consumers see
// the freshly-completed session immediately.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadHistory, type SessionEntry } from "./storage";
import { useAuth } from "./auth";

/** Aggregated per-technique stats derived from the full history. */
export type TechniqueStats = {
  count: number;
  totalMs: number;
  /** ISO timestamp of the most recent session of this technique. */
  lastAt: string | null;
};

export type HistorySummary = Record<string, TechniqueStats>;

export const EMPTY_STATS: TechniqueStats = {
  count: 0,
  totalMs: 0,
  lastAt: null,
};

export function computeSummary(history: SessionEntry[]): HistorySummary {
  const out: HistorySummary = {};
  for (const e of history) {
    const cur = out[e.techniqueId] ?? { count: 0, totalMs: 0, lastAt: null };
    cur.count += 1;
    cur.totalMs += e.durationMs;
    if (!cur.lastAt || e.startedAt > cur.lastAt) cur.lastAt = e.startedAt;
    out[e.techniqueId] = cur;
  }
  return out;
}

type HistoryContextValue = {
  history: SessionEntry[];
  loading: boolean;
  summary: HistorySummary;
  reload: () => Promise<void>;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const h = await loadHistory(user.uid);
      setHistory(h);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load history:", e);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => computeSummary(history), [history]);

  const value = useMemo(
    () => ({ history, loading, summary, reload: load }),
    [history, loading, summary, load],
  );

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}