// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BreathingOrb } from "@/components/BreathingOrb";
import { PhaseIndicator } from "@/components/PhaseIndicator";
import { NostrilDiagram } from "@/components/NostrilDiagram";
import { SafetyModal } from "@/components/SafetyModal";
import { TutorialDisclosure } from "@/components/TutorialDisclosure";
import { LessonNarrationBar } from "@/components/LessonNarrationBar";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useBreathSession, type ExpandedPhase } from "@/hooks/useBreathSession";
import { useHaptics } from "@/hooks/useHaptics";
import { useSpeech } from "@/hooks/useSpeech";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { useHistory } from "@/lib/history";
import { appendHistory } from "@/lib/storage";
import { findTechnique, type Technique } from "@/lib/techniques";
import { PROGRAM, getProgramDay, markDayComplete } from "@/lib/program";
import { hasTutorial } from "@/lib/tutorials";
import { track } from "@/lib/analytics";
import { voiceProfilesForLanguage } from "@/lib/voiceProfiles";

type Stage =
  | "safety" // safety modal (only if technique has safetyNotes)
  | "intro" // pre-session lesson card (only when launched from Foundations program)
  | "active" // ready countdown + session
  | "settling" // post-session integration moment (bell + slow fade + voice line)
  | "complete"; // "Session complete" summary

/** Duration of the settling stage before auto-advancing to complete. */
const SETTLING_DURATION_MS = 15_000;
/** Delay between bell + fade start and the spoken closing line, so the bell
 *  has space to ring out before the voice arrives. */
const SETTLING_VOICE_DELAY_MS = 1_800;
/** Music fade-out ramp on settling start — longer than the previous abrupt
 *  fade so the bed dies down across the whole integration window. */
const SETTLING_MUSIC_FADE_S = 6;

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Session() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const technique = id ? findTechnique(id) : undefined;
  if (!technique) {
    return (
      <div className="p-6 text-center text-slate-600 dark:text-slate-400 safe-top safe-bottom">
        <p>{t("session.notFound")}</p>
        <Link to="/" className="text-teal-300 underline">
          {t("session.backHome")}
        </Link>
      </div>
    );
  }
  // SessionInner is mounted only once we know the technique exists, so the
  // hooks inside it never have to deal with an undefined value. `key` forces
  // a fresh mount whenever the technique changes — without this, navigating
  // between sessions (e.g. via the "Try Box Breathing first" recommendation)
  // would re-use the previous instance's stage/state.
  return <SessionInner key={technique.id} technique={technique} />;
}

