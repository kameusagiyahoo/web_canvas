import { describe, expect, it } from "vitest";
import {
  findAlignmentGuide,
  findMagneticSnap,
  restPosition,
} from "./canvas-magnet";
import type { Frame, Group, Item } from "./tokens";

const button = (id: string, size = 100): Item => ({
  id,
  kind: "button",
  label: id,
  icon: null,
  variant: "filled",
  size,
});

const chip = (id: string): Item => ({
  id,
  kind: "chip",
  label: id,
  icon: null,
  variant: "outlined",
});

const group = (
  id: string,
  x: number,
  y: number,
  items: Item[] = [button(id + "-item")],
): Group => ({ id, x, y, axis: "x", items });

describe("restPosition", () => {
  it("places a front slot before the current run anchor", () => {
    const run = group("g", 100, 80);

    expect(restPosition(run, 0, { w: 80, h: 56 }, {})).toEqual({
      left: 17,
      top: 80,
    });
  });

  it("places later slots after the preceding run items and gaps", () => {
    const run = group("g", 100, 80, [button("a", 100), button("b", 60)]);

    expect(restPosition(run, 2, { w: 80, h: 56 }, {})).toEqual({
      left: 266,
      top: 80,
    });
  });
});

describe("findMagneticSnap", () => {
  it("finds an exact compatible slot with full attraction", () => {
    const run = group("g", 100, 80);
    const dragged = button("drag", 80);

    expect(findMagneticSnap(dragged, 17, 80, [run], {})).toEqual({
      groupId: "g",
      index: 0,
      pull: 1,
    });
  });

  it("ignores incompatible families and positions outside the magnetic field", () => {
    const run = group("g", 100, 80);

    expect(findMagneticSnap(chip("drag"), 17, 80, [run], {})).toBeNull();
    expect(findMagneticSnap(button("far", 80), -100, 80, [run], {})).toBeNull();
  });
});

describe("findAlignmentGuide", () => {
  it("aligns a dragged item to a neighbouring item edge", () => {
    const neighbour = group("g", 100, 200);
    const dragged = button("drag", 80);

    const guide = findAlignmentGuide(
      dragged,
      202,
      400,
      [neighbour],
      [],
      {},
      { phoneMode: false, zoom: 1 },
    );

    expect(guide).toEqual({ x: 200, gx: 200 });
  });

  it("uses frame edges, margins and centres only in phone mode", () => {
    const frame: Frame = { id: "f", name: "Home", x: 0, y: 0 };
    const dragged = button("drag", 100);

    expect(
      findAlignmentGuide(dragged, 154, 300, [], [frame], {}, { phoneMode: true, zoom: 1 }),
    ).toEqual({ x: 156, gx: 206 });
    expect(
      findAlignmentGuide(dragged, 154, 300, [], [frame], {}, { phoneMode: false, zoom: 1 }),
    ).toBeNull();
  });
});
