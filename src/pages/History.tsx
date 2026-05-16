import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  computeStreak,
  loadHistory,
  totalMinutes,
  type SessionEntry,
} from "@/lib/storage";
import { CATEGORIES, type Category } from "@/lib/techniques";

type Filter = "all" | Category;

function groupByDay(history: SessionEntry[]): Array<[string, SessionEntry[]]> {
  const groups = new Map<string, SessionEntry[]>();
  for (const e of history) {
    const day = new Date(e.startedAt).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const list = groups.get(day) ?? [];
    list.push(e);
    groups.set(day, list);
  }
  return Array.from(groups.entries());
}

export function History() {
  const { user } = useAuth();
  const [history, setHistory] = useState<SessionEntry[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadHistory(user.uid)
      .then((h) => {
        if (!cancelled) setHistory(h);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load history:", e);
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const allCategories: Filter[] = ["all", "downregulate", "upregulate", "balance", "focus"];

  const filtered = (history ?? []).filter(
    (e) => filter === "all" || e.category === filter,
  );
  const streak = history ? computeStreak(history) : 0;
  const minutes = history ? totalMinutes(history) : 0;
  const sessions = history?.length ?? 0;
  const grouped = groupByDay(filtered);

  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-8 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back"
          className="p-2 -ml-2 rounded-full hover:bg-white/5 text-slate-400"
        >
          ←
        </Link>
        <h1 className="text-2xl font-light">History</h1>
      </header>

      <section className="grid grid-cols-3 gap-3 text-center mb-6">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl font-light tabular-nums">{streak}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
            day streak
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl font-light tabular-nums">{minutes}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
            minutes
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl font-light tabular-nums">{sessions}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
            sessions
          </div>
        </div>
      </section>

      <section
        className="flex items-center gap-1.5 flex-wrap mb-4"
        role="radiogroup"
        aria-label="Filter by category"
      >
        {allCategories.map((c) => {
          const active = filter === c;
          const label = c === "all" ? "All" : CATEGORIES[c].title;
          return (
            <button
              key={c}
              role="radio"
              aria-checked={active}
              onClick={() => setFilter(c)}
              className={`px-3 py-1 rounded-lg text-xs transition ${
                active
                  ? "bg-teal-400/90 text-ink-950 font-medium"
                  : "border border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </section>

      {history === null ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">
          {filter === "all"
            ? "No sessions yet."
            : `No ${CATEGORIES[filter as Category].title.toLowerCase()} sessions yet.`}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([day, entries]) => (
            <div key={day}>
              <h2 className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                {day}
              </h2>
              <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
                {entries.map((h) => (
                  <div
                    key={h.id ?? h.startedAt}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div>
                      <div className="text-slate-200">{h.techniqueName}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(h.startedAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        <span className="capitalize">{h.category}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 tabular-nums">
                      {Math.round(h.durationMs / 60000)}m
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
