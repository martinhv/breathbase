// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  cycleDurationMs,
  type BreathPhase,
  type Technique,
} from "@/lib/techniques";

// ---------------------------------------------------------------------------
// State machine
//
// The session walks a flat, pre-expanded list of BreathPhase objects. The
// reducer's only job is to advance an index + elapsed counter; rendering and
// side effects (audio/speech/haptics) are driven by selectors over the
// resulting state plus an `onPhaseEnter` callback fired in an effect.
//
// Timing comes from a single requestAnimationFrame loop. Each frame we measure
// (now - last) and roll that delta forward, advancing as many phases as
// necessary in one go. This keeps timing tight even if the tab is briefly
// throttled or the browser drops frames — overflow is never discarded.
//
// Status progression:
//   idle    → start() →
//   ready   (3s synthesized prelude, NOT in techniques.ts) → auto-advance →
//   running (walks phases until end) →
//   paused  (rAF halted; resume continues)
//   complete (terminal)
// ---------------------------------------------------------------------------

const READY_DURATION_MS = 3000;

export type SessionStatus =
  | "idle"
  | "ready"
  | "running"
  | "paused"
  | "complete";

export type ExpandedPhase = BreathPhase & {
  /** 1-based canonical-cycle number; 0 for non-cycle phases (rest, roundEnd). */
  cycleNumber: number;
  /** 1-based round number (for rounds-based techniques); 0 otherwise. */
  roundNumber: number;
  /** True for phases that are part of a roundEnd retention. */
  isRoundEnd: boolean;
  /** True for phases that are part of inter-round rest. */
  isRest: boolean;
};

type State = {
  status: SessionStatus;
  phases: ExpandedPhase[];
  phaseIndex: number;
  phaseElapsedMs: number;
  totalElapsedMs: number;
  totalDurationMs: number;
  readyRemainingMs: number;
  totalCycles: number;
  /** Was paused: also used to skip phase-enter callbacks on resume. */
  wasPaused: boolean;
};

type Action =
  | { type: "LOAD"; phases: ExpandedPhase[]; totalDurationMs: number; totalCycles: number }
  | { type: "START" }
  | { type: "READY_TICK"; deltaMs: number }
  | { type: "RUN_TICK"; deltaMs: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "SKIP_PHASE" }
  | { type: "SKIP_TO_END" }
  | { type: "RESET" }
  | { type: "ABORT" };

const initialState: State = {
  status: "idle",
  phases: [],
  phaseIndex: 0,
  phaseElapsedMs: 0,
  totalElapsedMs: 0,
  totalDurationMs: 0,
  readyRemainingMs: READY_DURATION_MS,
  totalCycles: 0,
  wasPaused: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD":
      return {
        ...initialState,
        phases: action.phases,
        totalDurationMs: action.totalDurationMs,
        totalCycles: action.totalCycles,
      };
    case "START":
      if (state.phases.length === 0) return state;
      return { ...state, status: "ready", readyRemainingMs: READY_DURATION_MS };
    case "READY_TICK": {
      if (state.status !== "ready") return state;
      const remaining = state.readyRemainingMs - action.deltaMs;
      if (remaining <= 0) {
        return { ...state, status: "running", readyRemainingMs: 0 };
      }
      return { ...state, readyRemainingMs: remaining };
    }
    case "RUN_TICK": {
      if (state.status !== "running") return state;
      let { phaseIndex, phaseElapsedMs, totalElapsedMs } = state;
      let remaining = action.deltaMs;
      totalElapsedMs += action.deltaMs;
      // Roll forward through as many phases as the delta covers. This is the
      // drift-correction mechanism: time that "overflows" a phase boundary
      // is applied to the next phase, not discarded.
      while (remaining > 0 && phaseIndex < state.phases.length) {
        const current = state.phases[phaseIndex];
        const remainingInPhase = current.durationMs - phaseElapsedMs;
        if (remaining < remainingInPhase) {
          phaseElapsedMs += remaining;
          remaining = 0;
        } else {
          remaining -= remainingInPhase;
          phaseElapsedMs = 0;
          phaseIndex += 1;
        }
      }
      if (phaseIndex >= state.phases.length) {
        return {
          ...state,
          status: "complete",
          phaseIndex: state.phases.length - 1,
          phaseElapsedMs: state.phases[state.phases.length - 1].durationMs,
          totalElapsedMs: state.totalDurationMs,
        };
      }
      return { ...state, phaseIndex, phaseElapsedMs, totalElapsedMs };
    }
    case "PAUSE":
      if (state.status !== "running") return state;
      return { ...state, status: "paused", wasPaused: true };
    case "RESUME":
      if (state.status !== "paused") return state;
      return { ...state, status: "running" };
    case "SKIP_PHASE": {
      if (state.status !== "running" && state.status !== "paused") return state;
      const nextIndex = state.phaseIndex + 1;
      if (nextIndex >= state.phases.length) {
        return {
          ...state,
          status: "complete",
          phaseIndex: state.phases.length - 1,
          phaseElapsedMs: state.phases[state.phases.length - 1].durationMs,
          totalElapsedMs: state.totalDurationMs,
        };
      }
      // Snap totalElapsedMs forward to the boundary so progress stays consistent.
      const elapsedAtBoundary = state.phases
        .slice(0, nextIndex)
        .reduce((s, p) => s + p.durationMs, 0);
      return {
        ...state,
        phaseIndex: nextIndex,
        phaseElapsedMs: 0,
        totalElapsedMs: elapsedAtBoundary,
      };
    }
    case "SKIP_TO_END":
      return {
        ...state,
        status: "complete",
        phaseIndex: state.phases.length - 1,
        phaseElapsedMs: state.phases[state.phases.length - 1]?.durationMs ?? 0,
        totalElapsedMs: state.totalDurationMs,
      };
    case "ABORT":
      return { ...state, status: "complete" };
    case "RESET":
      return { ...initialState, phases: state.phases, totalDurationMs: state.totalDurationMs, totalCycles: state.totalCycles };
  }
}

