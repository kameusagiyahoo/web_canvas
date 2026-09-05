import { describe, expect, it } from "vitest";
import { adaptItemToFrame, placePickedItem } from "./part-placement";
import {
  PHONE_MARGIN,
  Frame,
  frameSizeOf,
  makeItem,
  sizeOf,
  type Group,
} from "./tokens";

describe("adaptItemToFrame", () => {
  const frame: Frame = { id: "f1", name: "Home", x: 120, y: 40 };
  const widths: Record<string, number> = {};

  it("fits full-width bars to the target screen body", () => {
    const item = makeItem("topAppBar");
    const result = adaptItemToFrame(item, frame, [], [frame], widths);

    expect(result.slotX).toBe(frame.x);
    expect(sizeOf(result.item, widths).w).toBe(frameSizeOf(frame).w);
  });

  it("keeps ordinary parts out of the bar slot while applying frame height rules", () => {
    const item = makeItem("button");
    const result = adaptItemToFrame(item, frame, [], [frame], widths);

    expect(result.slotX).toBeNull();
    expect(result.item.kind).toBe("button");
    expect(sizeOf(result.item, widths).h).toBeLessThanOrEqual(frameSizeOf(frame).h);
  });
});

describe("placePickedItem", () => {
  const frame: Frame = { id: "f1", name: "Home", x: 120, y: 40 };
  const widths: Record<string, number> = {};
  const view = { x: 0, y: 0, z: 1 };
  const viewport = { width: 800, height: 800 };

  it("uses the same frame adaptation for full-width bars", () => {
    const item = makeItem("topAppBar");
    const result = placePickedItem({
      item,
      targetFrame: frame,
      groups: [],
      frames: [frame],
      widths,
      view,
      viewport,
      groupId: "g1",
    });

    expect(result.group.x).toBe(frame.x);
    expect(result.group.y).toBe(frame.y + PHONE_MARGIN);
    expect(sizeOf(result.item, widths).w).toBe(frameSizeOf(frame).w);
  });

  it("walks a picked part down when its initial row is occupied", () => {
    const existingItem = makeItem("button");
    const placed = adaptItemToFrame(existingItem, frame, [], [frame], widths);
    const placedSize = sizeOf(placed.item, widths);
    const x =
      placed.slotX ??
      frame.x +
        Math.max(PHONE_MARGIN, (frameSizeOf(frame).w - placedSize.w) / 2);
    const existing: Group = {
      id: "existing",
      x: Math.round(x),
      y: frame.y + PHONE_MARGIN,
      axis: "x",
      items: [placed.item],
    };

    const result = placePickedItem({
      item: makeItem("button"),
      targetFrame: frame,
      groups: [existing],
      frames: [frame],
      widths,
      view,
      viewport,
      groupId: "g2",
    });

    expect(result.group.y).toBe(frame.y + PHONE_MARGIN + placedSize.h + 12);
  });

  it("centers a picked part in the visible canvas when there is no frame", () => {
    const item = makeItem("button");
    const size = sizeOf(item, widths);
    const result = placePickedItem({
      item,
      targetFrame: null,
      groups: [],
      frames: [],
      widths,
      view: { x: 100, y: 50, z: 2 },
      viewport: { width: 600, height: 400 },
      groupId: "g1",
    });

    expect(result.group.x).toBe(Math.round((300 - 100) / 2 - size.w / 2));
    expect(result.group.y).toBe(Math.round((200 - 50) / 2 - size.h / 2));
    expect(result.item.id).toBe(item.id);
  });
});
