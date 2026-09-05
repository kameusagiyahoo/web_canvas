import { describe, expect, it } from "vitest";
import {
  itemRectsOfGroups,
  marqueeHitIds,
  selectionRect,
} from "./canvas-selection";
import type { Group, Item } from "./tokens";

const button = (id: string, size = 100): Item => ({
  id,
  kind: "button",
  label: id,
  icon: null,
  variant: "filled",
  size,
});

describe("itemRectsOfGroups", () => {
  it("returns world-space rectangles for connected items", () => {
    const groups: Group[] = [
      {
        id: "g",
        x: 10,
        y: 20,
        axis: "x",
        items: [button("a"), button("b")],
      },
    ];

    expect(itemRectsOfGroups(groups, {})).toEqual([
      { id: "a", l: 10, t: 20, r: 110, b: 60 },
      { id: "b", l: 113, t: 20, r: 213, b: 60 },
    ]);
  });
});

describe("selectionRect", () => {
  it("normalizes a marquee dragged from bottom-right to top-left", () => {
    expect(selectionRect(40, 30, 10, 5)).toEqual({ l: 10, t: 5, r: 40, b: 30 });
  });
});

describe("marqueeHitIds", () => {
  const rects = [
    { id: "a", l: 10, t: 10, r: 30, b: 30 },
    { id: "b", l: 40, t: 10, r: 60, b: 30 },
    { id: "c", l: 70, t: 10, r: 90, b: 30 },
  ];

  it("selects every item that overlaps the marquee", () => {
    expect(marqueeHitIds(rects, { l: 20, t: 0, r: 75, b: 20 })).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("does not count edge-only contact as overlap", () => {
    expect(marqueeHitIds(rects, { l: 30, t: 10, r: 40, b: 30 })).toEqual([]);
  });
});
