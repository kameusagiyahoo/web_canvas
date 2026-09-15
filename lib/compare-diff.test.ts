import { describe, expect, it } from "vitest";
import { compareFrames } from "./compare-diff";
import { makeItem, type Frame, type Group } from "./tokens";

const frame = (id: string, x: number): Frame => ({ id, name: id, x, y: 0 });

function group(id: string, x: number, label = "Continue"): Group {
  return {
    id,
    x,
    y: 120,
    axis: "x",
    items: [{ ...makeItem("button"), id: `${id}-button`, label }],
  };
}

describe("compareFrames", () => {
  it("treats a duplicated screen with new IDs and a canvas offset as structurally identical", () => {
    const a = frame("a", 0);
    const b = frame("b", 520);
    b.name = "a variant";
    const ga = group("ga", 24);
    const gb = group("gb", 544);

    const diff = compareFrames(a, b, [a, b], [ga, gb], {});

    expect(diff.total).toBe(0);
  });

  it("reports style and navigation changes on the matched canonical part", () => {
    const a = frame("a", 0);
    const b = frame("b", 520);
    const targetA = frame("target-a", 1040);
    const targetB = frame("target-b", 1560);
    const ga = group("ga", 24);
    const gb = group("gb", 544);
    ga.items[0] = {
      ...ga.items[0],
      variant: "filled",
      action: { to: "target-a", transition: "slide" },
    };
    gb.items[0] = {
      ...gb.items[0],
      variant: "tonal",
      action: { to: "target-b", transition: "fade" },
    };

    const diff = compareFrames(a, b, [a, b, targetA, targetB], [ga, gb], {});

    expect(diff.counts.style).toBe(1);
    expect(diff.counts.navigation).toBe(1);
    expect(diff.entries.some((entry) => entry.property === "variant" && entry.before === "filled" && entry.after === "tonal")).toBe(true);
    expect(diff.entries.some((entry) => entry.property === "tapTarget" && entry.after?.includes("target-b"))).toBe(true);
  });

  it("reports added and removed parts instead of persisting a compare-only document", () => {
    const a = frame("a", 0);
    const b = frame("b", 520);
    const ga = group("ga", 24);
    const gb = group("gb", 544);
    gb.items.push({ ...makeItem("text"), id: "extra-text", label: "New copy" });

    const added = compareFrames(a, b, [a, b], [ga, gb], {});
    const removed = compareFrames(b, a, [a, b], [ga, gb], {});

    expect(added.counts.added).toBe(1);
    expect(added.counts.removed).toBe(0);
    expect(removed.counts.removed).toBe(1);
  });

  it("reports screen geometry, background, and swipe differences", () => {
    const a = frame("a", 0);
    const b: Frame = {
      ...frame("b", 520),
      w: 1280,
      h: 800,
      bg: "primaryContainer",
      swipe: { left: "a" },
    };

    const diff = compareFrames(a, b, [a, b], [], {});

    expect(diff.counts.screen).toBe(3);
    expect(diff.counts.navigation).toBe(1);
  });
});
