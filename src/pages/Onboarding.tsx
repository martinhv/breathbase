import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/settings";
import {
  enrollState,
  PROGRAM_FOR_GOAL,
  type ProgramGoal,
} from "@/lib/program";

type IntroSlide = {
  kind: "intro";
  icon: string;
  title: string;
  body: string;
};
type GoalSlide = { kind: "goal" };
type Slide = IntroSlide | GoalSlide;

const SLIDES: Slide[] = [
  {
    kind: "intro",
    icon: "🌬️",
    title: "Welcome to BreathBase",
    body: "Breathwork rooted in modern science.",
  },
  {
    kind: "intro",
    icon: "🧭",
    title: "Four states, four tools",
    body: "Downregulate, upregulate, balance, and focus — pick the one that fits the moment.",
  },
  {
    kind: "intro",
    icon: "🌱",
    title: "Start small",
    body: "Five minutes a day. Consistency matters more than duration.",
  },
  { kind: "goal" },
];

const GOAL_OPTIONS: {
  id: ProgramGoal;
  emoji: string;
  label: string;
  description: string;
}[] = [
  {
    id: "curiosity",
    emoji: "🗓️",
    label: "Just curious",
    description: "A tour of the basics — one foundational technique each day.",
  },
  {
    id: "sleep",
    emoji: "🌙",
    label: "Sleep better",
    description: "Slow breath and long exhales to wind the body down.",
  },
  {
    id: "stress",
    emoji: "🌀",
    label: "Manage stress",
    description: "Quick tools you can use the moment things get hard.",
  },
  {
    id: "focus",
    emoji: "🎯",
    label: "Sharpen focus",
    description: "Symmetric rhythms that train sustained attention.",
  },
  {
    id: "energy",
    emoji: "⚡",
    label: "More energy",
    description: "A gentle ramp into activating breathwork.",
  },
];

export function Onboarding() {
  const [i, setI] = useState(0);
  const [goal, setGoal] = useState<ProgramGoal>("curiosity");
  const navigate = useNavigate();
  const { update } = useSettings();
  const isLast = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  const finish = (chosen: ProgramGoal = goal) => {
    update({
      onboarded: true,
      program: enrollState(PROGRAM_FOR_GOAL[chosen]),
    });
    navigate("/", { replace: true });
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setI((v) => v + 1);
    }
  };
  // Skip from any slide defaults to curiosity (foundations).
  const skip = () => finish("curiosity");

  return (
    <div className="min-h-full flex flex-col safe-top safe-bottom px-6 pb-8 max-w-md mx-auto">
      <div className="flex justify-end pt-2">
        <button
          onClick={skip}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full flex flex-col items-center gap-5"
          >
            {slide.kind === "intro" ? (
              <>
                <div className="text-6xl">{slide.icon}</div>
                <h1 className="text-3xl font-light">{slide.title}</h1>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed max-w-xs">
                  {slide.body}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-light">
                  Where would you like to start?
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs">
                  We'll line up a 7-day program to match. You can change it
                  later.
                </p>
                <div
                  className="w-full flex flex-col gap-2 mt-2 text-left"
                  role="radiogroup"
                  aria-label="Goal"
                >
                  {GOAL_OPTIONS.map((g) => {
                    const active = g.id === goal;
                    return (
                      <button
                        key={g.id}
                        role="radio"
                        aria-checked={active}
                        onClick={() => setGoal(g.id)}
                        className={`flex items-start gap-3 p-3 rounded-2xl border transition ${
                          active
                            ? "bg-slate-900/[0.04] dark:bg-white/5 border-teal-400/60"
                            : "bg-slate-900/[0.02] dark:bg-white/[0.03] border-slate-900/10 dark:border-white/10 hover:bg-slate-900/5 dark:hover:bg-white/10"
                        }`}
                      >
                        <div className="text-2xl" aria-hidden>
                          {g.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {g.label}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                            {g.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {SLIDES.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-8 bg-teal-400" : "w-1.5 bg-slate-900/10 dark:bg-white/20"
            }`}
          />
        ))}
      </div>

      <button
        onClick={next}
        className="w-full px-5 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300"
      >
        {isLast ? "Begin" : "Next"}
      </button>
    </div>
  );
}
