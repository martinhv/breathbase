// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Compact narration bar for the intro lesson card in the 5-day program.
//
// Plays public/voice/{DEFAULT_VOICE_PROFILE}/lesson-day-{N}.mp3 — a ~30 s
// prose clip authored in scripts/generate-lesson-voice.sh. Auto-plays on
// mount (the user just tapped Begin in the Program page, so the autoplay
// gesture is still hot). Pinned to the default voice profile, mirroring
// the tutorial narration convention.
//
// Renders nothing when voice is disabled in settings — keeps the lesson
// card silent and visually unchanged for those users.

import { useEffect, useRef, useState } from "react";
import { DEFAULT_VOICE_PROFILE } from "@/lib/voiceProfiles";

export function LessonNarrationBar({
  day,
  enabled,
}: {
  day: number;
  enabled: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;
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
    // Auto-play on mount — the Begin tap in Program.tsx is a fresh gesture,
    // so browsers should allow this. Fall back silently if blocked.
    el.currentTime = 0;
    el.play().catch(() => { /* autoplay blocked — user can hit play */ });
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.pause();
    };
  }, [enabled, day]);

  if (!enabled) return null;

  const togglePlayPause = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
      <audio
        ref={audioRef}
        src={`/voice/${DEFAULT_VOICE_PROFILE}/lesson-day-${day}.mp3`}
        preload="auto"
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlayPause}
        aria-label={playing ? "Pause lesson" : "Play lesson"}
        className="w-9 h-9 rounded-full bg-teal-400/90 text-ink-950 flex items-center justify-center hover:bg-teal-300 shrink-0"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current ml-0.5" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
          Narrated lesson
        </div>
        <div className="h-1 bg-slate-900/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-400/80 transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
