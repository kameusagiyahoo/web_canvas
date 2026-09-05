import { GAP, sizeOf, type Group, type Item } from "./tokens";
import type { Snap } from "./canvas-magnet";

export type DetachDragResult = {
  groups: Group[];
  shiftedGroupIds: string[];
};

/** Removes one item from a connected run when a drag becomes active. */
export function detachItemForDrag(
  groups: readonly Group[],
  itemId: string,
  widths: Record<string, number>,
): DetachDragResult {
  const shiftedGroupIds: string[] = [];
  const out: Group[] = [];

  for (const group of groups) {
    const index = group.items.findIndex((item) => item.id === itemId);
    if (index < 0) {
      out.push(group);
      continue;
    }

    const rest = group.items.filter((item) => item.id !== itemId);
    if (rest.length === 0) continue;

    const removedSize = sizeOf(group.items[index], widths);
    const removedAnchor = index === 0;
    if (removedAnchor) shiftedGroupIds.push(group.id);

    out.push({
      ...group,
      x:
        removedAnchor && group.axis === "x"
          ? group.x + removedSize.w + GAP
          : group.x,
      y:
        removedAnchor && group.axis === "y"
          ? group.y + removedSize.h + GAP
          : group.y,
      items: rest,
    });
  }

  return { groups: out, shiftedGroupIds };
}

/** Inserts a dragged item into a magnetic run slot, preserving the run anchor. */
export function insertItemAtSnap(
  groups: readonly Group[],
  item: Item,
  snap: Pick<Snap, "groupId" | "index">,
  widths: Record<string, number>,
): Group[] {
  if (groups.some((group) => group.items.some((entry) => entry.id === item.id))) {
    return groups as Group[];
  }

  const size = sizeOf(item, widths);
  let found = false;
  const next = groups.map((group) => {
    if (group.id !== snap.groupId) return group;
    found = true;
    const index = Math.max(0, Math.min(snap.index, group.items.length));
    const front = index === 0;
    return {
      ...group,
      x: front && group.axis === "x" ? group.x - size.w - GAP : group.x,
      y: front && group.axis === "y" ? group.y - size.h - GAP : group.y,
      items: [
        ...group.items.slice(0, index),
        item,
        ...group.items.slice(index),
      ],
    };
  });

  return found ? next : (groups as Group[]);
}
