import { Link } from "react-router-dom";
import { computeStreak, lastSession, totalMinutes } from "@/lib/storage";
import { useHistory } from "@/lib/history";
import { useSettings } from "@/lib/settings";
import {
  PROGRAM,
  PROGRAM_LENGTH,
  getProgramDay,
  isProgramComplete,
  nextProgramDay,
} from "@/lib/program";
import { THEMES, THEME_ORDER, suggestedThemeForHour } from "@/lib/themes";

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMin = (Date.now() - d.getTime()) / 60_000;
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${Math.round(diffMin)}m ago`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h ago`;
  return `${Math.round(diffMin / 60 / 24)}d ago`;
}

function ProgramTile() {
  const { settings } = useSettings();
  const program = settings.program;

  if (!program.enrolled) {
    return (
      <Link
        to="/program"
        className="block mb-4 p-4 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 hover:bg-slate-900/5 dark:hover:bg-white/10 transition"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">{PROGRAM.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Start the {PROGRAM.name} program
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
              A different foundational practice each day for a week.
            </div>
          </div>
          <div className="text-slate-500 dark:text-slate-400">→</div>
        </div>
      </Link>
    );
  }

  const complete = isProgramComplete(program);
  const next = nextProgramDay(program);
  const day = next != null ? getProgramDay(next) : null;
  const doneCount = program.completedDays.length;

  return (
    <Link
      to="/program"
      className="block mb-4 p-4 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 hover:bg-slate-900/5 dark:hover:bg-white/10 transition"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{PROGRAM.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-teal-300/80">
            {complete
              ? `${PROGRAM.name} · complete`
              : `${PROGRAM.name} · day ${next} of ${PROGRAM_LENGTH}`}
          </div>
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {complete
              ? "Seven days finished"
              : (day?.headline ?? "Continue program")}
          </div>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
          {doneCount}/{PROGRAM_LENGTH}
        </div>
      </div>
      <div className="h-1 rounded-full bg-slate-900/10 dark:bg-white/10 mt-3 overflow-hidden">
        <div
          className="h-full bg-teal-400/90 transition-all"
          style={{ width: `${(doneCount / PROGRAM_LENGTH) * 100}%` }}
        />
      </div>
    </Link>
  );
}

function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ThemeSuggestion() {
  const { settings, update } = useSettings();
  const now = new Date();
  const today = todayKey(now);
  if (settings.lastDismissedSuggestionDate === today) return null;
  const { id, period } = suggestedThemeForHour(now.getHours());
  const theme = THEMES[id];
  return (
    <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-teal-400/10 border border-teal-400/30">
      <div className="text-xl" aria-hidden>
        {theme.emoji}
      </div>
      <Link
        to={`/theme/${id}`}
        className="flex-1 text-sm text-slate-800 dark:text-slate-200 min-w-0"
      >
        <span className="font-medium">{period}</span> — try {theme.name}?
      </Link>
      <button
        onClick={() => update({ lastDismissedSuggestionDate: today })}
        aria-label="Dismiss suggestion"
        className="p-1 -m-1 text-slate-500 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10 rounded"
      >
        ✕
      </button>
    </div>
  );
}

function ThemeCard({ themeId }: { themeId: keyof typeof THEMES }) {
  const t = THEMES[themeId];
  return (
    <Link
      to={`/theme/${t.id}`}
      className="group flex flex-col justify-between aspect-square p-5 rounded-3xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 hover:bg-slate-900/5 dark:hover:bg-white/10 active:bg-slate-900/10 dark:active:bg-white/15 transition shadow-lg"
    >
      <div className="text-4xl">{t.emoji}</div>
      <div>
        <div className="text-lg font-medium text-slate-900 dark:text-slate-100">
          {t.name}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">
          {t.tagline}
        </div>
      </div>
    </Link>
  );
}

export function Home() {
  const { history } = useHistory();
  const streak = computeStreak(history);
  const minutes = totalMinutes(history);
  const last = lastSession(history);

  return (
    <div className="min-h-full flex flex-col safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
      <header className="pt-4 pb-6">
        <h1 className="text-3xl font-light tracking-tight">BreathBase</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Foundational breathwork, grounded in science.
        </p>
      </header>

      <ProgramTile />

      <ThemeSuggestion />

      <section
        aria-label="Themes"
        className="grid grid-cols-2 gap-3 mb-4"
      >
        {THEME_ORDER.map((id) => (
          <ThemeCard key={id} themeId={id} />
        ))}
      </section>

      <Link
        to="/library"
        className="block mb-6 p-4 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 hover:bg-slate-900/5 dark:hover:bg-white/10 transition"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">📚</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Library
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
              Every technique, grouped by physiology.
            </div>
          </div>
          <div className="text-slate-500 dark:text-slate-400">→</div>
        </div>
      </Link>

      <Link
        to="/history"
        aria-label="View full history"
        className="grid grid-cols-3 gap-3 text-center hover:opacity-90 transition"
      >
        <div className="p-3 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
          <div className="text-2xl font-light tabular-nums">{streak}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 mt-1">
            day streak
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
          <div className="text-2xl font-light tabular-nums">{minutes}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 mt-1">
            minutes
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
          <div className="text-2xl font-light">
            {last ? formatRelative(last.startedAt) : "—"}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 mt-1">
            last session
          </div>
        </div>
      </Link>

      <div className="mt-auto pt-6 flex justify-center gap-4 text-sm">
        <Link
          to="/history"
          className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline-offset-4 hover:underline"
        >
          History
        </Link>
        <span className="text-slate-600">·</span>
        <Link
          to="/settings"
          className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline-offset-4 hover:underline"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
