import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PROGRAMS,
  PROGRAM_ORDER,
  enrollState,
  getProgram,
  isDayComplete,
  isDayUnlocked,
  isProgramComplete,
  nextProgramDay,
  type Program,
  type ProgramDay,
  type ProgramId,
} from "@/lib/program";
import { findTechnique } from "@/lib/techniques";
import { useSettings } from "@/lib/settings";
import { useAudioEngine } from "@/hooks/useAudioEngine";

function ProgramPicker({
  onPick,
  title,
  subtitle,
}: {
  onPick: (id: ProgramId) => void;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="p-4 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 mb-4">
        <div className="text-xs uppercase tracking-widest text-teal-300/80 mb-1">
          {title}
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {subtitle}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {PROGRAM_ORDER.map((id) => {
          const p = PROGRAMS[id];
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              className="flex items-start gap-3 p-4 rounded-2xl text-left bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 hover:bg-slate-900/5 dark:hover:bg-white/10 transition"
            >
              <div className="text-2xl" aria-hidden>
                {p.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {p.name}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                  {p.tagline} · {p.days.length} days
                </div>
              </div>
              <div className="text-slate-500 dark:text-slate-400 self-center">
                →
              </div>
            </button>
          );
        })}
      </div>
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

function PageHeader({ program }: { program: Program | null }) {
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
          {program?.emoji ?? "🗓️"} Seven-day program
        </div>
        <h1 className="text-2xl font-light">
          {program ? program.name : "Choose your program"}
        </h1>
      </div>
    </header>
  );
}

export function Program() {
  const { settings, update } = useSettings();
  const programState = settings.program;
  // `showPicker` lets enrolled users browse to switch programs.
  const [showPicker, setShowPicker] = useState(false);

  // Not enrolled: show the picker as the primary experience.
  if (!programState.enrolled) {
    return (
      <div className="min-h-full safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
        <PageHeader program={null} />
        <ProgramPicker
          title="Pick a 7-day program"
          subtitle="Each is a curated week of foundational techniques. About five minutes a day."
          onPick={(id) => update({ program: enrollState(id) })}
        />
      </div>
    );
  }

  // User explicitly asked to switch programs.
  if (showPicker) {
    const onPick = (id: ProgramId) => {
      const switching = id !== programState.programId;
      if (
        switching &&
        programState.completedDays.length > 0 &&
        !isProgramComplete(programState)
      ) {
        const ok = confirm(
          `Switching to ${PROGRAMS[id].name} will reset your current progress. Continue?`,
        );
        if (!ok) return;
      }
      update({ program: enrollState(id) });
      setShowPicker(false);
    };
    return (
      <div className="min-h-full safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
        <PageHeader program={null} />
        <ProgramPicker
          title="Choose a different program"
          subtitle="Switching resets progress in the current program."
          onPick={onPick}
        />
        <button
          onClick={() => setShowPicker(false)}
          className="mt-4 w-full px-4 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 border border-slate-900/10 dark:border-white/10 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    );
  }

  const program = getProgram(programState.programId);
  const complete = isProgramComplete(programState);
  const next = nextProgramDay(programState);
  const doneCount = programState.completedDays.length;
  const length = program.days.length;

  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
      <PageHeader program={program} />

      <section className="mb-5 p-4 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-teal-300/80">
            {complete ? "Program complete" : `Day ${next} of ${length}`}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            {doneCount}/{length}
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-teal-400/90 transition-all"
            style={{ width: `${(doneCount / length) * 100}%` }}
          />
        </div>
        {complete && (
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">
            You've finished the {program.name.toLowerCase()} program. Keep
            practicing whichever techniques resonated — or pick a new program
            below.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-3">
        {program.days.map((day) => {
          const state: DayState = isDayComplete(programState, day.day)
            ? "complete"
            : isDayUnlocked(programState, day.day)
              ? "current"
              : "locked";
          return <DayCard key={day.day} day={day} state={state} />;
        })}
      </div>

      <button
        onClick={() => setShowPicker(true)}
        className="mt-5 w-full px-4 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 border border-slate-900/10 dark:border-white/10 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
      >
        {complete ? "Pick another program" : "Switch program"}
      </button>
    </div>
  );
}
