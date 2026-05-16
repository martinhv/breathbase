import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/settings";

const SLIDES = [
  {
    icon: "🌬️",
    title: "Welcome to BreathBase",
    body: "Breathwork rooted in modern science.",
  },
  {
    icon: "🧭",
    title: "Four states, four tools",
    body: "Downregulate, upregulate, balance, and focus — pick the one that fits the moment.",
  },
  {
    icon: "🌱",
    title: "Start small",
    body: "Five minutes a day. Consistency matters more than duration.",
  },
];

export function Onboarding() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const { update } = useSettings();
  const isLast = i === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      update({ onboarded: true });
      navigate("/", { replace: true });
    } else {
      setI((v) => v + 1);
    }
  };
  const skip = () => {
    update({ onboarded: true });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-full flex flex-col safe-top safe-bottom px-6 pb-8 max-w-md mx-auto">
      <div className="flex justify-end pt-2">
        <button
          onClick={skip}
          className="text-sm text-slate-400 hover:text-slate-200"
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
            className="flex flex-col items-center gap-5"
          >
            <div className="text-6xl">{SLIDES[i].icon}</div>
            <h1 className="text-3xl font-light">{SLIDES[i].title}</h1>
            <p className="text-slate-300 leading-relaxed max-w-xs">
              {SLIDES[i].body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {SLIDES.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-8 bg-teal-400" : "w-1.5 bg-white/20"
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
