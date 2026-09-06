import { describe, expect, it } from "vitest";
import { groupFrameIdMap, groupsForFrame, resolveLayersFrame } from "./layer-selection";
import { makeItem, type Frame, type Group } from "./tokens";

const a: Frame = { id: "a", name: "A", x: 0, y: 0 };
const b: Frame = { id: "b", name: "B", x: 600, y: 0 };
const onA: Group = { id: "ga", x: 16, y: 120, axis: "x", items: [{ ...makeItem("button"), id: "ia" }] };
const onB: Group = { id: "gb", x: 616, y: 120, axis: "x", items: [{ ...makeItem("button"), id: "ib" }] };

describe("layer frame selection", () => {
  it("maps groups to the screen containing their center", () => {
    expect([...groupFrameIdMap([onA, onB], [a, b], {}, "phone")]).toEqual([
      ["ga", "a"],
      ["gb", "b"],
    ]);
  });

  it("prefers the selected item's screen over remembered screen state", () => {
    const map = new Map([["ga", "a"], ["gb", "b"]]);
    expect(resolveLayersFrame({
      frameMode: "phone",
      frames: [a, b],
      groups: [onA, onB],
      groupFrames: map,
      primaryItemId: "ib",
      selectedFrameId: null,
      rememberedFrameId: "a",
    })?.id).toBe("b");
  });

  it("falls back to explicit, remembered, then first frame", () => {
    const common = { frameMode: "phone" as const, frames: [a, b], groups: [onA], groupFrames: new Map([["ga", "a"]]), primaryItemId: null };
    expect(resolveLayersFrame({ ...common, selectedFrameId: "b", rememberedFrameId: "a" })?.id).toBe("b");
    expect(resolveLayersFrame({ ...common, selectedFrameId: null, rememberedFrameId: "b" })?.id).toBe("b");
    expect(resolveLayersFrame({ ...common, selectedFrameId: null, rememberedFrameId: null })?.id).toBe("a");
  });

  it("returns no frame ownership in blank canvas mode", () => {
    expect(groupFrameIdMap([onA], [a], {}, "blank").size).toBe(0);
  });

  it("filters layers by resolved screen", () => {
    expect(groupsForFrame([onA, onB], new Map([["ga", "a"], ["gb", "b"]]), "b")).toEqual([onB]);
  });
});
