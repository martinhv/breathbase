import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BreathingOrb } from "@/components/BreathingOrb";
import { PhaseIndicator } from "@/components/PhaseIndicator";
import { NostrilDiagram } from "@/components/NostrilDiagram";
import { SafetyModal } from "@/components/SafetyModal";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useBreathSession, type ExpandedPhase } from "@/hooks/useBreathSession";
import { useHaptics } from "@/hooks/useHaptics";
import { useSpeech } from "@/hooks/useSpeech";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import {
  appendHistory,
  type Mood,
  updateMood,
} from "@/lib/storage";
import { findTechnique, type Technique } from "@/lib/techniques";

type Stage =
  | "safety" // safety modal (only if technique has safetyNotes)
  | "active" // ready countdown + session
  | "complete" // "Session complete" summary
  | "mood"; // mood check-in

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Session() {
  const { id } = useParams<{ id: string }>();
  const technique = id ? findTechnique(id) : undefined;
  if (!technique) {
    return (
      <div className="p-6 text-center text-slate-400 safe-top safe-bottom">
        <p>Technique not found.</p>
        <Link to="/" className="text-teal-300 underline">
          Back home
        </Link>
      </div>
    );
  }
  // SessionInner is mounted only once we know the technique exists, so the
  // hooks inside it never have to deal with an undefined value.
  return <SessionInner technique={technique} />;
}

function SessionInner({ technique }: { technique: Technique }) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user } = useAuth();

  const duration = useMemo(() => {
    return settings.durationOverrides[technique.id] ?? technique.defaultDurationMin;
  }, [technique, settings.durationOverrides]);

  const audio = useAudioEngine();
  const { speak, cancel: cancelSpeech } = useSpeech();
  const vibrate = useHaptics();

  // Stage progression. SafetyModal first if applicable.
  const [stage, setStage] = useState<Stage>(
    technique?.safetyNotes && technique.safetyNotes.length > 0 ? "safety" : "active",
  );
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const onPhaseEnter = useCallback(
    (phase: ExpandedPhase) => {
      audio.playChime(phase.kind, phase.chimeFreqHz);
      // Per-phase piano phrase — duration drives the arpeggio speed so
      // music stays locked to the breath rhythm.
      audio.playPhrase(phase.kind, phase.durationMs, phase.cycleNumber);
      if (phase.voicePrompt) speak(phase.voicePrompt);
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

  // We need a ref to the session handle so we can record history on complete
  // without a stale closure.
  const session = useBreathSession({
    technique,
    durationMin: duration,
    onPhaseEnter,
    onStartRunning,
    onComplete: () => {
      audio.stopMusic();
      cancelSpeech();
      vibrate([80, 60, 80]);
      setStage("complete");
    },
  });
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

  // When the user enters complete stage, write a history entry. We keep the
  // returned doc ID so the mood check-in can attach to *this* session rather
  // than guessing at "the latest" (which would race if two devices sync).
  const historyWritten = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (stage !== "complete") return;
    if (historyWritten.current || !technique || !user) return;
    historyWritten.current = true;
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
      .then((id) => {
        sessionIdRef.current = id;
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("Failed to save session:", e);
      });
  }, [stage, technique, user]);

  // Cleanup audio on unmount.
  useEffect(() => {
    return () => {
      audio.stopMusic();
      cancelSpeech();
    };
  }, [audio, cancelSpeech]);

  // ── SAFETY ─────────────────────────────────────────────────────────────
  if (stage === "safety") {
    return (
      <SafetyModal
        open
        techniqueName={technique.name}
        notes={technique.safetyNotes ?? []}
        onAcknowledge={async () => {
          // Unlock audio within this gesture (in case the Category click's
          // unlock happened in a different tab / didn't take).
          await audio.unlock();
          setStage("active");
        }}
        onCancel={() => navigate(-1)}
      />
    );
  }

  // ── COMPLETE / MOOD ─────────────────────────────────────────────────────
  if (stage === "complete") {
    return (
      <div className="min-h-full flex flex-col safe-top safe-bottom px-6 pb-8 max-w-md mx-auto text-center">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="text-5xl">✨</div>
          <h1 className="text-3xl font-light">Session complete</h1>
          <div className="text-sm text-slate-400">
            <p>{technique.name}</p>
            <p>
              {formatTime(session.totalElapsedMs)} •{" "}
              {session.cyclesCompleted} cycle
              {session.cyclesCompleted === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setStage("mood")}
          className="px-5 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300"
        >
          Continue
        </button>
      </div>
    );
  }

  if (stage === "mood") {
    const finish = (mood: Mood | null) => {
      if (mood !== null && user && sessionIdRef.current) {
        updateMood(user.uid, sessionIdRef.current, mood).catch((e) => {
          // eslint-disable-next-line no-console
          console.error("Failed to save mood:", e);
        });
      }
      navigate("/", { replace: true });
    };
    return (
      <div className="min-h-full flex flex-col safe-top safe-bottom px-6 pb-8 max-w-md mx-auto justify-center">
        <MoodCheckIn onSubmit={(m) => finish(m)} onSkip={() => finish(null)} />
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
      {/* Top bar */}
      <header className="flex items-center justify-between pt-3 pb-2 text-sm">
        <button
          onClick={() => setShowCloseConfirm(true)}
          aria-label="Close session"
          className="p-2 -ml-2 rounded-full hover:bg-white/5 text-slate-300"
        >
          ✕
        </button>
        <div className="text-slate-300 font-medium">{technique.name}</div>
        <div className="tabular-nums text-slate-400 w-12 text-right">
          {formatTime(session.totalElapsedMs)}
        </div>
      </header>

      {/* Orb + ready countdown */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8">
        {isReady ? (
          <div className="text-center">
            <div className="text-sm uppercase tracking-widest text-slate-400 mb-2">
              Get ready
            </div>
            <div className="text-7xl font-extralight tabular-nums">
              {Math.max(1, Math.ceil(session.readyRemainingMs / 1000))}
            </div>
            <p className="mt-4 text-slate-400 text-sm max-w-xs mx-auto">
              Take a slow, deep breath. Settle in.
            </p>
          </div>
        ) : phase ? (
          <>
            <BreathingOrb
              phaseKind={phase.kind}
              durationMs={phase.durationMs}
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
        <div className="flex justify-between text-xs text-slate-400 uppercase tracking-widest">
          {session.totalRounds > 1 ? (
            <span>
              Round {session.currentRound} of {session.totalRounds}
            </span>
          ) : (
            <span />
          )}
          <span>
            Cycle {session.cyclesCompleted} of {session.totalCycles}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={isPaused ? session.resume : session.pause}
            disabled={isReady}
            className="flex-1 px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-slate-100 hover:bg-white/15 disabled:opacity-40"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={session.skipToEnd}
            className="flex-1 px-4 py-3 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/5"
          >
            Skip to end
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
          <div className="w-full max-w-sm bg-ink-800 border border-white/10 rounded-3xl p-6">
            <p className="text-slate-200 mb-4">
              End this session? Your progress will not be saved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 px-4 py-3 rounded-2xl border border-white/10"
              >
                Stay
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
                End session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
