import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/settings";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { DEFAULT_VOICE_PROFILE } from "@/lib/voiceProfiles";
import { enrollState } from "@/lib/program";
import { track } from "@/lib/analytics";

// Narration slugs match generate-onboarding-voice.sh. Files live at
// public/voice/{DEFAULT_VOICE_PROFILE}/onboarding-{slug}.mp3 — onboarding is
// pinned to the default voice since the user hasn't picked one yet.
const SLIDES = [
  {
    icon: "🌬️",
    title: "Welcome to BreathBase",
    body: "Breathwork rooted in modern science.",
    narration: "welcome",
  },
  {
    icon: "🧭",
    title: "Find what you need",
    body: "Themes on the home screen group techniques by goal — sleep, stress, focus, energy. Or browse the full library by physiology.",
    narration: "navigate",
  },
  {
    icon: "🌱",
    title: "Start small",
    body: "Five minutes a day. Consistency matters more than duration.",
    narration: "start-small",
  },
  {
    icon: "🗓️",
    title: "A seven-day start",
    body: "We've laid out a one-week program — a different foundational practice each day. Pick it up on the home screen whenever you're ready.",
    narration: "seven-day",
  },
];

export function Onboarding() {
  const [i, setI] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const reducedMotion = useReducedMotion();
  const audio = useAudioEngine();
  const audioStarted = useRef(false);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
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

  // Play per-slide narration. The first slide's clip will likely be blocked
  // by browser autoplay (no gesture yet) — the .catch() swallows that;
  // subsequent slides play because the Next tap counts as a gesture.
  useEffect(() => {
    const el = narrationRef.current;
    if (!el) return;
    el.pause();
    if (!settings.voiceEnabled) return;
    el.src = `/voice/${DEFAULT_VOICE_PROFILE}/onboarding-${SLIDES[i].narration}.mp3`;
    el.currentTime = 0;
    el.play().catch(() => { /* autoplay blocked — fall back to silent slide */ });
  }, [i, settings.voiceEnabled]);

  // Stop narration on unmount so it doesn't bleed into the next route.
  useEffect(() => {
    return () => {
      narrationRef.current?.pause();
    };
  }, []);

  const finish = (skipped: boolean) => {
    if (audio.isMusicPlaying()) audio.fadeOutMusic(1.5);
    narrationRef.current?.pause();
    update({ onboarded: true, program: enrollState() });
    track("onboarding_complete", { skipped });
    navigate("/", { replace: true });
  };

  // First tap anywhere on the page unlocks audio and retries narration —
  // which is otherwise blocked on slide 0 since there's no prior gesture.
  const handleFirstTap = () => {
    if (hasInteracted) return;
    setHasInteracted(true);
    startAudio();
    narrationRef.current?.play().catch(() => { /* ignore */ });
  };

  const next = () => {
    startAudio();
    setHasInteracted(true);
    isLast ? finish(false) : setI((v) => v + 1);
  };

  const skip = () => {
    setHasInteracted(true);
    finish(true);
  };

  return (
    // fixed inset-0 so we own the full viewport — avoids the body's
    // background-attachment:fixed gradient painting over any child layers.
    <div className="fixed inset-0 flex flex-col" onClick={handleFirstTap}>

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

      {/* Hidden narration element — src swaps per slide via useEffect. */}
      <audio ref={narrationRef} preload="auto" className="hidden" />

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

        {/* Tap-to-start hint — appears on slide 0 until first interaction.
            Slide 0's narration would otherwise be blocked by autoplay policy. */}
        <AnimatePresence>
          {hasVideoBg && !hasInteracted && settings.voiceEnabled && (
            <motion.div
              key="tap-hint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="text-center text-white/75 text-sm mb-3 pointer-events-none"
            >
              Tap anywhere to begin
            </motion.div>
          )}
        </AnimatePresence>

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
