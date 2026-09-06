import { describe, expect, it } from "vitest";
import { createDesktopSeed, createMobileSeed, localizedSeedFrame } from "./editor-seed";

describe("editor seeds", () => {
  it("keeps desktop seed ids deterministic", () => {
    expect(createDesktopSeed("en")).toEqual(createDesktopSeed("en"));
  });

  it("localizes desktop seed copy", () => {
    const en = createDesktopSeed("en");
    const ja = createDesktopSeed("ja");
    expect(en[1].items[0].label).not.toBe(ja[1].items[0].label);
  });

  it("injects mobile group ids for deterministic tests", () => {
    const ids = ["g1", "g2"];
    expect(createMobileSeed("en", () => ids.shift()!).map((g) => g.id)).toEqual([
      "g1",
      "g2",
    ]);
  });

  it("creates a localized initial mobile frame", () => {
    expect(localizedSeedFrame("en", () => "frame")).toEqual({
      id: "frame",
      name: "Home",
      x: 0,
      y: 0,
    });
  });
});
