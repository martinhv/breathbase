// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { nextReminderAt } from "./notifications";

describe("nextReminderAt", () => {
  it("schedules today when the time hasn't passed yet", () => {
    const now = new Date("2026-05-17T07:00:00");
    const at = nextReminderAt("08:00", now)!;
    expect(at.getHours()).toBe(8);
    expect(at.getMinutes()).toBe(0);
    expect(at.toDateString()).toBe(now.toDateString());
  });

  it("schedules tomorrow when the time has already passed today", () => {
    const now = new Date("2026-05-17T09:00:00");
    const at = nextReminderAt("08:00", now)!;
    expect(at.getHours()).toBe(8);
    expect(at.getMinutes()).toBe(0);
    expect(at.getDate()).toBe(now.getDate() + 1);
  });

  it("schedules tomorrow when 'now' is exactly the reminder time", () => {
    // A timer firing at exactly 08:00:00 should re-arm for the next day, not
    // re-fire immediately.
    const now = new Date("2026-05-17T08:00:00");
    const at = nextReminderAt("08:00", now)!;
    expect(at.getDate()).toBe(now.getDate() + 1);
  });

  it("returns null for invalid strings", () => {
    const now = new Date("2026-05-17T07:00:00");
    expect(nextReminderAt("", now)).toBeNull();
    expect(nextReminderAt("bad", now)).toBeNull();
    expect(nextReminderAt("25:00", now)).toBeNull();
    expect(nextReminderAt("08:60", now)).toBeNull();
    expect(nextReminderAt("8", now)).toBeNull();
  });

  it("accepts single-digit hours", () => {
    const now = new Date("2026-05-17T05:00:00");
    const at = nextReminderAt("9:30", now)!;
    expect(at.getHours()).toBe(9);
    expect(at.getMinutes()).toBe(30);
  });
});