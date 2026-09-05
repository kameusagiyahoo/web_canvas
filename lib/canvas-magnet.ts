import {
  GAP,
  PHONE_MARGIN,
  PULL_EXP,
  SNAP_CROSS,
  SNAP_MAIN,
  canJoin,
  connectSpecOf,
  frameSizeOf,
  layoutOf,
  sizeOf,
  type Frame,
  type Group,
  type Item,
} from "./tokens";

export type Snap = { groupId: string; index: number; pull: number };
export type Guide = { x?: number; y?: number; gx?: number; gy?: number };

export type GuideOptions = {
  phoneMode: boolean;
  zoom: number;
  guidePx?: number;
  frameMargin?: number;
};

function prefixOf(
  group: Group,
  index: number,
  widths: Record<string, number>,
): number {
  return group.items.slice(0, index).reduce((sum, item) => {
    const size = sizeOf(item, widths);
    return sum + (group.axis === "x" ? size.w : size.h) + GAP;
  }, 0);
}

/** World-space resting position for an item inserted at one run slot. */
export function restPosition(
  group: Group,
  index: number,
  itemSize: { w: number; h: number },
  widths: Record<string, number>,
): { left: number; top: number } {
  if (group.axis === "x") {
    return {
      left:
        index === 0
          ? group.x - itemSize.w - GAP
          : group.x + prefixOf(group, index, widths),
      top: group.y,
    };
  }
  return {
    left: group.x,
    top:
      index === 0
        ? group.y - itemSize.h - GAP
        : group.y + prefixOf(group, index, widths),
  };
}

/**
 * Finds the nearest compatible connected-run slot inside the magnetic field.
 * Attraction is 0 at the field edge and approaches 1 at the target.
 */
export function findMagneticSnap(
  item: Item,
  left: number,
  top: number,
  groups: readonly Group[],
  widths: Record<string, number>,
): Snap | null {
  const spec = connectSpecOf(item);
  if (!spec) return null;
  const size = sizeOf(item, widths);
  let best: Snap | null = null;
  let bestDistance = 1;

  for (const group of groups) {
    if (
      group.free ||
      group.axis !== spec.axis ||
      !group.items[0] ||
      !canJoin(group.items[0], item)
    ) {
      continue;
    }
    for (let index = 0; index <= group.items.length; index += 1) {
      const rest = restPosition(group, index, size, widths);
      const dx = left - rest.left;
      const dy = top - rest.top;
      const main = (spec.axis === "x" ? dx : dy) / SNAP_MAIN;
      const cross = (spec.axis === "x" ? dy : dx) / SNAP_CROSS;
      if (Math.abs(main) >= 1 || Math.abs(cross) >= 1) continue;
      const distance = Math.hypot(main, cross);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = {
          groupId: group.id,
          index,
          pull: Math.pow(1 - distance, PULL_EXP),
        };
      }
    }
  }

  return best;
}

/**
 * Canva-style edge/centre alignment against neighbouring items and, in phone
 * mode, frame edges, margins and centres. Returned x/y are corrected item
 * coordinates; gx/gy identify the guide line to draw.
 */
export function findAlignmentGuide(
  item: Item,
  left: number,
  top: number,
  groups: readonly Group[],
  frames: readonly Frame[],
  widths: Record<string, number>,
  options: GuideOptions,
): Guide | null {
  const size = sizeOf(item, widths);
  const zoom = Math.max(options.zoom, Number.EPSILON);
  const tolerance = (options.guidePx ?? 7) / zoom;
  const frameMargin = options.frameMargin ?? PHONE_MARGIN;
  const xs: number[] = [];
  const ys: number[] = [];

  for (const group of groups) {
    for (const placed of layoutOf(group, widths)) {
      if (placed.item.id === item.id) continue;
      xs.push(placed.x, placed.x + placed.w / 2, placed.x + placed.w);
      ys.push(placed.y, placed.y + placed.h / 2, placed.y + placed.h);
    }
  }

  if (options.phoneMode) {
    for (const frame of frames) {
      const { w, h } = frameSizeOf(frame);
      xs.push(
        frame.x,
        frame.x + frameMargin,
        frame.x + w / 2,
        frame.x + w - frameMargin,
        frame.x + w,
      );
      ys.push(
        frame.y,
        frame.y + frameMargin,
        frame.y + h / 2,
        frame.y + h - frameMargin,
        frame.y + h,
      );
    }
  }

  const ownAnchors = (position: number, length: number) => [
    position,
    position + length / 2,
    position + length,
  ];

  let best: Guide = {};
  let bestX = tolerance;
  for (const candidate of xs) {
    for (const mine of ownAnchors(left, size.w)) {
      const distance = Math.abs(candidate - mine);
      if (distance < bestX) {
        bestX = distance;
        best = { ...best, x: left + (candidate - mine), gx: candidate };
      }
    }
  }

  let bestY = tolerance;
  for (const candidate of ys) {
    for (const mine of ownAnchors(top, size.h)) {
      const distance = Math.abs(candidate - mine);
      if (distance < bestY) {
        bestY = distance;
        best = { ...best, y: top + (candidate - mine), gy: candidate };
      }
    }
  }

  return best.x === undefined && best.y === undefined ? null : best;
}
