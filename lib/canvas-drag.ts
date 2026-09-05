import type { Frame, Group } from "./tokens";

export type DragOrigin = {
  id: string;
  x: number;
  y: number;
};

/**
 * Moves one group from the coordinates captured when the gesture started.
 * Using the original coordinates avoids cumulative rounding drift while a
 * pointermove stream updates React state repeatedly.
 */
export function dragGroupFromOrigin(
  groups: readonly Group[],
  groupId: string,
  originX: number,
  originY: number,
  dx: number,
  dy: number,
): Group[] {
  return groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          x: Math.round(originX + dx),
          y: Math.round(originY + dy),
        }
      : group,
  );
}

/** Moves one frame from the coordinates captured when its drag began. */
export function dragFrameFromOrigin(
  frames: readonly Frame[],
  frameId: string,
  originX: number,
  originY: number,
  dx: number,
  dy: number,
): Frame[] {
  return frames.map((frame) =>
    frame.id === frameId
      ? {
          ...frame,
          x: Math.round(originX + dx),
          y: Math.round(originY + dy),
        }
      : frame,
  );
}

/**
 * Moves the groups captured as belonging to a frame when the frame drag began.
 * Membership is intentionally fixed for the duration of the gesture so a part
 * cannot jump in or out of the carried set while crossing a frame boundary.
 */
export function dragCarriedGroupsFromOrigins(
  groups: readonly Group[],
  origins: readonly DragOrigin[],
  dx: number,
  dy: number,
): Group[] {
  if (origins.length === 0) return groups.slice();
  const byId = new Map(origins.map((origin) => [origin.id, origin]));
  return groups.map((group) => {
    const origin = byId.get(group.id);
    return origin
      ? {
          ...group,
          x: Math.round(origin.x + dx),
          y: Math.round(origin.y + dy),
        }
      : group;
  });
}
