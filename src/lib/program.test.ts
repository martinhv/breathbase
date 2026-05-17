import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROGRAM_STATE,
  PROGRAM,
  PROGRAM_LENGTH,
  enrollState,
  getProgramDay,
  isDayComplete,
  isDayUnlocked,
  isProgramComplete,
  markDayComplete,
  nextProgramDay,
  type ProgramState,
} from "./program";
import { findTechnique } from "./techniques";

const enrolledFresh = (): ProgramState => ({
  enrolled: true,
  startedAt: "2026-05-17T00:00:00Z",
  completedDays: [],
});

describe("PROGRAM curriculum", () => {
  it("has exactly PROGRAM_LENGTH days", () => {
    expect(PROGRAM.length).toBe(PROGRAM_LENGTH);
  });
  it("days are numbered 1..PROGRAM_LENGTH in order", () => {
    PROGRAM.forEach((d, i) => expect(d.day).toBe(i + 1));
  });
  it("every day references a real technique", () => {
    for (const d of PROGRAM) {
      expect(findTechnique(d.techniqueId), d.techniqueId).toBeDefined();
    }
  });
  it("every day's prescribed duration is within the technique's allowed range", () => {
    for (const d of PROGRAM) {
      const t = findTechnique(d.techniqueId)!;
      const [min, max] = t.durationRangeMin;
      expect(d.durationMin).toBeGreaterThanOrEqual(min);
      expect(d.durationMin).toBeLessThanOrEqual(max);
    }
  });
});

describe("getProgramDay", () => {
  it("returns the day for a valid number", () => {
    expect(getProgramDay(1)?.day).toBe(1);
    expect(getProgramDay(7)?.day).toBe(7);
  });
  it("returns undefined for out-of-range numbers", () => {
    expect(getProgramDay(0)).toBeUndefined();
    expect(getProgramDay(8)).toBeUndefined();
    expect(getProgramDay(-1)).toBeUndefined();
  });
});

describe("isDayUnlocked", () => {
  it("day 1 is always unlocked when enrolled", () => {
    expect(isDayUnlocked(enrolledFresh(), 1)).toBe(true);
  });
  it("day 2 is locked until day 1 is complete", () => {
    expect(isDayUnlocked(enrolledFresh(), 2)).toBe(false);
    expect(isDayUnlocked({ ...enrolledFresh(), completedDays: [1] }, 2)).toBe(
      true,
    );
  });
  it("day N>1 keys off day N-1 specifically", () => {
    // Each day only gates on its immediate predecessor; the linear UI flow
    // prevents skipping ahead in practice, so we don't need stricter checks.
    const state: ProgramState = { ...enrolledFresh(), completedDays: [1, 2] };
    expect(isDayUnlocked(state, 3)).toBe(true);
    expect(isDayUnlocked(state, 4)).toBe(false);
  });
  it("returns false for out-of-range days", () => {
    expect(isDayUnlocked(enrolledFresh(), 0)).toBe(false);
    expect(isDayUnlocked(enrolledFresh(), PROGRAM_LENGTH + 1)).toBe(false);
  });
});

describe("nextProgramDay", () => {
  it("is day 1 for a fresh enrollment", () => {
    expect(nextProgramDay(enrolledFresh())).toBe(1);
  });
  it("returns the lowest uncompleted day, not just last+1", () => {
    const state: ProgramState = { ...enrolledFresh(), completedDays: [1, 3] };
    expect(nextProgramDay(state)).toBe(2);
  });
  it("is null once all days are complete", () => {
    const all = Array.from({ length: PROGRAM_LENGTH }, (_, i) => i + 1);
    expect(nextProgramDay({ ...enrolledFresh(), completedDays: all })).toBeNull();
  });
});

describe("isProgramComplete", () => {
  it("is false when any day is missing", () => {
    expect(isProgramComplete(enrolledFresh())).toBe(false);
    const all = Array.from({ length: PROGRAM_LENGTH - 1 }, (_, i) => i + 1);
    expect(isProgramComplete({ ...enrolledFresh(), completedDays: all })).toBe(
      false,
    );
  });
  it("is true once every day is in completedDays", () => {
    const all = Array.from({ length: PROGRAM_LENGTH }, (_, i) => i + 1);
    expect(isProgramComplete({ ...enrolledFresh(), completedDays: all })).toBe(
      true,
    );
  });
});

describe("markDayComplete", () => {
  it("adds the day and keeps the list sorted", () => {
    const state: ProgramState = { ...enrolledFresh(), completedDays: [1, 3] };
    expect(markDayComplete(state, 2).completedDays).toEqual([1, 2, 3]);
  });
  it("is idempotent for already-completed days", () => {
    const state: ProgramState = { ...enrolledFresh(), completedDays: [1, 2] };
    expect(markDayComplete(state, 2).completedDays).toEqual([1, 2]);
  });
  it("ignores out-of-range day numbers", () => {
    const state = enrolledFresh();
    expect(markDayComplete(state, 0)).toBe(state);
    expect(markDayComplete(state, PROGRAM_LENGTH + 1)).toBe(state);
  });
});

describe("isDayComplete", () => {
  it("matches membership in completedDays", () => {
    const state: ProgramState = { ...enrolledFresh(), completedDays: [1, 3] };
    expect(isDayComplete(state, 1)).toBe(true);
    expect(isDayComplete(state, 2)).toBe(false);
    expect(isDayComplete(state, 3)).toBe(true);
  });
});

describe("enrollState", () => {
  it("flips enrolled to true and records startedAt", () => {
    const now = new Date("2026-05-17T12:00:00Z");
    const s = enrollState(now);
    expect(s.enrolled).toBe(true);
    expect(s.startedAt).toBe(now.toISOString());
    expect(s.completedDays).toEqual([]);
  });
});

describe("DEFAULT_PROGRAM_STATE", () => {
  it("is not enrolled and has no completed days", () => {
    expect(DEFAULT_PROGRAM_STATE.enrolled).toBe(false);
    expect(DEFAULT_PROGRAM_STATE.startedAt).toBeNull();
    expect(DEFAULT_PROGRAM_STATE.completedDays).toEqual([]);
  });
});