function SessionInner({ technique }: { technique: Technique }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const { user } = useAuth();
  const { history, reload: reloadHistory } = useHistory();
  const [searchParams] = useSearchParams();

  // First-timer guard for upregulate techniques: if the user has never
  // completed a non-upregulate session, recommend starting with a calmer
  // practice. Shown in the safety modal AND inline in Get Ready (until
  // they've actually done one).
  const hasFoundationExperience = useMemo(
    () => history.some((e) => e.category !== "upregulate"),
    [history],
  );
  const recommendFoundation =
    technique.category === "upregulate" && !hasFoundationExperience;

  // If we're launched from the Foundations program (e.g. `?program=3`), and
  // that day's prescribed technique matches the one we're running, use the
  // program's duration — not the user's per-technique override. This keeps
  // the "guided" feel: the program decides the dose.
  const programDay = useMemo(() => {
    const raw = searchParams.get("program");
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    const day = getProgramDay(n);
    if (!day) return null;
    return day.techniqueId === technique.id ? day : null;
  }, [searchParams, technique.id]);

  const duration = useMemo(() => {
    if (programDay) return programDay.durationMin;
    return settings.durationOverrides[technique.id] ?? technique.defaultDurationMin;
  }, [technique, settings.durationOverrides, programDay]);

  const audio = useAudioEngine();
  const { speak, cancel: cancelSpeech } = useSpeech();
  const vibrate = useHaptics();

  // Stage progression. The safety modal is one-time per technique — once
  // acknowledged it's replaced by the inline notes shown in the Get Ready
  // phase below.
  const needsSafetyAck =
    !!technique?.safetyNotes &&
    technique.safetyNotes.length > 0 &&
    !settings.acknowledgedSafety.includes(technique.id);
  // Program-mode sessions get a brief lesson card before the breath starts.
  // Standalone sessions skip straight to active.
  const initialStage: Stage = needsSafetyAck
    ? "safety"
    : programDay
      ? "intro"
      : "active";
  const [stage, setStage] = useState<Stage>(initialStage);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const onPhaseEnter = useCallback(
    (phase: ExpandedPhase) => {
      audio.playChime(phase.kind, phase.chimeFreqHz);
      // Per-phase piano phrase — duration drives the arpeggio speed so
      // music stays locked to the breath rhythm.
      audio.playPhrase(phase.kind, phase.durationMs, phase.cycleNumber);
      if (phase.voicePrompt) speak(phase.voicePrompt, phase.durationMs);
      vibrate(50);
    },
    [audio, speak, vibrate],
  );

  // Music starts when the session begins (in beginSession, just after the
  // user-gesture unlock) so the pad is already audible during the "ready"
  // countdown rather than fading in after it.
  const onStartRunning = useCallback(() => {
    /* no-op: music already started in beginSession */
  }, []);

  // When the technique has safety notes, the Get Ready prelude doubles as
  // a reading window — extend it so users have time to skim the bullets.
  const readyMs = technique.safetyNotes && technique.safetyNotes.length > 0
    ? 10_000
    : undefined;

  // We need a ref to the session handle so we can record history on complete
  // without a stale closure.
  const session = useBreathSession({
    technique,
    durationMin: duration,
    readyMs,
    onPhaseEnter,
    onStartRunning,
    onComplete: () => {
      // Don't fade music or cancel speech here — the settling stage owns
      // the closing audio (slower fade + closing bell + spoken line). Just
      // mark the body-level "you're done with breathing" cue and advance.
      vibrate([80, 60, 80]);
      setStage("settling");
    },
  });

  // Keep the screen on through both active breathing and the settling moment
  // — letting the screen sleep mid-settle would feel abrupt.
  useWakeLock(stage === "active" || stage === "settling");
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // When the safety modal is dismissed, kick off the session.
  const beginSession = useCallback(async () => {
    await audio.unlock();
    if (settings.musicEnabled) audio.startMusic();
    sessionRef.current.start();
  }, [audio, settings.musicEnabled]);

  useEffect(() => {
    if (stage === "active" && session.status === "idle") {
      void beginSession();
    }
  }, [stage, session.status, beginSession]);

  // Play the "Get ready" narration once when the ready countdown starts.
  // Fired here (not via onPhaseEnter) because ready isn't a breath phase.
  const readyNarratedRef = useRef(false);
  useEffect(() => {
    if (session.status === "ready" && !readyNarratedRef.current) {
      readyNarratedRef.current = true;
      speak("Get ready");
    }
    if (session.status === "idle") {
      readyNarratedRef.current = false;
    }
  }, [session.status, speak]);

  // Settling stage: a 15s integration moment between the last breath phase
  // and the complete summary. Fires the closing bell immediately so it rings
  // out into the still-loud bus, starts a long music fade, schedules the
  // spoken closing line ~2s in, and auto-advances to complete at 15s.
  // The Continue button (in the settling UI) shortcuts the timer.
  useEffect(() => {
    if (stage !== "settling") return;
    audio.playClosingBell();
    audio.fadeOutMusic(SETTLING_MUSIC_FADE_S);
    const voiceTimer = window.setTimeout(() => {
      speak("Session end");
    }, SETTLING_VOICE_DELAY_MS);
    const advanceTimer = window.setTimeout(() => {
      setStage("complete");
    }, SETTLING_DURATION_MS);
    return () => {
      window.clearTimeout(voiceTimer);
      window.clearTimeout(advanceTimer);
    };
  }, [stage, audio, speak]);

  // When the breath session ends, write a history entry. We fire on the
  // settling→ or →complete edge (whichever comes first) so the session
  // counts even if the user closes the tab mid-settle.
  const historyWritten = useRef(false);
  useEffect(() => {
    if (stage !== "settling" && stage !== "complete") return;
    if (historyWritten.current || !technique || !user) return;
    historyWritten.current = true;
    track("session_complete", {
      techniqueId: technique.id,
      category: technique.category,
      durationMin: Math.round(sessionRef.current.totalElapsedMs / 60000),
      cyclesCompleted: sessionRef.current.cyclesCompleted,
      soundscape: settings.soundscape,
      voiceEnabled: settings.voiceEnabled,
    });
    appendHistory(user.uid, {
      techniqueId: technique.id,
      techniqueName: technique.name,
      category: technique.category,
      startedAt: new Date(
        Date.now() - sessionRef.current.totalElapsedMs,
      ).toISOString(),
      durationMs: sessionRef.current.totalElapsedMs,
      cyclesCompleted: sessionRef.current.cyclesCompleted,
    })
      .then(() => reloadHistory())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("Failed to save session:", e);
      });
    if (programDay && settings.program.enrolled) {
      update({ program: markDayComplete(settings.program, programDay.day) });
    }
  }, [stage, technique, user, programDay, settings.program, update, reloadHistory]);

  // Cleanup audio on unmount.
  useEffect(() => {
    return () => {
      audio.stopMusic();
      cancelSpeech();
    };
  }, [audio, cancelSpeech]);

  // ── SAFETY ─────────────────────────────────────────────────────────────
  if (stage === "safety") {
    const translatedNotes = (t(`techniques.${technique.id}.safety`, {
      defaultValue: technique.safetyNotes ?? [],
      returnObjects: true,
    }) as string[]);
    return (
      <SafetyModal
        open
        techniqueName={technique.name}
        notes={translatedNotes}
        recommendFoundation={recommendFoundation}
        onAcknowledge={async () => {
          // Unlock audio within this gesture (in case the Category click's
          // unlock happened in a different tab / didn't take).
          await audio.unlock();
          // Persist the acknowledgement so the modal is one-time per
          // technique; the notes remain visible inline in the Get Ready
          // phase as an ongoing reminder.
          if (!settings.acknowledgedSafety.includes(technique.id)) {
            update({
              acknowledgedSafety: [
                ...settings.acknowledgedSafety,
                technique.id,
              ],
            });
          }
          setStage(programDay ? "intro" : "active");
        }}
        onCancel={() => navigate(-1)}
      />
    );
  }

  // ── INTRO (program mode only) ───────────────────────────────────────────
  if (stage === "intro" && programDay) {
    return (
      <div className="min-h-full flex flex-col safe-top safe-bottom px-6 pb-8 max-w-md mx-auto">
        <header className="flex items-center justify-between pt-3 pb-2 text-sm">
          <button
            onClick={() => navigate(-1)}
            aria-label={t("common.back")}
            className="p-2 -ml-2 rounded-full hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
          >
            ←
          </button>
          <div className="text-[10px] uppercase tracking-widest text-teal-300/80">
            {t("session.dayOf", { day: programDay.day, total: PROGRAM.days.length })}
          </div>
          <div className="w-7" />
        </header>

        <main className="flex-1 flex flex-col justify-center gap-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {programDay.durationMin} {t("common.minutesShort")} · {technique.name}
            </div>
            <h1 className="mt-1 text-3xl font-light text-slate-900 dark:text-slate-100">
              {t(`program_days.${programDay.day}.headline`, { defaultValue: programDay.headline })}
            </h1>
          </div>

          {programDay.intro.callback && (
            <p className="text-sm italic text-slate-600 dark:text-slate-400 leading-relaxed border-l-2 border-teal-400/40 pl-3">
              {t(`program_days.${programDay.day}.callback`, { defaultValue: programDay.intro.callback })}
            </p>
          )}

          <section className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                {t("session.today")}
              </div>
              <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                {t(`program_days.${programDay.day}.learn`, { defaultValue: programDay.intro.learn })}
              </p>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                {t("session.whyItWorks")}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {t(`program_days.${programDay.day}.science`, { defaultValue: programDay.intro.science })}
              </p>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                {t("session.whatToNotice")}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {t(`program_days.${programDay.day}.notice`, { defaultValue: programDay.intro.notice })}
              </p>
            </div>
          </section>
        </main>

        <div className="mt-6">
          <LessonNarrationBar
            day={programDay.day}
            enabled={settings.voiceEnabled}
          />
        </div>

        <button
          onClick={() => setStage("active")}
          className="mt-3 w-full px-5 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300"
        >
          {t("session.beginWithDuration", { mins: programDay.durationMin })}
        </button>
      </div>
    );
  }

  // ── SETTLING ────────────────────────────────────────────────────────────
  // Soft "integration" moment: dim glow, closing line on screen, Continue
  // shortcut. Audio side effects (bell, fade, spoken line) live in the
  // settling-stage useEffect above; this block is purely presentational.
  if (stage === "settling") {
    return (
      <div className="min-h-full flex flex-col safe-top safe-bottom px-6 pb-8 max-w-md mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-7">
          <div
            aria-hidden
            className="relative w-32 h-32 flex items-center justify-center"
          >
            <div className="absolute inset-0 rounded-full bg-teal-400/15 motion-safe:animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-teal-400/25 motion-safe:animate-pulse [animation-delay:0.6s]" />
            <div className="absolute inset-10 rounded-full bg-teal-400/55" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-light text-slate-900 dark:text-slate-100">
              {t("session.settleTitle")}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
              {t("session.settleBody")}
            </p>
          </div>
        </div>
        <button
          onClick={() => setStage("complete")}
          className="px-5 py-3 rounded-2xl border border-slate-900/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
        >
          {t("common.continue")}
        </button>
      </div>
    );
  }

  // ── COMPLETE ────────────────────────────────────────────────────────────
  if (stage === "complete") {
    return (
      <div className="min-h-full flex flex-col safe-top safe-bottom px-6 pb-8 max-w-md mx-auto">
        <div className="flex-1 flex flex-col items-center text-center pt-8 gap-4">
          <div className="text-5xl">✨</div>
          <h1 className="text-3xl font-light">{t("session.sessionComplete")}</h1>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p>{technique.name}</p>
            <p>
              {formatTime(session.totalElapsedMs)} •{" "}
              {t("common.sessionLabel", { count: session.cyclesCompleted })}
            </p>
          </div>
          {programDay && (
            <div className="mt-2 w-full max-w-xs text-left rounded-2xl bg-teal-400/10 border border-teal-400/30 px-4 py-3">
              <div className="text-[10px] uppercase tracking-widest text-teal-300/90 mb-1">
                {t("session.useThisWhen")}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {t(`program_days.${programDay.day}.useWhen`, { defaultValue: programDay.takeaway.useWhen })}
              </p>
            </div>
          )}
          {hasTutorial(technique.id) && (
            <div className="w-full max-w-md">
              <TutorialDisclosure techniqueId={technique.id} />
            </div>
          )}
        </div>
        <button
          onClick={() =>
            navigate(programDay ? "/program" : "/", { replace: true })
          }
          className="mt-6 px-5 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300"
        >
          {t("common.done")}
        </button>
      </div>
    );
  }

  // ── ACTIVE ──────────────────────────────────────────────────────────────
  const isReady = session.status === "ready";
  const isPaused = session.status === "paused";
  const phase = session.currentPhase;
  const nostril =
    technique.id === "alternate-nostril" && phase?.meta?.nostril
      ? phase.meta.nostril === "both"
        ? null
        : phase.meta.nostril
      : null;

  return (
    <div className="min-h-full flex flex-col safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
      {import.meta.env.DEV && (
        <div className="fixed top-2 right-2 z-50 flex items-center gap-1.5 bg-slate-900/80 text-slate-200 text-xs rounded-lg px-2 py-1 backdrop-blur">
          <span className="opacity-60">{t("session.debugVoice")}</span>
          <select
            value={settings.voiceProfile}
            onChange={(e) => update({ voiceProfile: e.target.value })}
            className="bg-transparent outline-none cursor-pointer"
            aria-label={t("session.debugVoiceAria")}
          >
            {voiceProfilesForLanguage(
              i18n.language.startsWith("de") ? "de" : "en",
            ).map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Top bar */}
      <header className="flex items-center justify-between pt-3 pb-2 text-sm">
        <button
          onClick={() => setShowCloseConfirm(true)}
          aria-label={t("session.closeSession")}
          className="p-2 -ml-2 rounded-full hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
        >
          ✕
        </button>
        <div className="text-slate-700 dark:text-slate-300 font-medium">{technique.name}</div>
        <div className="tabular-nums text-slate-600 dark:text-slate-400 w-12 text-right">
          {formatTime(session.totalElapsedMs)}
        </div>
      </header>

      {/* Orb + ready countdown */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8">
        {isReady ? (
          <div className="text-center">
            <div className="text-sm uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2">
              {t("session.getReady")}
            </div>
            <div className="text-7xl font-extralight tabular-nums">
              {Math.max(1, Math.ceil(session.readyRemainingMs / 1000))}
            </div>
            <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm max-w-xs mx-auto">
              {t("session.settleIn")}
            </p>
            {recommendFoundation && (
              <div className="mt-4 max-w-xs mx-auto text-left rounded-2xl bg-teal-400/10 border border-teal-400/30 px-4 py-3">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                  <strong className="text-slate-900 dark:text-slate-100">{t("session.newHere")}</strong>{" "}
                  {t("session.newHereActivating")}
                </p>
                <Link
                  to="/session/box-breathing"
                  replace
                  className="mt-1.5 inline-flex items-center gap-1 text-xs text-teal-300 hover:text-teal-200 underline-offset-2 hover:underline"
                >
                  {t("session.tryBoxFirst")}
                </Link>
              </div>
            )}
            {technique.safetyNotes && technique.safetyNotes.length > 0 && (
              <div className="mt-4 max-w-xs mx-auto text-left rounded-2xl bg-amber-400/10 border border-amber-400/30 px-4 py-3">
                <div className="text-[11px] uppercase tracking-widest text-amber-300/90 mb-2">
                  {t("session.safetyReminder")}
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                  {(t(`techniques.${technique.id}.safety`, {
                    defaultValue: technique.safetyNotes,
                    returnObjects: true,
                  }) as string[]).map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : phase ? (
          <>
            <BreathingOrb
              phaseKind={phase.kind}
              durationMs={phase.durationMs}
              category={technique.category}
              shape={technique.id === "box-breathing" ? "square" : "circle"}
              paused={isPaused}
            />
            <PhaseIndicator
              phase={phase}
              remainingMs={session.phaseRemainingMs}
            />
            {nostril && <NostrilDiagram nostril={nostril} />}
          </>
        ) : null}
      </main>

      {/* Bottom controls */}
      <footer className="mt-4 flex flex-col gap-3">
        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest">
          {session.totalRounds > 1 ? (
            <span>
              {t("session.roundOf", { current: session.currentRound, total: session.totalRounds })}
            </span>
          ) : (
            <span />
          )}
          <span>
            {t("session.cycleOf", { current: session.cyclesCompleted, total: session.totalCycles })}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={isPaused ? session.resume : session.pause}
            disabled={isReady}
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-900/5 dark:bg-white/10 border border-slate-900/10 dark:border-white/10 text-slate-900 dark:text-slate-100 hover:bg-slate-900/10 dark:hover:bg-white/15 disabled:opacity-40"
          >
            {isPaused ? t("common.resume") : t("common.pause")}
          </button>
          <button
            onClick={session.skipToEnd}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-900/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
          >
            {t("common.skipToEnd")}
          </button>
        </div>
      </footer>

      {/* Close-confirm */}
      {showCloseConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
        >
          <div className="w-full max-w-sm bg-white dark:bg-ink-800 border border-slate-900/10 dark:border-white/10 rounded-3xl p-6">
            <p className="text-slate-800 dark:text-slate-200 mb-4">
              {t("session.endSessionConfirm")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-900/10 dark:border-white/10"
              >
                {t("session.stay")}
              </button>
              <button
                onClick={() => {
                  session.abort();
                  audio.stopMusic();
                  cancelSpeech();
                  navigate(-1);
                }}
                className="flex-1 px-4 py-3 rounded-2xl bg-red-500/80 text-white hover:bg-red-500"
              >
                {t("session.endSession")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}