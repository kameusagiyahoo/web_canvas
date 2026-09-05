import { describe, expect, it } from "vitest";
import {
  groupItemSelection,
  nudgeFrameWithGroups,
  nudgeItemGroups,
  ungroupFreeGroup,
} from "./group-commands";
import type { Frame, Group, Item } from "./tokens";

const button = (id: string, size = 100): Item => ({
  id,
  kind: "button",
  label: id,
  icon: null,
  variant: "filled",
  size,
});

describe("groupItemSelection", () => {
  it("preserves world positions and inserts at the topmost source layer", () => {
    const groups: Group[] = [
      { id: "g1", x: 10, y: 20, axis: "x", items: [button("a"), button("b")] },
      { id: "g2", x: 300, y: 100, axis: "x", items: [button("c")] },
    ];

    const result = groupItemSelection(groups, ["a", "c"], {}, () => "free");

    expect(result).not.toBeNull();
    expect(result!.groups).toHaveLength(2);
    expect(result!.groups[0]).toMatchObject({ id: "g1", x: 113, y: 20 });
    expect(result!.groups[0].items.map((it) => it.id)).toEqual(["b"]);
    expect(result!.groups[1]).toMatchObject({
      id: "free",
      x: 10,
      y: 20,
      free: true,
      pos: { a: { x: 0, y: 0 }, c: { x: 290, y: 80 } },
    });
    expect(result!.selectedIds).toEqual(["a", "c"]);
    expect(result!.shiftedGroupIds).toEqual(["g1"]);
  });

  it("collapses a free source group when one unselected item remains", () => {
    const groups: Group[] = [
      {
        id: "old-free",
        x: 50,
        y: 80,
        axis: "x",
        free: true,
        pos: { a: { x: 0, y: 0 }, b: { x: 140, y: 30 } },
        items: [button("a"), button("b")],
      },
      { id: "g2", x: 320, y: 100, axis: "x", items: [button("c")] },
    ];

    const result = groupItemSelection(groups, ["a", "c"], {}, () => "new-free");

    expect(result).not.toBeNull();
    expect(result!.groups[0]).toMatchObject({ id: "old-free", x: 190, y: 110 });
    expect(result!.groups[0].free).toBeUndefined();
    expect(result!.groups[0].items.map((it) => it.id)).toEqual(["b"]);
  });

  it("requires at least two actual selected items", () => {
    const groups: Group[] = [{ id: "g", x: 0, y: 0, axis: "x", items: [button("a")] }];
    expect(groupItemSelection(groups, ["a", "missing"], {}, () => "free")).toBeNull();
  });
});

describe("ungroupFreeGroup", () => {
  it("restores connected runs at their current world position with fresh group ids", () => {
    const groups: Group[] = [
      {
        id: "free",
        x: 50,
        y: 80,
        axis: "x",
        free: true,
        pos: { a: { x: 0, y: 0 }, b: { x: 103, y: 0 } },
        items: [button("a"), button("b")],
      },
    ];

    const result = ungroupFreeGroup(groups, "free", {}, () => "run");

    expect(result).not.toBeNull();
    expect(result!.newGroupIds).toEqual(["run"]);
    expect(result!.groups[0]).toMatchObject({ id: "run", x: 50, y: 80, axis: "x" });
    expect(result!.groups[0].items.map((it) => it.id)).toEqual(["a", "b"]);
    expect(result!.groups[0].free).toBeUndefined();
  });
});

describe("nudgeItemGroups", () => {
  it("moves only groups touched by the selection", () => {
    const groups: Group[] = [
      { id: "g1", x: 10, y: 20, axis: "x", items: [button("a"), button("b")] },
      { id: "g2", x: 300, y: 100, axis: "x", items: [button("c")] },
    ];

    const result = nudgeItemGroups(groups, ["b"], 4, -3);

    expect(result[0]).toMatchObject({ id: "g1", x: 14, y: 17 });
    expect(result[1]).toBe(groups[1]);
  });
});

describe("nudgeFrameWithGroups", () => {
  it("moves a frame and only the groups currently belonging to it", () => {
    const frames: Frame[] = [
      { id: "f1", name: "One", x: 0, y: 0 },
      { id: "f2", name: "Two", x: 600, y: 0 },
    ];
    const groups: Group[] = [
      { id: "g1", x: 16, y: 16, axis: "x", items: [button("a")] },
      { id: "g2", x: 616, y: 16, axis: "x", items: [button("b")] },
    ];

    const result = nudgeFrameWithGroups(frames, groups, "f1", {}, 5, 7);

    expect(result).not.toBeNull();
    expect(result!.frames[0]).toMatchObject({ id: "f1", x: 5, y: 7 });
    expect(result!.frames[1]).toBe(frames[1]);
    expect(result!.groups[0]).toMatchObject({ id: "g1", x: 21, y: 23 });
    expect(result!.groups[1]).toBe(groups[1]);
    expect(result!.movedGroupIds).toEqual(["g1"]);
  });
});
