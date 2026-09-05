import { describe, expect, it } from "vitest";
import { Frame, Group, makeItem } from "./tokens";
import { deleteFrameFromDocument, duplicateFrameInDocument, nextFrameX } from "./frame-commands";

const frame = (id: string, x: number): Frame => ({ id, name: id, x, y: 0 });

const group = (id: string, x: number): Group => ({
  id,
  x,
  y: 120,
  axis: "x",
  items: [{ ...makeItem("button"), id: `${id}-item` }],
});

describe("nextFrameX", () => {
  it("places a new screen after the current rightmost screen", () => {
    expect(nextFrameX([frame("a", 0), frame("b", 600)])).toBeGreaterThan(600);
  });

  it("starts at zero for an empty document", () => {
    expect(nextFrameX([])).toBe(0);
  });
});

describe("deleteFrameFromDocument", () => {
  it("removes the screen, its groups, and links that target it", () => {
    const a = frame("a", 0);
    const b = { ...frame("b", 600), swipe: { left: "a" } } as Frame;
    const onA = group("on-a", 16);
    const onB = group("on-b", 616);
    onB.items[0] = { ...onB.items[0], action: { to: "a", transition: "slide" } };

    const result = deleteFrameFromDocument([a, b], [onA, onB], {}, "a");

    expect(result.frames.map((item) => item.id)).toEqual(["b"]);
    expect(result.frames[0].swipe).toBeUndefined();
    expect(result.groups.map((item) => item.id)).toEqual(["on-b"]);
    expect(result.groups[0].items[0].action).toBeUndefined();
    expect(result.removedGroupIds.has("on-a")).toBe(true);
  });

  it("removes only per-slot actions that point at the deleted screen", () => {
    const a = frame("a", 0);
    const b = frame("b", 600);
    const c = frame("c", 1200);
    const onB = group("on-b", 616);
    onB.items[0] = {
      ...onB.items[0],
      actions: {
        "tab:0": { to: "a", transition: "fade" },
        "tab:1": { to: "c", transition: "slide" },
      },
    };

    const result = deleteFrameFromDocument([a, b, c], [onB], {}, "a");
    const actions = result.groups[0].items[0].actions;

    expect(actions?.["tab:0"]).toBeUndefined();
    expect(actions?.["tab:1"]?.to).toBe("c");
  });

  it("keeps unrelated swipe targets intact", () => {
    const a = frame("a", 0);
    const b = { ...frame("b", 600), swipe: { left: "a", right: "c" } } as Frame;
    const c = frame("c", 1200);

    const result = deleteFrameFromDocument([a, b, c], [], {}, "a");

    expect(result.frames.find((item) => item.id === "b")?.swipe).toEqual({ right: "c" });
  });
});

describe("duplicateFrameInDocument", () => {
  it("copies a screen and remaps group/item ids without moving the source", () => {
    const source = frame("a", 0);
    const sourceGroup = group("g", 16);
    const ids = ["frame-copy", "item-copy", "group-copy"];

    const result = duplicateFrameInDocument([source], [sourceGroup], {}, "a", {
      makeId: () => ids.shift()!,
      copySuffix: " copy",
    });

    expect(result).not.toBeNull();
    expect(result!.frame.id).toBe("frame-copy");
    expect(result!.frame.name).toBe("a copy");
    expect(result!.groups[0]).toBe(sourceGroup);
    expect(result!.groups[1].id).toBe("group-copy");
    expect(result!.groups[1].items[0].id).toBe("item-copy");
    expect(result!.groups[1].x - sourceGroup.x).toBe(result!.frame.x - source.x);
  });

  it("copies tabs without sharing the tab array with the source", () => {
    const source = frame("a", 0);
    const sourceGroup = group("g", 16);
    sourceGroup.items[0] = {
      ...sourceGroup.items[0],
      tabs: [
        { icon: "home", label: "Home" },
        { icon: "search", label: "Search" },
      ],
    };
    const ids = ["frame-copy", "item-copy", "group-copy"];

    const result = duplicateFrameInDocument([source], [sourceGroup], {}, "a", {
      makeId: () => ids.shift()!,
      copySuffix: " copy",
    });

    expect(result).not.toBeNull();
    const copiedItem = result!.groups[1].items[0];
    expect(copiedItem.tabs).toEqual(sourceGroup.items[0].tabs);
    expect(copiedItem.tabs).not.toBe(sourceGroup.items[0].tabs);
  });

  it("returns null for an unknown source screen", () => {
    expect(
      duplicateFrameInDocument([], [], {}, "missing", {
        makeId: () => "id",
        copySuffix: " copy",
      }),
    ).toBeNull();
  });
});
