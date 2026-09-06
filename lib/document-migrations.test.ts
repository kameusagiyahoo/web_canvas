import { describe, expect, it } from "vitest";
import { KIND_SPEC, NAV_BAR_H, frameRect, makeItem, type Frame, type Group } from "./tokens";
import { migrateLegacyGroups } from "./document-migrations";

const frame: Frame = { id: "f", name: "Home", x: 0, y: 0 };

describe("legacy document migrations", () => {
  it("moves an old navigation bar to the current bottom inset", () => {
    const oldHeight = KIND_SPEC.bottomNav.h - NAV_BAR_H;
    const group: Group = {
      id: "g",
      x: 0,
      y: frameRect(frame).b - oldHeight,
      axis: "x",
      items: [{ ...makeItem("bottomNav"), id: "nav" }],
    };
    const [migrated] = migrateLegacyGroups([group], [frame]);
    expect(migrated.y).toBe(frameRect(frame).b - KIND_SPEC.bottomNav.h);
  });

  it("leaves unrelated groups by reference", () => {
    const group: Group = {
      id: "g",
      x: 16,
      y: 120,
      axis: "x",
      items: [{ ...makeItem("button"), id: "button" }],
    };
    expect(migrateLegacyGroups([group], [frame])[0]).toBe(group);
  });
});
