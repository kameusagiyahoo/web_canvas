import type { Frame, Group } from "./tokens";
import { pushHistory } from "./ai";

export type FrameDescriptionResult = { name?: string; note: string };

/** Applies a model-written screen description while retaining the previous text. */
export function applyAiFrameDescription(
  frames: Frame[],
  frameId: string,
  result: FrameDescriptionResult,
): Frame[] {
  return frames.map((frame) =>
    frame.id === frameId
      ? {
          ...frame,
          note: result.note,
          noteHistory: pushHistory(frame.noteHistory, frame.note),
          name: result.name ?? frame.name,
        }
      : frame,
  );
}

/** Applies a model-written part behavior note while retaining the previous text. */
export function applyAiItemBehavior(
  groups: Group[],
  itemId: string,
  note: string,
): Group[] {
  return groups.map((group) =>
    group.items.some((item) => item.id === itemId)
      ? {
          ...group,
          items: group.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  note,
                  noteHistory: pushHistory(item.noteHistory, item.note),
                }
              : item,
          ),
        }
      : group,
  );
}
