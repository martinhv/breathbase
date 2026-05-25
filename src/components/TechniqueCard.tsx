// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Shared technique card used by Category and Theme pages.
//
// Renders the technique name + short description + rationale, a duration
// picker (chips), an expand/collapse for either the citation (More) or the
// tutorial voice-over (Tutorial), and a "Begin" button that unlocks audio
// inside the user-gesture handler before navigating to the Session page.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Technique } from "@/lib/techniques";
import { useSettings } from "@/lib/settings";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { EMPTY_STATS, useHistory } from "@/lib/history";
import { TUTORIALS, hasTutorial } from "@/lib/tutorials";
import { narrationVoiceForLanguage } from "@/lib/voiceProfiles";

/**
 * A handful of round-number duration choices within the technique's allowed
 * range — always includes the min, the default, and the max so users can
 * quickly pick the shortest, recommended, or longest version.
 */
function durationPresets(t: Technique): number[] {
  const [min, max] = t.durationRangeMin;
  const set = new Set<number>([min, t.defaultDurationMin, max]);
  for (const v of [3, 5, 10]) {
    if (v >= min && v <= max) set.add(v);
  }
  return Array.from(set)
    .sort((a, b) => a - b)
    .slice(0, 5);
}

export function TechniqueCard({ t: tech }: { t: Technique }) {
  const { t, i18n } = useTranslation();
  const narrationVoice = narrationVoiceForLanguage(
    i18n.language.startsWith("de") ? "de" : "en",
  );
  const { settings, update } = useSettings();
  const audio = useAudioEngine();
  const { summary } = useHistory();
  const [expanded, setExpanded] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialPlaying, setTutorialPlaying] = useState(false);
  const [tutorialProgress, setTutorialProgress] = useState(0);
  const tutorialAudioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const duration =
    settings.durationOverrides[tech.id] ?? tech.defaultDurationMin;
  const presets = durationPresets(tech);
  const stats = summary[tech.id] ?? EMPTY_STATS;
  const hasT = hasTutorial(tech.id);

  const setDuration = (mins: number) => {
    update({
      durationOverrides: { ...settings.durationOverrides, [tech.id]: mins },
    });
  };

  // Bind play/pause + progress + ended listeners to the audio element when
  // the tutorial section is mounted. Re-binds if the element ref changes.
  useEffect(() => {
    if (!tutorialOpen) return;
    const el = tutorialAudioRef.current;
    if (!el) return;
    const onTime = () => {
      if (el.duration > 0) setTutorialProgress(el.currentTime / el.duration);
    };
    const onEnded = () => {
      setTutorialPlaying(false);
      setTutorialProgress(1);
    };
    const onPlay = () => setTutorialPlaying(true);
    const onPause = () => setTutorialPlaying(false);
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
  }, [tutorialOpen]);

  // Stop tutorial audio if the card unmounts.
  useEffect(() => {
    return () => {
      tutorialAudioRef.current?.pause();
    };
  }, []);

  const toggleTutorial = () => {
    if (tutorialOpen) {
      tutorialAudioRef.current?.pause();
      setTutorialOpen(false);
      return;
    }
    setTutorialOpen(true);
    // Defer auto-play to after the audio element mounts. The element gets
    // its src on render, then we kick playback from a microtask so the user
    // gesture is still in scope for the autoplay policy.
    queueMicrotask(() => {
      const el = tutorialAudioRef.current;
      if (!el) return;
      el.currentTime = 0;
      el.play().catch(() => { /* autoplay blocked — user can hit play */ });
    });
  };

  const togglePlayPause = () => {
    const el = tutorialAudioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const shortDescription = t(`techniques.${tech.id}.shortDescription`, {
    defaultValue: tech.shortDescription,
  });
  const scientificRationale = t(`techniques.${tech.id}.scientificRationale`, {
    defaultValue: tech.scientificRationale,
  });

  return (
    <article className="p-4 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{tech.name}</h3>
        {stats.count > 0 && (
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
            {t("techniqueCard.statsLine", {
              count: stats.count,
              minutes: Math.round(stats.totalMs / 60_000),
            })}
          </div>
        )}
      </header>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {shortDescription}
      </p>
      <p className="text-xs text-teal-300/80 mt-2 leading-relaxed italic">
        {scientificRationale}
      </p>
      {!hasT && expanded && (
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          <span className="uppercase tracking-widest text-slate-700 dark:text-slate-300">
            {t("techniqueCard.citation")}
          </span>
          {tech.citation}
        </p>
      )}
      {hasT && tutorialOpen && (
        <div className="mt-3 p-3 rounded-xl bg-slate-900/[0.06] dark:bg-white/5 border border-slate-900/5 dark:border-white/5 space-y-3">
          <audio
            ref={tutorialAudioRef}
            src={`/voice/${narrationVoice}/tutorial-${tech.id}.mp3`}
            preload="auto"
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={tutorialPlaying ? t("techniqueCard.pauseTutorial") : t("techniqueCard.playTutorial")}
              className="w-10 h-10 rounded-full bg-teal-400/90 text-ink-950 flex items-center justify-center hover:bg-teal-300 shrink-0"
            >
              {tutorialPlaying ? (
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
                style={{ width: `${tutorialProgress * 100}%` }}
              />
            </div>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
            {t(`tutorials.${tech.id}`, { defaultValue: TUTORIALS[tech.id] })
              .split("\n\n")
              .map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            <span className="uppercase tracking-widest text-slate-700 dark:text-slate-300">
              {t("techniqueCard.citation")}
            </span>
            {tech.citation}
          </p>
        </div>
      )}
      <div
        className="mt-4 flex items-center gap-1.5 flex-wrap"
        role="radiogroup"
        aria-label={t("techniqueCard.sessionLength")}
      >
        <span className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 mr-1">
          {t("techniqueCard.duration")}
        </span>
        {presets.map((mins) => {
          const active = duration === mins;
          return (
            <button
              key={mins}
              role="radio"
              aria-checked={active}
              onClick={() => setDuration(mins)}
              className={`px-2.5 py-1 rounded-lg text-xs tabular-nums transition ${
                active
                  ? "bg-teal-400/90 text-ink-950 font-medium"
                  : "border border-slate-900/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10"
              }`}
            >
              {mins}m
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        {hasT ? (
          <button
            onClick={toggleTutorial}
            className="px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 border border-slate-900/10 dark:border-white/10"
          >
            {tutorialOpen ? t("techniqueCard.closeTutorial") : t("techniqueCard.tutorial")}
          </button>
        ) : (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 border border-slate-900/10 dark:border-white/10"
          >
            {expanded ? t("techniqueCard.less") : t("techniqueCard.more")}
          </button>
        )}
        <button
          onClick={async () => {
            tutorialAudioRef.current?.pause();
            await audio.unlock();
            navigate(`/session/${tech.id}`);
          }}
          className="ml-auto px-5 py-2 rounded-xl bg-teal-400/90 text-ink-950 text-sm font-medium hover:bg-teal-300"
        >
          {t("session.beginWithDuration", { mins: duration })}
        </button>
      </div>
    </article>
  );
}