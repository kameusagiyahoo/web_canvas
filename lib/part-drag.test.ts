import { describe, expect, it } from "vitest";
import { detachItemForDrag, insertItemAtSnap } from "./part-drag";
import type { Group, Item } from "./tokens";

const button = (id: string, size = 100): Item => ({
  id,
  kind: "button",
  label: id,
  icon: null,
  variant: "filled",
  size,
});

const run = (items: Item[], axis: "x" | "y" = "x"): Group => ({
  id: "g",
  x: 10,
  y: 20,
  axis,
  items,
});

describe("detachItemForDrag", () => {
  it("moves a horizontal run anchor when the first item is detached", () => {
    const result = detachItemForDrag(
      [run([button("a", 100), button("b", 80)])],
      "a",
      {},
    );

    expect(result.shiftedGroupIds).toEqual(["g"]);
    expect(result.groups[0]).toMatchObject({ x: 113, y: 20 });
    expect(result.groups[0].items.map((item) => item.id)).toEqual(["b"]);
  });

  it("keeps the anchor when a later item is detached", () => {
    const result = detachItemForDrag(
      [run([button("a", 100), button("b", 80)])],
      "b",
      {},
    );

    expect(result.shiftedGroupIds).toEqual([]);
    expect(result.groups[0]).toMatchObject({ x: 10, y: 20 });
    expect(result.groups[0].items.map((item) => item.id)).toEqual(["a"]);
  });

  it("removes an empty run entirely", () => {
    expect(detachItemForDrag([run([button("a")])], "a", {}).groups).toEqual([]);
  });

  it("moves a vertical run anchor by the removed item's height and gap", () => {
    const result = detachItemForDrag(
      [run([button("a"), button("b")], "y")],
      "a",
      {},
    );

    expect(result.groups[0]).toMatchObject({ x: 10, y: 79 });
  });
});

describe("insertItemAtSnap", () => {
  it("inserts at the front and shifts a horizontal run anchor backwards", () => {
    const groups = [run([button("a", 100)])];
    const item = button("new", 50);

    const next = insertItemAtSnap(groups, item, { groupId: "g", index: 0 }, {});

    expect(next[0]).toMatchObject({ x: -43, y: 20 });
    expect(next[0].items.map((entry) => entry.id)).toEqual(["new", "a"]);
  });

  it("inserts later slots without changing the run anchor", () => {
    const groups = [run([button("a"), button("b")])];
    const item = button("new", 50);

    const next = insertItemAtSnap(groups, item, { groupId: "g", index: 1 }, {});

    expect(next[0]).toMatchObject({ x: 10, y: 20 });
    expect(next[0].items.map((entry) => entry.id)).toEqual(["a", "new", "b"]);
  });

  it("does not duplicate an item already present in the document", () => {
    const item = button("a");
    const groups = [run([item])];

    expect(insertItemAtSnap(groups, item, { groupId: "g", index: 1 }, {})).toBe(groups);
  });
});
