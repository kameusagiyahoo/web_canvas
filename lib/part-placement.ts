import { itemRectsOfGroups } from "./canvas-selection";
import type { CanvasView } from "./canvas-viewport";
import { pullInto } from "./tidy";
import {
  FULL_WIDTH,
  Frame,
  Group,
  Item,
  PHONE_H,
  PHONE_MARGIN,
  PHONE_W,
  carryItemSize,
  connectSpecOf,
  fitHeight,
  frameSizeOf,
  sizeOf,
} from "./tokens";
import { barSlotOf } from "./tidy";

export type AdaptedFrameItem = {
  item: Item;
  slotX: number | null;
};

export type PickedPartPlacement = {
  item: Item;
  group: Group;
};

/**
 * Apply the same frame-aware sizing rules to a newly placed part regardless of
 * whether it came from desktop drag/drop or the mobile parts picker.
 *
 * Full-width bars use the screen body width (respecting navigation rails) and
 * non-bar parts are only height-clamped to the target screen. The caller keeps
 * ownership of the actual x/y placement policy.
 */
export function adaptItemToFrame(
  item: Item,
  frame: Frame,
  groups: Group[],
  frames: Frame[],
  widths: Record<string, number>,
): AdaptedFrameItem {
  const frameSize = frameSizeOf(frame);
  const slot = barSlotOf(groups, frame, frames, widths);
  const fullWidth = FULL_WIDTH.includes(item.kind);

  return {
    item: fullWidth
      ? carryItemSize(
          item,
          { w: PHONE_W, h: PHONE_H },
          { w: slot.w, h: frameSize.h },
        )
      : fitHeight(item, frameSize.h),
    slotX: fullWidth ? slot.x : null,
  };
}

/**
 * Places a part created from the mobile picker using the same frame adaptation
 * rules as desktop drag/drop. On a screen it starts near the top and walks down
 * past occupied rows; without a screen it is centered in the visible canvas.
 */
export function placePickedItem(args: {
  item: Item;
  targetFrame: Frame | null | undefined;
  groups: Group[];
  frames: Frame[];
  widths: Record<string, number>;
  view: CanvasView;
  viewport: { width: number; height: number };
  groupId: string;
}): PickedPartPlacement {
  const {
    item,
    targetFrame,
    groups,
    frames,
    widths,
    view,
    viewport,
    groupId,
  } = args;

  if (targetFrame) {
    const frameSize = frameSizeOf(targetFrame);
    const adapted = adaptItemToFrame(item, targetFrame, groups, frames, widths);
    const placedItem = adapted.item;
    const size = sizeOf(placedItem, widths);
    const x =
      adapted.slotX ??
      targetFrame.x + Math.max(PHONE_MARGIN, (frameSize.w - size.w) / 2);
    let y = targetFrame.y + PHONE_MARGIN;
    const rects = itemRectsOfGroups(groups, widths);
    const taken = (candidateY: number) =>
      rects.some(
        (rect) =>
          rect.l < x + size.w &&
          rect.r > x &&
          rect.t < candidateY + size.h &&
          rect.b > candidateY,
      );

    let tries = 0;
    while (
      taken(y) &&
      y + size.h + PHONE_MARGIN < targetFrame.y + frameSize.h &&
      tries++ < 20
    ) {
      y += size.h + 12;
    }

    const group: Group = {
      id: groupId,
      x: Math.round(x),
      y: Math.round(y),
      axis: connectSpecOf(placedItem)?.axis ?? "x",
      items: [placedItem],
    };
    return {
      item: placedItem,
      group: pullInto(group, targetFrame, widths),
    };
  }

  const size = sizeOf(item, widths);
  const x = (viewport.width / 2 - view.x) / view.z - size.w / 2;
  const y = (viewport.height / 2 - view.y) / view.z - size.h / 2;
  return {
    item,
    group: {
      id: groupId,
      x: Math.round(x),
      y: Math.round(y),
      axis: connectSpecOf(item)?.axis ?? "x",
      items: [item],
    },
  };
}
