import { adaptItemToFrame } from "./part-placement";
import { pullInto } from "./tidy";
import {
  connectSpecOf,
  frameRect,
  sizeOf,
  type Frame,
  type FrameMode,
  type Group,
  type Item,
} from "./tokens";
import type { CanvasView } from "./canvas-viewport";

export type DropViewport = { width: number; height: number };

export type DropPlacement =
  | { accepted: false; reason: "outside-viewport" }
  | {
      accepted: true;
      group: Group;
      item: Item;
      targetFrame: Frame | null;
    };

/** Whether a palette-origin drag still lands inside the visible canvas viewport. */
export function isDropInsideViewport(
  rawX: number,
  rawY: number,
  itemSize: { w: number; h: number },
  view: CanvasView,
  viewport: DropViewport,
): boolean {
  const screenL = (rawX + itemSize.w) * view.z + view.x;
  const screenT = (rawY + itemSize.h) * view.z + view.y;
  const screenR = rawX * view.z + view.x;
  const screenB = rawY * view.z + view.y;
  return (
    screenL >= 0 &&
    screenT >= 0 &&
    screenR <= viewport.width &&
    screenB <= viewport.height
  );
}

/** Finds the phone frame whose rectangle contains the dropped item's centre. */
export function targetFrameForDrop(
  item: Item,
  rawX: number,
  rawY: number,
  frames: readonly Frame[],
  widths: Record<string, number>,
): Frame | null {
  const size = sizeOf(item, widths);
  const cx = rawX + size.w / 2;
  const cy = rawY + size.h / 2;
  return (
    frames.find((frame) => {
      const rect = frameRect(frame);
      return cx >= rect.l && cx <= rect.r && cy >= rect.t && cy <= rect.b;
    }) ?? null
  );
}

/**
 * Finalizes a free drop after snap/guide handling has finished.
 *
 * This keeps viewport rejection, target-frame selection, frame-aware item sizing,
 * group construction and pull-inside behavior in one testable command. React state,
 * undo snapshots and drag animation remain the caller's responsibility.
 */
export function placeDroppedItem(args: {
  item: Item;
  rawX: number;
  rawY: number;
  fromPalette: boolean;
  frameMode: FrameMode;
  groups: Group[];
  frames: Frame[];
  widths: Record<string, number>;
  view: CanvasView;
  viewport: DropViewport;
  groupId: string;
}): DropPlacement {
  const {
    item,
    rawX,
    rawY,
    fromPalette,
    frameMode,
    groups,
    frames,
    widths,
    view,
    viewport,
    groupId,
  } = args;

  const originalSize = sizeOf(item, widths);
  if (
    fromPalette &&
    !isDropInsideViewport(rawX, rawY, originalSize, view, viewport)
  ) {
    return { accepted: false, reason: "outside-viewport" };
  }

  const targetFrame =
    frameMode === "phone"
      ? targetFrameForDrop(item, rawX, rawY, frames, widths)
      : null;
  const adapted = targetFrame
    ? adaptItemToFrame(item, targetFrame, groups, frames, widths)
    : { item, slotX: null };

  const group: Group = {
    id: groupId,
    x: Math.round(adapted.slotX ?? rawX),
    y: Math.round(rawY),
    axis: connectSpecOf(adapted.item)?.axis ?? "x",
    items: [adapted.item],
  };

  return {
    accepted: true,
    item: adapted.item,
    targetFrame,
    group: targetFrame ? pullInto(group, targetFrame, widths) : group,
  };
}

/** Appends a finalized drop only if that item is not already present in the document. */
export function appendDroppedGroup(
  groups: readonly Group[],
  group: Group,
): Group[] {
  const itemId = group.items[0]?.id;
  if (
    itemId &&
    groups.some((existing) =>
      existing.items.some((item) => item.id === itemId),
    )
  ) {
    return groups as Group[];
  }
  return [...groups, group];
}
