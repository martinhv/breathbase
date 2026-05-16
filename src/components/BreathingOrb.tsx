import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { PhaseKind } from "@/lib/techniques";

// Target scales per phase kind. inhale → fully expanded, exhale → contracted,
// hold_in/hold_out → freeze at the prior extreme. The actual freeze is
// achieved by the *scale* not changing across the hold phase (so Framer
// Motion treats it as a zero-delta transition and the orb visually holds).
const SCALE: Record<PhaseKind, number> = {
  inhale: 1.0,
  hold_in: 1.0,
  exhale: 0.32,
  hold_out: 0.32,
};

// Color per phase kind. Cool blue for inhale, warm amber for holds (the
// "still" moments), deeper blue for exhale.
const COLOR: Record<PhaseKind, string> = {
  inhale: "#60a5fa", // sky-400
  hold_in: "#fbbf24", // amber-400
  exhale: "#3b82f6", // blue-500
  hold_out: "#f59e0b", // amber-500
};

type Props = {
  phaseKind: PhaseKind;
  durationMs: number;
  /** When true (or paused), the orb stops animating to current scale. */
  paused?: boolean;
};

export function BreathingOrb({ phaseKind, durationMs, paused }: Props) {
  const reducedMotion = useReducedMotion();
  const targetScale = SCALE[phaseKind];
  const targetColor = COLOR[phaseKind];
  const durationSec = durationMs / 1000;

  if (reducedMotion) {
    // Reduced-motion path: keep the orb a constant size, pulse opacity only.
    return (
      <div className="relative flex items-center justify-center">
        <motion.div
          className="rounded-full"
          aria-hidden
          style={{
            width: 240,
            height: 240,
            background: `radial-gradient(circle at 35% 30%, ${targetColor}cc, ${targetColor}66 60%, transparent 75%)`,
            boxShadow: `0 0 80px 10px ${targetColor}66`,
          }}
          animate={
            paused
              ? { opacity: 0.7 }
              : phaseKind === "inhale" || phaseKind === "exhale"
                ? { opacity: phaseKind === "inhale" ? [0.55, 1] : [1, 0.55] }
                : { opacity: 0.85 }
          }
          transition={{ duration: durationSec, ease: "easeInOut" }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer soft glow follows scale with extra blur for atmosphere. */}
      <motion.div
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: 320,
          height: 320,
          filter: "blur(40px)",
        }}
        animate={{
          scale: paused ? undefined : targetScale,
          backgroundColor: targetColor,
          opacity: 0.35,
        }}
        transition={{ duration: durationSec, ease: "easeInOut" }}
      />
      {/* Main orb. */}
      <motion.div
        className="rounded-full"
        role="img"
        aria-label={`Breathing orb, ${phaseKind.replace("_", " ")}`}
        style={{ width: 240, height: 240 }}
        animate={{
          scale: paused ? undefined : targetScale,
          backgroundColor: targetColor,
        }}
        transition={{ duration: durationSec, ease: "easeInOut" }}
      />
      {/* Subtle inner highlight for depth. */}
      <motion.div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 240,
          height: 240,
          background:
            "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), transparent 55%)",
        }}
        animate={{ scale: paused ? undefined : targetScale }}
        transition={{ duration: durationSec, ease: "easeInOut" }}
      />
    </div>
  );
}
