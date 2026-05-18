import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/settings";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { enrollState } from "@/lib/program";
import { track } from "@/lib/analytics";

const SLIDES = [
  {
    icon: "🌬️",
    title: "Welcome to BreathBase",
    body: "Breathwork rooted in modern science.",
  },
  {
    icon: "🧭",
    title: "Find what you need",
    body: "Themes on the home screen group techniques by goal — sleep, stress, focus, energy. Or browse the full library by physiology.",
  },
  {
    icon: "🌱",
    title: "Start small",
    body: "Five minutes a day. Consistency matters more than duration.",
  },
  {
    icon: "🗓️",
    title: "A seven-day start",
    body: "We've laid out a one-week program — a different foundational practice each day. Pick it up on the home screen whenever you're ready.",
  },
];

export function Onboarding() {
  const [i, setI] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const navigate = useNavigate();
  const { update } = useSettings();
  const reducedMotion = useReducedMotion();
  const audio = useAudioEngine();
  const audioStarted = useRef(false);
  const isLast = i === SLIDES.length - 1;
  const hasVideoBg = i === 0;

  // Fire-and-forget audio unlock from the same task as the user gesture.
  // startMusic() internally respects settings.musicEnabled, so we don't
  // duplicate that check here. Synchronous so the gesture activation is
  // still hot when Tone.start() calls AudioContext.resume() under the hood.
  const startAudio = () => {
    if (audioStarted.current) return;
    audioStarted.current = true;
    void audio.unlock().then(() => audio.startMusic());
  };

  const finish = (skipped: boolean) => {
    if (audio.isMusicPlaying()) audio.fadeOutMusic(1.5);
    update({ onboarded: true, program: enrollState() });
    track("onboarding_complete", { skipped });
    navigate("/", { replace: true });
  };

  const next = () => {
    startAudio();
    isLast ? finish(false) : setI((v) => v + 1);
  };

  const skip = () => {
    finish(true);
  };

  return (
    // fixed inset-0 so we own the full viewport — avoids the body's
    // background-attachment:fixed gradient painting over any child layers.
    <div className="fixed inset-0 flex flex-col">

      {/* ── Background layers (slide 0 only) ────────────────────────── */}
      {/* Dark base always present so the slide-exit fade lands on dark */}
      <div className="absolute inset-0 bg-slate-950" />

      <AnimatePresence>
        {hasVideoBg && (
          <motion.div
            key="video-bg"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {reducedMotion ? (
              <img
                src="/welcome-bg-poster.jpg"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <motion.video
                className="absolute inset-0 w-full h-full object-cover"
                src="/welcome-bg.mp4"
                autoPlay
                muted
                playsInline
                poster="/welcome-bg-poster.jpg"
                onEnded={() => setVideoEnded(true)}
                animate={{ opacity: videoEnded ? 0 : 1 }}
                transition={{ duration: 1.5 }}
              />
            )}
            {/* Gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/65" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="relative flex flex-col h-full safe-top safe-bottom px-6 pb-8 max-w-md mx-auto w-full">
        <div className="flex justify-end pt-2">
          <button
            onClick={skip}
            className={`text-sm ${
              hasVideoBg
                ? "text-white/70 hover:text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
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
              <h1 className={`text-3xl font-light ${hasVideoBg ? "text-white" : "dark:text-slate-100"}`}>
                {SLIDES[i].title}
              </h1>
              <p
                className={`leading-relaxed max-w-xs ${
                  hasVideoBg
                    ? "text-white/85"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
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
                idx === i
                  ? "w-8 bg-teal-400"
                  : hasVideoBg
                    ? "w-1.5 bg-white/35"
                    : "w-1.5 bg-slate-900/10 dark:bg-white/20"
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
    </div>
  );
}
