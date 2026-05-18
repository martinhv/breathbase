// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from "vitest";
import {
  THEMES,
  THEME_ORDER,
  getTheme,
  suggestedThemeForHour,
  type ThemeId,
} from "./themes";
import { findTechnique } from "./techniques";

describe("THEMES", () => {
  it("THEME_ORDER covers every theme exactly once", () => {
    const fromOrder = new Set(THEME_ORDER);
    const fromRecord = new Set(Object.keys(THEMES) as ThemeId[]);
    expect(fromOrder).toEqual(fromRecord);
    expect(THEME_ORDER.length).toBe(Object.keys(THEMES).length);
  });

  it("every theme references real technique ids", () => {
    for (const id of THEME_ORDER) {
      for (const tid of THEMES[id].techniqueIds) {
        expect(findTechnique(tid), `${id} → ${tid}`).toBeDefined();
      }
    }
  });

  it("every theme has at least one technique", () => {
    for (const id of THEME_ORDER) {
      expect(THEMES[id].techniqueIds.length, id).toBeGreaterThan(0);
    }
  });

  it("technique ids within a theme are unique", () => {
    for (const id of THEME_ORDER) {
      const ids = THEMES[id].techniqueIds;
      expect(new Set(ids).size, id).toBe(ids.length);
    }
  });
});

describe("getTheme", () => {
  it("returns the named theme", () => {
    expect(getTheme("sleep")?.id).toBe("sleep");
    expect(getTheme("focus")?.id).toBe("focus");
  });
  it("returns undefined for unknown ids", () => {
    // @ts-expect-error — testing a runtime guard for invalid id strings.
    expect(getTheme("does-not-exist")).toBeUndefined();
  });
});

describe("suggestedThemeForHour", () => {
  it("morning hours suggest energy", () => {
    expect(suggestedThemeForHour(6).id).toBe("energy");
    expect(suggestedThemeForHour(10).id).toBe("energy");
  });
  it("midday suggests focus", () => {
    expect(suggestedThemeForHour(11).id).toBe("focus");
    expect(suggestedThemeForHour(16).id).toBe("focus");
  });
  it("late afternoon suggests stress reset", () => {
    expect(suggestedThemeForHour(17).id).toBe("stress");
    expect(suggestedThemeForHour(19).id).toBe("stress");
  });
  it("evening + night + early morning suggest sleep", () => {
    expect(suggestedThemeForHour(20).id).toBe("sleep");
    expect(suggestedThemeForHour(23).id).toBe("sleep");
    expect(suggestedThemeForHour(0).id).toBe("sleep");
    expect(suggestedThemeForHour(4).id).toBe("sleep");
  });
});