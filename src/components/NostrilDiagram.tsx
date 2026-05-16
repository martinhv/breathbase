type Props = { nostril: "left" | "right" | null };

/**
 * Schematic head with a hand pressing one nostril closed for alternate-nostril
 * breathing. `nostril` is the *open* nostril (the one the user is breathing
 * through this phase) — the diagram shows a fingertip on the opposite side.
 */
export function NostrilDiagram({ nostril }: Props) {
  if (!nostril) return null;
  // The "closed" side is the opposite of the open side.
  const closeRight = nostril === "left";
  return (
    <div
      aria-label={`${nostril} nostril open`}
      role="img"
      className="flex flex-col items-center gap-2"
    >
      <svg
        viewBox="0 0 120 120"
        width="96"
        height="96"
        className="text-slate-800 dark:text-slate-200"
      >
        {/* Face */}
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
        {/* Nose */}
        <path
          d="M60 50 L60 72"
          stroke="currentColor"
          strokeOpacity="0.6"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Nostril dots */}
        <circle
          cx="54"
          cy="76"
          r="3"
          fill={closeRight ? "currentColor" : "#5eead4"}
          opacity={closeRight ? 0.3 : 1}
        />
        <circle
          cx="66"
          cy="76"
          r="3"
          fill={closeRight ? "#5eead4" : "currentColor"}
          opacity={closeRight ? 1 : 0.3}
        />
        {/* Finger (a rounded rectangle on the closed side) */}
        <rect
          x={closeRight ? "44" : "68"}
          y="68"
          width="10"
          height="20"
          rx="5"
          fill="#fbbf24"
          opacity="0.85"
        />
      </svg>
      <div className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400">
        Open: {nostril}
      </div>
    </div>
  );
}
