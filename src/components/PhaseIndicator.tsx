import type { ExpandedPhase } from "@/hooks/useBreathSession";

type Props = {
  phase: ExpandedPhase;
  remainingMs: number;
};

export function PhaseIndicator({ phase, remainingMs }: Props) {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return (
    <div className="flex flex-col items-center gap-1 text-center select-none">
      {/* Visual label — aria-hidden so the visually hidden live region below
          is the single source of truth for screen readers (avoids the label
          and the live announcement double-speaking). */}
      <div
        aria-hidden
        className="text-3xl sm:text-4xl font-light tracking-wide"
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
        <div
          aria-hidden
          className="mt-1 text-sm text-slate-400/90 italic"
        >
          {phase.meta.note}
        </div>
      )}
      {/* Screen-reader-only live region. Re-announces on each phase change
          and includes the starting countdown so non-sighted users can pace
          themselves. */}
      <div role="status" aria-live="polite" className="sr-only">
        {phase.label}, {seconds} second{seconds === 1 ? "" : "s"}
      </div>
    </div>
  );
}