// ---------------------------------------------------------------------------
// Expansion with cycle/round annotations.
//
// We don't depend on `expandSession` here because the UI needs to know which
// phase belongs to which cycle/round, plus whether a phase is a roundEnd /
// rest phase (the orb and labels render those differently).
// ---------------------------------------------------------------------------

function expandWithMeta(t: Technique, durationMin: number): ExpandedPhase[] {
  const out: ExpandedPhase[] = [];
  let cycleNum = 0;
  let roundNum = 0;

  const pushCycle = () => {
    cycleNum += 1;
    for (const p of t.cycle) {
      out.push({
        ...p,
        cycleNumber: cycleNum,
        roundNumber: roundNum || 1,
        isRoundEnd: false,
        isRest: false,
      });
    }
  };
  const pushFiller = (
    phases: BreathPhase[],
    kind: "roundEnd" | "rest",
  ) => {
    for (const p of phases) {
      out.push({
        ...p,
        cycleNumber: 0,
        roundNumber: roundNum,
        isRoundEnd: kind === "roundEnd",
        isRest: kind === "rest",
      });
    }
  };

  switch (t.layout.kind) {
    case "fillDuration": {
      const cycleMs = cycleDurationMs(t);
      const targetMs = Math.max(durationMin, 0) * 60_000;
      let elapsed = 0;
      do {
        pushCycle();
        elapsed += cycleMs;
      } while (elapsed < targetMs);
      break;
    }
    case "fixedCycles": {
      for (let i = 0; i < t.layout.cycles; i++) pushCycle();
      break;
    }
    case "rounds": {
      const { rounds, cyclesPerRound, roundEnd, rest } = t.layout;
      for (let r = 0; r < rounds; r++) {
        roundNum = r + 1;
        for (let c = 0; c < cyclesPerRound; c++) pushCycle();
        if (roundEnd) pushFiller(roundEnd, "roundEnd");
        if (rest && r < rounds - 1) pushFiller(rest, "rest");
      }
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type UseBreathSessionConfig = {
  technique: Technique;
  durationMin: number;
  /** Fired when the active phase changes during `running`. */
  onPhaseEnter?: (phase: ExpandedPhase, index: number) => void;
  /** Fired once when entering the `running` state (after `ready`). */
  onStartRunning?: () => void;
  /** Fired once when the session completes naturally or via skipToEnd. */
  onComplete?: () => void;
};

export type BreathSession = {
  status: SessionStatus;
  currentPhase: ExpandedPhase | null;
  phaseIndex: number;
  phaseElapsedMs: number;
  phaseRemainingMs: number;
  totalElapsedMs: number;
  totalDurationMs: number;
  readyRemainingMs: number;
  cyclesCompleted: number;
  totalCycles: number;
  currentRound: number;
  totalRounds: number;
  isRoundEnd: boolean;
  isRest: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  skipPhase: () => void;
  skipToEnd: () => void;
  abort: () => void;
};

export function useBreathSession({
  technique,
  durationMin,
  onPhaseEnter,
  onStartRunning,
  onComplete,
}: UseBreathSessionConfig): BreathSession {
  const phases = useMemo(
    () => expandWithMeta(technique, durationMin),
    [technique, durationMin],
  );

  const totalDurationMs = useMemo(
    () => phases.reduce((s, p) => s + p.durationMs, 0),
    [phases],
  );
  const totalCycles = useMemo(() => {
    let max = 0;
    for (const p of phases) if (p.cycleNumber > max) max = p.cycleNumber;
    return max;
  }, [phases]);
  const totalRounds = useMemo(() => {
    let max = 0;
    for (const p of phases) if (p.roundNumber > max) max = p.roundNumber;
    return max;
  }, [phases]);

  const [state, dispatch] = useReducer(reducer, initialState);

  // (Re)load the phase list whenever it changes.
  useEffect(() => {
    dispatch({
      type: "LOAD",
      phases,
      totalDurationMs,
      totalCycles,
    });
  }, [phases, totalDurationMs, totalCycles]);

  // Keep callbacks in refs so the rAF loop doesn't restart on every render.
  const onPhaseEnterRef = useRef(onPhaseEnter);
  const onStartRunningRef = useRef(onStartRunning);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onPhaseEnterRef.current = onPhaseEnter;
    onStartRunningRef.current = onStartRunning;
    onCompleteRef.current = onComplete;
  }, [onPhaseEnter, onStartRunning, onComplete]);

  // Fire onPhaseEnter when phaseIndex changes during running. (We compare
  // against a ref so we don't fire on initial mount or on pause/resume.)
  const lastFiredIndexRef = useRef<number>(-1);
  useEffect(() => {
    if (state.status !== "running") return;
    if (state.phaseIndex !== lastFiredIndexRef.current) {
      lastFiredIndexRef.current = state.phaseIndex;
      const phase = state.phases[state.phaseIndex];
      if (phase) onPhaseEnterRef.current?.(phase, state.phaseIndex);
    }
  }, [state.status, state.phaseIndex, state.phases]);

  // Fire onStartRunning the first time we enter `running`.
  const startedRunningRef = useRef(false);
  useEffect(() => {
    if (state.status === "running" && !startedRunningRef.current) {
      startedRunningRef.current = true;
      onStartRunningRef.current?.();
      // Also fire onPhaseEnter for the first phase, which the index-change
      // effect won't catch (lastFiredIndex starts at -1, phaseIndex starts at 0).
      if (state.phaseIndex === 0 && state.phases[0]) {
        lastFiredIndexRef.current = 0;
        onPhaseEnterRef.current?.(state.phases[0], 0);
      }
    }
    if (state.status === "idle") {
      startedRunningRef.current = false;
      lastFiredIndexRef.current = -1;
    }
  }, [state.status, state.phaseIndex, state.phases]);

  // Fire onComplete when we hit `complete`.
  const firedCompleteRef = useRef(false);
  useEffect(() => {
    if (state.status === "complete" && !firedCompleteRef.current) {
      firedCompleteRef.current = true;
      onCompleteRef.current?.();
    }
    if (state.status === "idle") firedCompleteRef.current = false;
  }, [state.status]);

  // The rAF loop. Active during 'ready' and 'running' only.
  useEffect(() => {
    if (state.status !== "ready" && state.status !== "running") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (state.status === "ready") {
        dispatch({ type: "READY_TICK", deltaMs: dt });
      } else {
        dispatch({ type: "RUN_TICK", deltaMs: dt });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // We intentionally restart the loop only when status crosses the
    // running/ready boundary, not on every tick.
  }, [state.status]);

  // Derived selectors
  const currentPhase = state.phases[state.phaseIndex] ?? null;
  const phaseRemainingMs = currentPhase
    ? Math.max(0, currentPhase.durationMs - state.phaseElapsedMs)
    : 0;
  const cyclesCompleted = currentPhase
    ? currentPhase.cycleNumber > 0
      ? currentPhase.cycleNumber
      : // We're in a rest/roundEnd: report the cycle count we just finished.
        Math.max(
          0,
          ...state.phases
            .slice(0, state.phaseIndex + 1)
            .map((p) => p.cycleNumber),
        )
    : 0;
  const currentRound = currentPhase?.roundNumber ?? 0;

  const start = useCallback(() => dispatch({ type: "START" }), []);
  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const resume = useCallback(() => dispatch({ type: "RESUME" }), []);
  const skipPhase = useCallback(() => dispatch({ type: "SKIP_PHASE" }), []);
  const skipToEnd = useCallback(() => dispatch({ type: "SKIP_TO_END" }), []);
  const abort = useCallback(() => dispatch({ type: "ABORT" }), []);

  return {
    status: state.status,
    currentPhase,
    phaseIndex: state.phaseIndex,
    phaseElapsedMs: state.phaseElapsedMs,
    phaseRemainingMs,
    totalElapsedMs: state.totalElapsedMs,
    totalDurationMs: state.totalDurationMs,
    readyRemainingMs: state.readyRemainingMs,
    cyclesCompleted,
    totalCycles,
    currentRound,
    totalRounds,
    isRoundEnd: currentPhase?.isRoundEnd ?? false,
    isRest: currentPhase?.isRest ?? false,
    start,
    pause,
    resume,
    skipPhase,
    skipToEnd,
    abort,
  };
}