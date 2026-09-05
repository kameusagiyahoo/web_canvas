import { describe, expect, it } from "vitest";
import {
  appendDroppedGroup,
  isDropInsideViewport,
  placeDroppedItem,
  targetFrameForDrop,
} from "./drop-placement";
import { frameSizeOf, makeItem, sizeOf, type Frame, type Group } from "./tokens";

const widths: Record<string, number> = {};
const view = { x: 0, y: 0, z: 1 };
const viewport = { width: 800, height: 800 };
const frame: Frame = { id: "f1", name: "Home", x: 100, y: 50 };

describe("drop placement", () => {
  it("rejects palette drops whose full original item is outside the viewport", () => {
    const item = makeItem("button");
    expect(
      isDropInsideViewport(-200, 20, sizeOf(item, widths), view, viewport),
    ).toBe(false);

    const result = placeDroppedItem({
      item,
      rawX: -200,
      rawY: 20,
      fromPalette: true,
      frameMode: "blank",
      groups: [],
      frames: [],
      widths,
      view,
      viewport,
      groupId: "g1",
    });
    expect(result).toEqual({ accepted: false, reason: "outside-viewport" });
  });

  it("does not apply viewport rejection when moving an existing canvas item", () => {
    const item = makeItem("button");
    const result = placeDroppedItem({
      item,
      rawX: -200,
      rawY: 20,
      fromPalette: false,
      frameMode: "blank",
      groups: [],
      frames: [],
      widths,
      view,
      viewport,
      groupId: "g1",
    });
    expect(result.accepted).toBe(true);
  });

  it("selects a phone frame by the dropped item's centre", () => {
    const item = makeItem("button");
    expect(targetFrameForDrop(item, 120, 100, [frame], widths)?.id).toBe("f1");
    expect(targetFrameForDrop(item, -400, -400, [frame], widths)).toBeNull();
  });

  it("adapts a full-width bar to the target frame and its slot", () => {
    const item = makeItem("topAppBar");
    const result = placeDroppedItem({
      item,
      rawX: frame.x + 40,
      rawY: frame.y + 20,
      fromPalette: false,
      frameMode: "phone",
      groups: [],
      frames: [frame],
      widths,
      view,
      viewport,
      groupId: "g1",
    });
    if (!result.accepted) throw new Error("drop rejected");

    expect(result.targetFrame?.id).toBe(frame.id);
    expect(result.group.x).toBe(frame.x);
    expect(sizeOf(result.item, widths).w).toBe(frameSizeOf(frame).w);
  });

  it("pulls an adapted drop back inside its target frame", () => {
    const item = makeItem("button");
    const size = sizeOf(item, widths);
    const result = placeDroppedItem({
      item,
      rawX: frame.x + frameSizeOf(frame).w - size.w / 2 - 1,
      rawY: frame.y + 100,
      fromPalette: false,
      frameMode: "phone",
      groups: [],
      frames: [frame],
      widths,
      view,
      viewport,
      groupId: "g1",
    });
    if (!result.accepted) throw new Error("drop rejected");

    expect(result.targetFrame?.id).toBe(frame.id);
    expect(result.group.x + sizeOf(result.item, widths).w).toBeLessThanOrEqual(
      frame.x + frameSizeOf(frame).w,
    );
  });

  it("keeps blank-mode drops free even when they overlap a phone frame", () => {
    const item = makeItem("topAppBar");
    const result = placeDroppedItem({
      item,
      rawX: frame.x + 40,
      rawY: frame.y + 20,
      fromPalette: false,
      frameMode: "blank",
      groups: [],
      frames: [frame],
      widths,
      view,
      viewport,
      groupId: "g1",
    });
    if (!result.accepted) throw new Error("drop rejected");

    expect(result.targetFrame).toBeNull();
    expect(result.group.x).toBe(frame.x + 40);
  });

  it("does not append a drop when the item is already present", () => {
    const item = makeItem("button");
    const existing: Group = {
      id: "existing",
      x: 0,
      y: 0,
      axis: "x",
      items: [item],
    };
    const duplicate: Group = {
      id: "new",
      x: 50,
      y: 50,
      axis: "x",
      items: [item],
    };

    expect(appendDroppedGroup([existing], duplicate)).toEqual([existing]);
  });
});
