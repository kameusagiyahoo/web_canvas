import { describe, expect, it } from "vitest";
import { Group, makeItem } from "./tokens";
import { reorderFrameGroups, reorderItemsInGroup } from "./layer-commands";

const group = (id: string): Group => ({ id, x: 0, y: 0, axis: "x", items: [{ ...makeItem("button"), id: `${id}-item` }] });

describe("reorderFrameGroups", () => {
  it("reorders only the addressed screen groups from top-first UI order", () => {
    const a = group("a");
    const b = group("b");
    const other = group("other");
    const result = reorderFrameGroups([a, b, other], ["a", "b"]);
    expect(result?.map((g) => g.id)).toEqual(["other", "b", "a"]);
  });

  it("preserves untouched group objects", () => {
    const a = group("a");
    const b = group("b");
    const other = group("other");
    const result = reorderFrameGroups([a, b, other], ["b", "a"]);
    expect(result?.[0]).toBe(other);
  });

  it("rejects unknown or duplicate ids", () => {
    expect(reorderFrameGroups([group("a")], ["missing"])).toBeNull();
    expect(reorderFrameGroups([group("a"), group("b")], ["a", "a"])).toBeNull();
  });
});

describe("reorderItemsInGroup", () => {
  it("reorders a connected run", () => {
    const a = { ...makeItem("button"), id: "a" };
    const b = { ...makeItem("button"), id: "b" };
    const g: Group = { id: "g", x: 0, y: 0, axis: "x", items: [a, b] };
    const result = reorderItemsInGroup(g, ["b", "a"], {});
    expect(result?.items.map((it) => it.id)).toEqual(["b", "a"]);
  });

  it("returns a new group without mutating the source", () => {
    const a = { ...makeItem("button"), id: "a" };
    const b = { ...makeItem("button"), id: "b" };
    const g: Group = { id: "g", x: 0, y: 0, axis: "x", items: [a, b] };
    const result = reorderItemsInGroup(g, ["b", "a"], {});
    expect(result).not.toBe(g);
    expect(g.items.map((it) => it.id)).toEqual(["a", "b"]);
  });

  it("rejects incomplete, duplicate, or unknown orders", () => {
    const a = { ...makeItem("button"), id: "a" };
    const b = { ...makeItem("button"), id: "b" };
    const g: Group = { id: "g", x: 0, y: 0, axis: "x", items: [a, b] };
    expect(reorderItemsInGroup(g, ["a"], {})).toBeNull();
    expect(reorderItemsInGroup(g, ["a", "a"], {})).toBeNull();
    expect(reorderItemsInGroup(g, ["a", "missing"], {})).toBeNull();
  });
});
