import { describe, expect, it } from "vitest";
import {
  dragCarriedGroupsFromOrigins,
  dragFrameFromOrigin,
  dragGroupFromOrigin,
} from "./canvas-drag";
import type { Frame, Group, Item } from "./tokens";

const item = (id: string): Item => ({
  id,
  kind: "button",
  label: id,
  icon: null,
  variant: "filled",
  size: 100,
});

const group = (id: string, x: number, y: number): Group => ({
  id,
  x,
  y,
  axis: "x",
  items: [item(id + "-item")],
});

describe("dragGroupFromOrigin", () => {
  it("moves only the dragged group from its gesture origin", () => {
    const other = group("other", 100, 200);
    const groups = [group("dragged", 10, 20), other];

    const next = dragGroupFromOrigin(groups, "dragged", 10, 20, 4.6, -2.4);

    expect(next[0]).toMatchObject({ id: "dragged", x: 15, y: 18 });
    expect(next[1]).toBe(other);
  });

  it("does not accumulate rounding from the current state", () => {
    const alreadyMoved = [group("dragged", 11, 21)];

    const next = dragGroupFromOrigin(alreadyMoved, "dragged", 10, 20, 0.6, 0.6);

    expect(next[0]).toMatchObject({ x: 11, y: 21 });
  });
});

describe("dragFrameFromOrigin", () => {
  it("moves only the dragged frame from its captured origin", () => {
    const other: Frame = { id: "f2", name: "Other", x: 500, y: 600 };
    const frames: Frame[] = [
      { id: "f1", name: "Home", x: 100, y: 200 },
      other,
    ];

    const next = dragFrameFromOrigin(frames, "f1", 100, 200, -10.2, 15.8);

    expect(next[0]).toMatchObject({ id: "f1", x: 90, y: 216 });
    expect(next[1]).toBe(other);
  });
});

describe("dragCarriedGroupsFromOrigins", () => {
  it("moves only the groups captured with the frame gesture", () => {
    const outsider = group("outside", 300, 400);
    const groups = [group("a", 10, 20), group("b", 30, 40), outsider];

    const next = dragCarriedGroupsFromOrigins(
      groups,
      [
        { id: "a", x: 10, y: 20 },
        { id: "b", x: 30, y: 40 },
      ],
      5.4,
      -3.6,
    );

    expect(next[0]).toMatchObject({ id: "a", x: 15, y: 16 });
    expect(next[1]).toMatchObject({ id: "b", x: 35, y: 36 });
    expect(next[2]).toBe(outsider);
  });

  it("returns an equivalent shallow array when there are no carried groups", () => {
    const groups = [group("a", 10, 20)];
    const next = dragCarriedGroupsFromOrigins(groups, [], 10, 10);

    expect(next).not.toBe(groups);
    expect(next[0]).toBe(groups[0]);
  });
});
