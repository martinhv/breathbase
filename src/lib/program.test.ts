import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROGRAM_STATE,
  FOUNDATIONS_ID,
  PROGRAMS,
  PROGRAM_FOR_GOAL,
  PROGRAM_ORDER,
  enrollState,
  getProgram,
  getProgramDay,
  isDayComplete,
  isDayUnlocked,
  isProgramComplete,
  markDayComplete,
  nextProgramDay,
  programLength,
  type ProgramGoal,
  type ProgramId,
  type ProgramState,
} from "./program";
import { findTechnique } from "./techniques";

const enrolledFresh = (programId: ProgramId = FOUNDATIONS_ID): ProgramState => ({
  enrolled: true,
  programId,
  startedAt: "2026-05-17T00:00:00Z",
  completedDays: [],
});

describe("PROGRAMS library", () => {
  it("PROGRAM_ORDER lists every program exactly once", () => {
    const fromOrder = new Set(PROGRAM_ORDER);
    const fromRecord = new Set(Object.keys(PROGRAMS) as ProgramId[]);
    expect(fromOrder).toEqual(fromRecord);
    expect(PROGRAM_ORDER.length).toBe(Object.keys(PROGRAMS).length);
  });
  it("every program day references a real technique", () => {
    for (const id of PROGRAM_ORDER) {
      for (const d of PROGRAMS[id].days) {
        expect(findTechnique(d.techniqueId), `${id} day ${d.day}`).toBeDefined();
      }
    }
  });
  it("every program day's duration lies inside the technique's allowed range", () => {
    for (const id of PROGRAM_ORDER) {
      for (const d of PROGRAMS[id].days) {
        const t = findTechnique(d.techniqueId)!;
        const [min, max] = t.durationRangeMin;
        expect(d.durationMin, `${id} day ${d.day}`).toBeGreaterThanOrEqual(min);
        expect(d.durationMin, `${id} day ${d.day}`).toBeLessThanOrEqual(max);
      }
    }
  });
  it("every program numbers days 1..N in order", () => {
    for (const id of PROGRAM_ORDER) {
      PROGRAMS[id].days.forEach((d, i) => expect(d.day).toBe(i + 1));
    }
  });
});

describe("PROGRAM_FOR_GOAL", () => {
  it("maps every goal to an existing program", () => {
    const goals: ProgramGoal[] = ["curiosity", "sleep", "stress", "focus", "energy"];
    for (const g of goals) {
      const id = PROGRAM_FOR_GOAL[g];
      expect(PROGRAMS[id], g).toBeDefined();
    }
  });
  it("curiosity maps to foundations", () => {
    expect(PROGRAM_FOR_GOAL.curiosity).toBe(FOUNDATIONS_ID);
  });
});

describe("getProgram", () => {
  it("returns the named program", () => {
    expect(getProgram("sleep").id).toBe("sleep");
  });
  it("falls back to foundations for unknown ids", () => {
    expect(getProgram("does-not-exist" as ProgramId).id).toBe(FOUNDATIONS_ID);
  });
});

describe("getProgramDay", () => {
  it("returns the day for a valid number", () => {
    expect(getProgramDay("foundations", 1)?.day).toBe(1);
    expect(getProgramDay("sleep", 7)?.day).toBe(7);
  });
  it("returns undefined for out-of-range numbers", () => {
    expect(getProgramDay("foundations", 0)).toBeUndefined();
    expect(getProgramDay("foundations", 8)).toBeUndefined();
  });
});

describe("isDayUnlocked", () => {
  it("day 1 is always unlocked when enrolled", () => {
    expect(isDayUnlocked(enrolledFresh(), 1)).toBe(true);
    expect(isDayUnlocked(enrolledFresh("sleep"), 1)).toBe(true);
  });
  it("day 2 is locked until day 1 is complete", () => {
    expect(isDayUnlocked(enrolledFresh(), 2)).toBe(false);
    expect(
      isDayUnlocked({ ...enrolledFresh(), completedDays: [1] }, 2),
    ).toBe(true);
  });
  it("day N>1 keys off day N-1 specifically", () => {
    const state: ProgramState = { ...enrolledFresh(), completedDays: [1, 2] };
    expect(isDayUnlocked(state, 3)).toBe(true);
    expect(isDayUnlocked(state, 4)).toBe(false);
  });
  it("returns false for out-of-range days", () => {
    const state = enrolledFresh();
    expect(isDayUnlocked(state, 0)).toBe(false);
    expect(isDayUnlocked(state, programLength(state.programId) + 1)).toBe(false);
  });
});

describe("nextProgramDay", () => {
  it("is day 1 for a fresh enrollment", () => {
    expect(nextProgramDay(enrolledFresh())).toBe(1);
  });
  it("returns the lowest uncompleted day", () => {
    const state: ProgramState = { ...enrolledFresh(), completedDays: [1, 3] };
    expect(nextProgramDay(state)).toBe(2);
  });
  it("is null once all days are complete", () => {
    const state = enrolledFresh();
    const all = Array.from(
      { length: programLength(state.programId) },
      (_, i) => i + 1,
    );
    expect(nextProgramDay({ ...state, completedDays: all })).toBeNull();
  });
});

describe("isProgramComplete", () => {
  it("is false when any day is missing", () => {
    expect(isProgramComplete(enrolledFresh())).toBe(false);
  });
  it("is true once every day is in completedDays", () => {
    for (const id of PROGRAM_ORDER) {
      const all = Array.from(
        { length: programLength(id) },
        (_, i) => i + 1,
      );
      expect(
        isProgramComplete({ ...enrolledFresh(id), completedDays: all }),
        id,
      ).toBe(true);
    }
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
    expect(markDayComplete(state, programLength(state.programId) + 1)).toBe(
      state,
    );
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
  it("flips enrolled to true, records startedAt, sets programId", () => {
    const now = new Date("2026-05-17T12:00:00Z");
    const s = enrollState("sleep", now);
    expect(s.enrolled).toBe(true);
    expect(s.programId).toBe("sleep");
    expect(s.startedAt).toBe(now.toISOString());
    expect(s.completedDays).toEqual([]);
  });
  it("defaults to foundations when no id given", () => {
    expect(enrollState().programId).toBe(FOUNDATIONS_ID);
  });
});

describe("DEFAULT_PROGRAM_STATE", () => {
  it("is not enrolled, defaults programId to foundations", () => {
    expect(DEFAULT_PROGRAM_STATE.enrolled).toBe(false);
    expect(DEFAULT_PROGRAM_STATE.programId).toBe(FOUNDATIONS_ID);
    expect(DEFAULT_PROGRAM_STATE.startedAt).toBeNull();
    expect(DEFAULT_PROGRAM_STATE.completedDays).toEqual([]);
  });
});
