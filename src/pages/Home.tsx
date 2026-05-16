import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CategoryCard } from "@/components/CategoryCard";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/techniques";
import {
  computeStreak,
  lastSession,
  loadHistory,
  totalMinutes,
  type SessionEntry,
} from "@/lib/storage";
import { useAuth } from "@/lib/auth";

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMin = (Date.now() - d.getTime()) / 60_000;
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${Math.round(diffMin)}m ago`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h ago`;
  return `${Math.round(diffMin / 60 / 24)}d ago`;
}

export function Home() {
  const { user } = useAuth();
  const [history, setHistory] = useState<SessionEntry[]>([]);
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
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  const streak = computeStreak(history);
  const minutes = totalMinutes(history);
  const last = lastSession(history);

  return (
    <div className="min-h-full flex flex-col safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
      <header className="pt-4 pb-6">
        <h1 className="text-3xl font-light tracking-tight">BreathBase</h1>
        <p className="text-sm text-slate-400 mt-1">
          Foundational breathwork, grounded in science.
        </p>
      </header>

      <section className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="text-xs uppercase tracking-widest text-teal-300/80 mb-1">
          Foundational level
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          You're building awareness, relaxation, and basic breath control.
          Start with 5 minutes a day — consistency matters more than duration.
        </p>
      </section>

      <section
        aria-label="Categories"
        className="grid grid-cols-2 gap-3 mb-6"
      >
        {CATEGORY_ORDER.map((id) => (
          <CategoryCard key={id} meta={CATEGORIES[id]} />
        ))}
      </section>

      <Link
        to="/history"
        aria-label="View full history"
        className="grid grid-cols-3 gap-3 text-center hover:opacity-90 transition"
      >
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
          <div className="text-2xl font-light">
            {last ? formatRelative(last.startedAt) : "—"}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
            last session
          </div>
        </div>
      </Link>

      <div className="mt-auto pt-6 flex justify-center gap-4 text-sm">
        <Link
          to="/history"
          className="text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
        >
          History
        </Link>
        <span className="text-slate-600">·</span>
        <Link
          to="/settings"
          className="text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
