import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  computeStreak,
  lastSession,
  totalMinutes,
  type SessionEntry,
} from "./storage";

// All tests work in UTC. computeStreak's day boundary is UTC midnight.

function entry(startedAt: string, durationMs = 5 * 60_000): SessionEntry {
  return {
    techniqueId: "box-breathing",
    techniqueName: "Box",
    category: "balance",
    startedAt,
    durationMs,
    cyclesCompleted: 1,
  };
}

describe("totalMinutes", () => {
  it("rounds total session ms to whole minutes", () => {
    expect(
      totalMinutes([
        entry("2026-01-01T00:00:00Z", 5 * 60_000),
        entry("2026-01-02T00:00:00Z", 7 * 60_000),
      ]),
    ).toBe(12);
  });
  it("returns 0 for an empty history", () => {
    expect(totalMinutes([])).toBe(0);
  });
});

describe("lastSession", () => {
  it("returns the first entry (history is desc-ordered)", () => {
    const newer = entry("2026-01-02T00:00:00Z");
    const older = entry("2026-01-01T00:00:00Z");
    expect(lastSession([newer, older])).toBe(newer);
  });
  it("returns null for an empty history", () => {
    expect(lastSession([])).toBeNull();
  });
});

describe("computeStreak", () => {
  beforeEach(() => {
    // Freeze "now" at 2026-05-15T12:00:00 UTC so day math is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for empty history", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("counts today as 1 if there's a session today", () => {
    expect(computeStreak([entry("2026-05-15T08:00:00Z")])).toBe(1);
  });

  it("counts consecutive prior days", () => {
    const h = [
      entry("2026-05-15T08:00:00Z"),
      entry("2026-05-14T08:00:00Z"),
      entry("2026-05-13T08:00:00Z"),
    ];
    expect(computeStreak(h)).toBe(3);
  });

  it("allows a streak to start at yesterday if today has no session", () => {
    const h = [
      entry("2026-05-14T08:00:00Z"),
      entry("2026-05-13T08:00:00Z"),
    ];
    expect(computeStreak(h)).toBe(2);
  });

  it("returns 0 if neither today nor yesterday has a session", () => {
    const h = [entry("2026-05-10T08:00:00Z")];
    expect(computeStreak(h)).toBe(0);
  });

  it("stops at the first gap", () => {
    const h = [
      entry("2026-05-15T08:00:00Z"),
      entry("2026-05-14T08:00:00Z"),
      // gap: nothing on May 13
      entry("2026-05-12T08:00:00Z"),
    ];
    expect(computeStreak(h)).toBe(2);
  });

  it("collapses multiple sessions on the same day into one streak step", () => {
    const h = [
      entry("2026-05-15T08:00:00Z"),
      entry("2026-05-15T18:00:00Z"),
      entry("2026-05-14T08:00:00Z"),
    ];
    expect(computeStreak(h)).toBe(2);
  });
});
