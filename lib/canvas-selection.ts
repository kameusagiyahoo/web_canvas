import { layoutOf, type Group } from "./tokens";

export type ItemRect = {
  id: string;
  l: number;
  t: number;
  r: number;
  b: number;
};

export type SelectionRect = {
  l: number;
  t: number;
  r: number;
  b: number;
};

/** Returns world-space rectangles for every item in layer order. */
export function itemRectsOfGroups(
  groups: readonly Group[],
  widths: Record<string, number>,
): ItemRect[] {
  const out: ItemRect[] = [];
  for (const group of groups) {
    for (const placed of layoutOf(group, widths)) {
      out.push({
        id: placed.item.id,
        l: placed.x,
        t: placed.y,
        r: placed.x + placed.w,
        b: placed.y + placed.h,
      });
    }
  }
  return out;
}

/** Normalizes a marquee drawn in any direction into a conventional rectangle. */
export function selectionRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): SelectionRect {
  return {
    l: Math.min(x0, x1),
    t: Math.min(y0, y1),
    r: Math.max(x0, x1),
    b: Math.max(y0, y1),
  };
}

/** Selects items whose world-space rectangles overlap the marquee. */
export function marqueeHitIds(
  rects: readonly ItemRect[],
  marquee: SelectionRect,
): string[] {
  return rects
    .filter(
      (item) =>
        item.l < marquee.r &&
        item.r > marquee.l &&
        item.t < marquee.b &&
        item.b > marquee.t,
    )
    .map((item) => item.id);
}
