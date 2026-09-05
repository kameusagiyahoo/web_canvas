import {
  Frame,
  FRAME_GAP,
  Group,
  PHONE_W,
  frameOfGroup,
  frameRect,
  groupBounds,
} from "./tokens";

export type DeleteFrameResult = {
  frames: Frame[];
  groups: Group[];
  removedGroupIds: Set<string>;
};

/** X position used by newly-created or duplicated screens. */
export function nextFrameX(frames: Frame[]): number {
  return frames.length
    ? Math.max(...frames.map((frame) => frameRect(frame).r)) + FRAME_GAP
    : 0;
}

export type CreateFrameOptions = {
  id: string;
  name: string;
};

/**
 * Creates the first phone screen around existing loose content using the legacy
 * editor placement rules. Empty documents start at the world origin.
 */
export function createInitialPhoneFrame(
  groups: readonly Group[],
  widths: Record<string, number>,
  options: CreateFrameOptions,
): Frame {
  let x = 0;
  let y = 0;

  if (groups.length > 0) {
    const bounds = groups.map((group) => groupBounds(group, widths));
    const left = Math.min(...bounds.map((rect) => rect.l));
    const top = Math.min(...bounds.map((rect) => rect.t));
    const right = Math.max(...bounds.map((rect) => rect.r));

    x = Math.round(
      Math.max(
        left - 24,
        right - PHONE_W + 24 > left ? left : left - 24,
      ),
    );
    y = Math.round(top - 72);
    x = Math.min(x, left);
    y = Math.min(y, top);
  }

  return { id: options.id, name: options.name, x, y };
}

/** Creates the next screen after the current rightmost screen and aligns its top. */
export function createNextFrame(
  frames: readonly Frame[],
  options: CreateFrameOptions,
): Frame {
  return {
    id: options.id,
    name: options.name,
    x: nextFrameX(frames as Frame[]),
    y: frames[0]?.y ?? 0,
  };
}

/**
 * Pure document operation for deleting one screen.
 *
 * It removes groups that belong to the screen and clears every navigation edge
 * that pointed at it. UI selection/history handling stays in the caller.
 */
export function deleteFrameFromDocument(
  frames: Frame[],
  groups: Group[],
  widths: Record<string, number>,
  frameId: string,
): DeleteFrameResult {
  const removedGroupIds = new Set(
    groups
      .filter((group) => frameOfGroup(group, frames, widths)?.id === frameId)
      .map((group) => group.id),
  );

  const nextFrames = frames
    .filter((frame) => frame.id !== frameId)
    .map((frame) => {
      if (!frame.swipe) return frame;
      const swipe = Object.fromEntries(
        Object.entries(frame.swipe).filter(([, target]) => target !== frameId),
      );
      return {
        ...frame,
        swipe: Object.keys(swipe).length ? swipe : undefined,
      };
    });

  const nextGroups = groups
    .filter((group) => !removedGroupIds.has(group.id))
    .map((group) => ({
      ...group,
      items: group.items.map((item) => {
        const next = { ...item };
        if (next.action?.to === frameId) next.action = undefined;
        if (next.actions) {
          const actions = Object.fromEntries(
            Object.entries(next.actions).filter(
              ([, action]) => action.to !== frameId,
            ),
          );
          next.actions = Object.keys(actions).length ? actions : undefined;
        }
        return next;
      }),
    }));

  return { frames: nextFrames, groups: nextGroups, removedGroupIds };
}

export type DuplicateFrameOptions = {
  makeId: () => string;
  copySuffix: string;
};

export type DuplicateFrameResult = {
  frame: Frame;
  frames: Frame[];
  groups: Group[];
};

/**
 * Pure document operation for duplicating one screen and every group on it.
 * IDs are injected so tests can be deterministic and the UI can continue using
 * the existing uid() implementation.
 */
export function duplicateFrameInDocument(
  frames: Frame[],
  groups: Group[],
  widths: Record<string, number>,
  frameId: string,
  options: DuplicateFrameOptions,
): DuplicateFrameResult | null {
  const source = frames.find((frame) => frame.id === frameId);
  if (!source) return null;

  const frame: Frame = {
    ...source,
    id: options.makeId(),
    name: `${source.name}${options.copySuffix}`,
    x: nextFrameX(frames),
  };
  const dx = frame.x - source.x;

  const copies = groups
    .filter((group) => frameOfGroup(group, frames, widths)?.id === frameId)
    .map((group) => {
      const itemIds = new Map(
        group.items.map((item) => [item.id, options.makeId()]),
      );
      const pos = group.pos
        ? Object.fromEntries(
            Object.entries(group.pos).map(([id, offset]) => [
              itemIds.get(id) ?? id,
              offset,
            ]),
          )
        : undefined;
      return {
        ...group,
        id: options.makeId(),
        x: group.x + dx,
        pos,
        items: group.items.map((item) => ({
          ...item,
          id: itemIds.get(item.id)!,
          tabs: item.tabs?.map((tab) => ({ ...tab })),
        })),
      };
    });

  return {
    frame,
    frames: [...frames, frame],
    groups: [...groups, ...copies],
  };
}
