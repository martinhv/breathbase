import type { ExpandedPhase } from "@/hooks/useBreathSession";

type Props = {
  phase: ExpandedPhase;
  remainingMs: number;
};

export function PhaseIndicator({ phase, remainingMs }: Props) {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return (
    <div className="flex flex-col items-center gap-1 text-center select-none">
      <div
        className="text-3xl sm:text-4xl font-light tracking-wide"
        role="status"
        aria-live="polite"
      >
        {phase.label}
      </div>
      <div
        aria-hidden
        className="text-6xl sm:text-7xl font-extralight tabular-nums text-slate-100/90"
      >
        {seconds}
      </div>
      {phase.meta?.note && (
        <div className="mt-1 text-sm text-slate-400/90 italic">
          {phase.meta.note}
        </div>
      )}
    </div>
  );
}
