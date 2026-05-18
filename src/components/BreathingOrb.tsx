// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { Category, PhaseKind } from "@/lib/techniques";

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

// Base color per phase kind. Categories shift the hue family below to give
// each practice a recognisable identity.
type Palette = Record<PhaseKind, string>;

const PALETTES: Record<Category, Palette> = {
  downregulate: {
    // Cool blues + deeper indigo holds — sleep-leaning palette.
    inhale: "#60a5fa", // sky-400
    hold_in: "#818cf8", // indigo-400
    exhale: "#3b82f6", // blue-500
    hold_out: "#6366f1", // indigo-500
  },
  upregulate: {
    // Warm energy — amber/orange for inhale, red/orange for the holds.
    inhale: "#fbbf24", // amber-400
    hold_in: "#f97316", // orange-500
    exhale: "#f59e0b", // amber-500
    hold_out: "#ea580c", // orange-600
  },
  balance: {
    // Teal-leaning, symmetric. Matches the brand accent.
    inhale: "#2dd4bf", // teal-400
    hold_in: "#5eead4", // teal-300
    exhale: "#14b8a6", // teal-500
    hold_out: "#5eead4",
  },
  focus: {
    // Violet/indigo, attention-anchoring.
    inhale: "#a78bfa", // violet-400
    hold_in: "#c4b5fd", // violet-300
    exhale: "#8b5cf6", // violet-500
    hold_out: "#c4b5fd",
  },
};

type Props = {
  phaseKind: PhaseKind;
  durationMs: number;
  /** Drives the colour palette. */
  category: Category;
  /**
   * Box breathing uses a literal square that scales 4-4-4-4 — the shape
   * reinforces the rhythm. Everything else stays a circle.
   */
  shape?: "circle" | "square";
  /** When true (or paused), the orb stops animating to current scale. */
  paused?: boolean;
};

export function BreathingOrb({
  phaseKind,
  durationMs,
  category,
  shape = "circle",
  paused,
}: Props) {
  const reducedMotion = useReducedMotion();
  const targetScale = SCALE[phaseKind];
  const targetColor = PALETTES[category][phaseKind];
  const durationSec = durationMs / 1000;
  const rounded = shape === "square" ? "rounded-3xl" : "rounded-full";

  if (reducedMotion) {
    // Reduced-motion path: keep the orb a constant size, pulse opacity only.
    return (
      <div className="relative flex items-center justify-center">
        <motion.div
          className={rounded}
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
        className={`absolute ${rounded}`}
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
        className={rounded}
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
        className={`absolute ${rounded} pointer-events-none`}
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