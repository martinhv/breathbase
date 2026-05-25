// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Collapsible "Want to know more about this exercise?" tutorial player.
//
// Shown on the Session complete screen when the session was launched from the
// Foundations program. Reuses the tutorial mp3 + transcript already authored
// for each technique (see lib/tutorials.ts, scripts/generate-tutorial-voice.sh).
// Audio is pinned to DEFAULT_VOICE_PROFILE to match the existing tutorial UX
// in TechniqueCard.

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TUTORIALS } from "@/lib/tutorials";
import { narrationVoiceForLanguage } from "@/lib/voiceProfiles";

export function TutorialDisclosure({ techniqueId }: { techniqueId: string }) {
  const { t, i18n } = useTranslation();
  const narrationVoice = narrationVoiceForLanguage(
    i18n.language.startsWith("de") ? "de" : "en",
  );
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcript = t(`tutorials.${techniqueId}`, {
    defaultValue: TUTORIALS[techniqueId],
  });

  // Wire up audio listeners while the player is mounted.
  useEffect(() => {
    if (!open) return;
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      if (el.duration > 0) setProgress(el.currentTime / el.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(1);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [open]);

  // Stop playback on unmount so audio doesn't bleed into the next route.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const openAndPlay = () => {
    setOpen(true);
    // Defer to the next microtask so the audio element has mounted before
    // we call play() — keeps the user gesture in scope for the autoplay policy.
    queueMicrotask(() => {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = 0;
      el.play().catch(() => { /* autoplay blocked — user can hit play */ });
    });
  };

  const togglePlayPause = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  if (!open) {
    return (
      <button
        onClick={openAndPlay}
        className="mt-4 w-full text-left px-4 py-3 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 hover:bg-slate-900/10 dark:hover:bg-white/10 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-400/90 text-ink-950 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current ml-0.5" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {t("techniqueCard.wantToKnowMore")}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {t("techniqueCard.listenShortTutorial")}
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="mt-4 p-3 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 space-y-3 text-left">
      <audio
        ref={audioRef}
        src={`/voice/${narrationVoice}/tutorial-${techniqueId}.mp3`}
        preload="auto"
        className="hidden"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlayPause}
          aria-label={playing ? t("techniqueCard.pauseTutorial") : t("techniqueCard.playTutorial")}
          className="w-10 h-10 rounded-full bg-teal-400/90 text-ink-950 flex items-center justify-center hover:bg-teal-300 shrink-0"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current ml-0.5" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="flex-1 h-1 bg-slate-900/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-400/80"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            audioRef.current?.pause();
            setOpen(false);
          }}
          aria-label={t("techniqueCard.closeTutorialAria")}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm px-1"
        >
          ✕
        </button>
      </div>
      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
        {transcript.split("\n\n").map((para, idx) => (
          <p key={idx}>{para}</p>
        ))}
      </div>
    </div>
  );
}
