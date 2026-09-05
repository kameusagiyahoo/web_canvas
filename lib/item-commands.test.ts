import { describe, expect, it } from "vitest";
import { deleteItemsFromGroups, duplicateItemSelection } from "./item-commands";
import type { Group, Item } from "./tokens";

const button = (id: string, size = 100): Item => ({
  id,
  kind: "button",
  label: id,
  icon: null,
  variant: "filled",
  size,
});

describe("deleteItemsFromGroups", () => {
  it("shifts a connected horizontal run when its leading item is deleted", () => {
    const groups: Group[] = [
      { id: "g", x: 10, y: 20, axis: "x", items: [button("a"), button("b")] },
    ];

    const result = deleteItemsFromGroups(groups, ["a"], {});

    expect(result.groups).toEqual([
      { id: "g", x: 113, y: 20, axis: "x", items: [button("b")] },
    ]);
    expect(result.shiftedGroupIds).toEqual(["g"]);
  });

  it("removes a non-leading item without moving the run anchor", () => {
    const groups: Group[] = [
      { id: "g", x: 10, y: 20, axis: "x", items: [button("a"), button("b"), button("c")] },
    ];

    const result = deleteItemsFromGroups(groups, ["b"], {});

    expect(result.groups[0].x).toBe(10);
    expect(result.groups[0].items.map((it) => it.id)).toEqual(["a", "c"]);
    expect(result.shiftedGroupIds).toEqual([]);
  });

  it("collapses a free group to the surviving item's world position", () => {
    const groups: Group[] = [
      {
        id: "free",
        x: 50,
        y: 80,
        axis: "x",
        free: true,
        pos: { a: { x: 0, y: 0 }, b: { x: 140, y: 30 } },
        items: [button("a"), button("b")],
      },
    ];

    const result = deleteItemsFromGroups(groups, ["a"], {});

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({ id: "free", x: 190, y: 110, axis: "x" });
    expect(result.groups[0].free).toBeUndefined();
    expect(result.groups[0].items.map((it) => it.id)).toEqual(["b"]);
  });

  it("drops an empty group entirely", () => {
    const groups: Group[] = [
      { id: "g", x: 0, y: 0, axis: "x", items: [button("a")] },
    ];

    expect(deleteItemsFromGroups(groups, ["a"], {}).groups).toEqual([]);
  });
});

describe("duplicateItemSelection", () => {
  it("duplicates one item at a fixed offset with fresh ids", () => {
    const original: Item = {
      ...button("a"),
      tabs: [{ icon: "home", label: "Home" }],
    };
    const groups: Group[] = [
      { id: "g", x: 10, y: 20, axis: "x", items: [original] },
    ];
    const ids = ["copy-item", "copy-group"];

    const result = duplicateItemSelection(groups, ["a"], "a", {}, () => ids.shift()!);

    expect(result).not.toBeNull();
    expect(result!.addedGroup).toMatchObject({ id: "copy-group", x: 34, y: 44 });
    expect(result!.selectedIds).toEqual(["copy-item"]);
    expect(result!.addedGroup.items[0].id).toBe("copy-item");
    expect(result!.addedGroup.items[0].tabs).toEqual(original.tabs);
    expect(result!.addedGroup.items[0].tabs).not.toBe(original.tabs);
  });

  it("duplicates a fully selected free group as one group", () => {
    const groups: Group[] = [
      {
        id: "free",
        x: 50,
        y: 80,
        axis: "x",
        free: true,
        pos: { a: { x: 0, y: 0 }, b: { x: 140, y: 30 } },
        items: [button("a"), button("b")],
      },
    ];
    const ids = ["a2", "b2", "free2"];

    const result = duplicateItemSelection(groups, ["a", "b"], "b", {}, () => ids.shift()!);

    expect(result).not.toBeNull();
    expect(result!.addedGroup).toMatchObject({
      id: "free2",
      x: 74,
      y: 104,
      free: true,
      pos: { a2: { x: 0, y: 0 }, b2: { x: 140, y: 30 } },
    });
    expect(result!.addedGroup.items.map((it) => it.id)).toEqual(["a2", "b2"]);
    expect(result!.selectedIds).toEqual(["a2", "b2"]);
  });

  it("duplicates only the primary item when a free group is partially selected", () => {
    const groups: Group[] = [
      {
        id: "free",
        x: 50,
        y: 80,
        axis: "x",
        free: true,
        pos: { a: { x: 0, y: 0 }, b: { x: 140, y: 30 } },
        items: [button("a"), button("b")],
      },
    ];
    const ids = ["b2", "group2"];

    const result = duplicateItemSelection(groups, ["b"], "b", {}, () => ids.shift()!);

    expect(result).not.toBeNull();
    expect(result!.addedGroup).toMatchObject({ id: "group2", x: 214, y: 134 });
    expect(result!.addedGroup.items.map((it) => it.id)).toEqual(["b2"]);
  });
});
