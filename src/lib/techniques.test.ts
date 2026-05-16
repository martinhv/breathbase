import { describe, expect, it } from "vitest";
import {
  cycleDurationMs,
  expandSession,
  findTechnique,
  sessionDurationMs,
  TECHNIQUES,
  techniquesByCategory,
  type Technique,
} from "./techniques";

const physiologicalSigh = findTechnique("physiological-sigh")!;
const fourSevenEight = findTechnique("four-seven-eight")!;
const boxBreathing = findTechnique("box-breathing")!;
const energizing = findTechnique("energizing-breath")!;

describe("findTechnique", () => {
  it("returns the technique for a known id", () => {
    expect(findTechnique("box-breathing")?.id).toBe("box-breathing");
  });
  it("returns undefined for an unknown id", () => {
    expect(findTechnique("does-not-exist")).toBeUndefined();
  });
});

describe("techniquesByCategory", () => {
  it("filters techniques by category", () => {
    const downreg = techniquesByCategory("downregulate");
    expect(downreg.length).toBeGreaterThan(0);
    expect(downreg.every((t) => t.category === "downregulate")).toBe(true);
  });
  it("covers every TECHNIQUES entry across the four categories", () => {
    const total =
      techniquesByCategory("downregulate").length +
      techniquesByCategory("upregulate").length +
      techniquesByCategory("balance").length +
      techniquesByCategory("focus").length;
    expect(total).toBe(TECHNIQUES.length);
  });
});

describe("cycleDurationMs", () => {
  it("sums phase durations for a single cycle", () => {
    // box breathing: 4+4+4+4 = 16s
    expect(cycleDurationMs(boxBreathing)).toBe(16_000);
  });
  it("handles physiological sigh's three-phase cycle (1.5+1+7s)", () => {
    expect(cycleDurationMs(physiologicalSigh)).toBe(9_500);
  });
});

describe("expandSession", () => {
  describe("fillDuration layout", () => {
    it("emits at least one full cycle even for 0-minute requests", () => {
      const phases = expandSession(boxBreathing, 0);
      expect(phases.length).toBe(boxBreathing.cycle.length);
    });
    it("never cuts a cycle mid-phase — actual length may overshoot", () => {
      // 5 minutes of box breathing (cycle=16s) → 18.75 cycles → rounds up to 19
      const phases = expandSession(boxBreathing, 5);
      const totalMs = sessionDurationMs(phases);
      expect(totalMs).toBeGreaterThanOrEqual(5 * 60_000);
      expect(phases.length % boxBreathing.cycle.length).toBe(0);
    });
    it("scales with requested duration", () => {
      const short = expandSession(boxBreathing, 2);
      const long = expandSession(boxBreathing, 10);
      expect(long.length).toBeGreaterThan(short.length);
    });
  });

  describe("rounds layout", () => {
    it("emits rounds × cyclesPerRound + roundEnd + (rounds-1) × rest", () => {
      // energizing-breath: 2 rounds × 30 cycles, each round ends with
      // 2-phase roundEnd, with 3-phase rest between rounds.
      const phases = expandSession(energizing, 0);
      const cycleLen = energizing.cycle.length;
      const roundEndLen = 2;
      const restLen = 3;
      const expected =
        2 * 30 * cycleLen + 2 * roundEndLen + 1 * restLen;
      expect(phases.length).toBe(expected);
    });
    it("durationMin is ignored for rounds layout", () => {
      const a = expandSession(energizing, 1);
      const b = expandSession(energizing, 60);
      expect(a.length).toBe(b.length);
    });
  });

  it("4-7-8 phase totals add up to 19s per cycle", () => {
    expect(cycleDurationMs(fourSevenEight)).toBe(19_000);
  });
});

describe("TECHNIQUES invariants", () => {
  it.each(TECHNIQUES as Technique[])(
    "$id has consistent duration range and default",
    (t) => {
      const [min, max] = t.durationRangeMin;
      expect(min).toBeGreaterThan(0);
      expect(min).toBeLessThanOrEqual(max);
      expect(t.defaultDurationMin).toBeGreaterThanOrEqual(min);
      expect(t.defaultDurationMin).toBeLessThanOrEqual(max);
    },
  );
  it.each(TECHNIQUES as Technique[])("$id has at least one phase", (t) => {
    expect(t.cycle.length).toBeGreaterThan(0);
    for (const p of t.cycle) {
      expect(p.durationMs).toBeGreaterThan(0);
    }
  });
});
