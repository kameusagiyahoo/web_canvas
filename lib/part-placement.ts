import {
  FULL_WIDTH,
  Frame,
  Group,
  Item,
  PHONE_H,
  PHONE_W,
  carryItemSize,
  fitHeight,
  frameSizeOf,
} from "./tokens";
import { barSlotOf } from "./tidy";

export type AdaptedFrameItem = {
  item: Item;
  slotX: number | null;
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
