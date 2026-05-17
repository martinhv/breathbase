import { describe, expect, it } from "vitest";
import { THEMES, THEME_ORDER, getTheme, type ThemeId } from "./themes";
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
