// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link, useNavigate } from "react-router-dom";
import {
  PROGRAM,
  PROGRAM_LENGTH,
  enrollState,
  isDayComplete,
  isDayUnlocked,
  isProgramComplete,
  nextProgramDay,
  type ProgramDay,
} from "@/lib/program";
import { findTechnique } from "@/lib/techniques";
import { useSettings } from "@/lib/settings";
import { useAudioEngine } from "@/hooks/useAudioEngine";

function PreEnroll() {
  const { update } = useSettings();
  return (
    <div className="p-5 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
      <div className="text-xs uppercase tracking-widest text-teal-300/80 mb-1">
        Foundational, in seven days
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
        A different foundational practice each day. Slow breath, resonance,
        holds, long exhales, focus. About five minutes a day for a week.
      </p>
      <button
        onClick={() => update({ program: enrollState() })}
        className="px-5 py-2.5 rounded-xl bg-teal-400/90 text-ink-950 text-sm font-medium hover:bg-teal-300"
      >
        Begin the program
      </button>
    </div>
  );
}

type DayState = "complete" | "current" | "locked";

function DayCard({ day, state }: { day: ProgramDay; state: DayState }) {
  const navigate = useNavigate();
  const audio = useAudioEngine();
  const technique = findTechnique(day.techniqueId);
  const isCurrent = state === "current";
  const isComplete = state === "complete";
  const isLocked = state === "locked";

  const badge = isComplete ? "✓" : isLocked ? "🔒" : day.day;

  const begin = async () => {
    if (!isCurrent || !technique) return;
    await audio.unlock();
    navigate(`/session/${day.techniqueId}?program=${day.day}`);
  };

  return (
    <article
      className={`p-4 rounded-2xl border transition ${
        isCurrent
          ? "bg-slate-900/[0.04] dark:bg-white/5 border-teal-400/40"
          : "bg-slate-900/[0.02] dark:bg-white/[0.03] border-slate-900/10 dark:border-white/10"
      } ${isLocked ? "opacity-50" : ""}`}
    >
      <header className="flex items-center gap-3 mb-2">
        <div
          aria-hidden
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm tabular-nums font-medium ${
            isComplete
              ? "bg-teal-400/90 text-ink-950"
              : isCurrent
                ? "bg-teal-400/20 text-teal-300 border border-teal-400/50"
                : "bg-slate-900/5 dark:bg-white/10 text-slate-600 dark:text-slate-400"
          }`}
        >
          {badge}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Day {day.day} · {day.durationMin}m
          </div>
          <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 truncate">
            {day.headline}
          </h3>
        </div>
      </header>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        {technique?.name ?? day.techniqueId} — {day.why}
      </p>
      {isCurrent && technique && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={begin}
            className="px-4 py-2 rounded-xl bg-teal-400/90 text-ink-950 text-sm font-medium hover:bg-teal-300"
          >
            Begin · {day.durationMin}m
          </button>
        </div>
      )}
    </article>
  );
}

function PageHeader() {
  return (
    <header className="pt-4 pb-5 flex items-center gap-3">
      <Link
        to="/"
        aria-label="Back"
        className="p-2 -ml-2 rounded-full hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
      >
        ←
      </Link>
      <div>
        <div className="text-xs uppercase tracking-widest text-slate-500">
          {PROGRAM.emoji} Seven-day program
        </div>
        <h1 className="text-2xl font-light">{PROGRAM.name}</h1>
      </div>
    </header>
  );
}

export function Program() {
  const { settings } = useSettings();
  const programState = settings.program;

  if (!programState.enrolled) {
    return (
      <div className="min-h-full safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
        <PageHeader />
        <PreEnroll />
      </div>
    );
  }

  const complete = isProgramComplete(programState);
  const next = nextProgramDay(programState);
  const doneCount = programState.completedDays.length;

  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
      <PageHeader />

      <section className="mb-5 p-4 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-teal-300/80">
            {complete ? "Program complete" : `Day ${next} of ${PROGRAM_LENGTH}`}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            {doneCount}/{PROGRAM_LENGTH}
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-teal-400/90 transition-all"
            style={{ width: `${(doneCount / PROGRAM_LENGTH) * 100}%` }}
          />
        </div>
        {complete && (
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">
            You've worked through the foundations. Keep practicing whichever
            techniques resonated — themes on the home screen are a good way
            to pick one for the moment.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-3">
        {PROGRAM.days.map((day) => {
          const state: DayState = isDayComplete(programState, day.day)
            ? "complete"
            : isDayUnlocked(programState, day.day)
              ? "current"
              : "locked";
          return <DayCard key={day.day} day={day} state={state} />;
        })}
      </div>
    </div>
  );
}