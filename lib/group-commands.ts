import {
  GAP,
  collapseFree,
  explodeGroup,
  frameOfGroup,
  layoutOf,
  sizeOf,
  type Frame,
  type Group,
  type Item,
} from "./tokens";

export type GroupSelectionResult = {
  groups: Group[];
  selectedIds: string[];
  shiftedGroupIds: string[];
  groupId: string;
};

/**
 * Pulls at least two selected items out of their current runs into one free
 * group while preserving every selected item's world-space position. The new
 * free group occupies the layer slot of the topmost source group.
 */
export function groupItemSelection(
  groups: Group[],
  selectedIds: readonly string[],
  widths: Record<string, number>,
  makeId: () => string,
): GroupSelectionResult | null {
  const ids = new Set(selectedIds);
  if (ids.size < 2) return null;

  const rects = new Map<string, { x: number; y: number }>();
  for (const g of groups) {
    for (const placed of layoutOf(g, widths)) {
      rects.set(placed.item.id, { x: placed.x, y: placed.y });
    }
  }

  const picked: Item[] = [];
  let top = -1;
  groups.forEach((g, i) => {
    for (const it of g.items) {
      if (ids.has(it.id)) {
        picked.push(it);
        top = i;
      }
    }
  });
  if (picked.length < 2 || top < 0) return null;

  const l = Math.min(...picked.map((it) => rects.get(it.id)!.x));
  const t = Math.min(...picked.map((it) => rects.get(it.id)!.y));
  const pos: Record<string, { x: number; y: number }> = {};
  for (const it of picked) {
    const p = rects.get(it.id)!;
    pos[it.id] = { x: p.x - l, y: p.y - t };
  }

  const groupId = makeId();
  const grouped: Group = { id: groupId, x: l, y: t, axis: "x", items: picked, free: true, pos };
  const shiftedGroupIds: string[] = [];
  const out: Group[] = [];

  groups.forEach((g, i) => {
    if (g.free) {
      const rest = g.items.filter((it) => !ids.has(it.id));
      if (rest.length) out.push(collapseFree({ ...g, items: rest }, widths));
    } else {
      let x = g.x;
      let y = g.y;
      let items = g.items;
      while (items.length && ids.has(items[0].id)) {
        const sz = sizeOf(items[0], widths);
        if (g.axis === "x") x += sz.w + GAP;
        else y += sz.h + GAP;
        items = items.slice(1);
      }
      items = items.filter((it) => !ids.has(it.id));
      if (items.length) {
        if (x !== g.x || y !== g.y) shiftedGroupIds.push(g.id);
        out.push({ ...g, x, y, items });
      }
    }
    if (i === top) out.push(grouped);
  });

  return {
    groups: out,
    selectedIds: picked.map((it) => it.id),
    shiftedGroupIds,
    groupId,
  };
}

export type UngroupResult = {
  groups: Group[];
  newGroupIds: string[];
};

/** Splits one free group back into the runs represented by its current layout. */
export function ungroupFreeGroup(
  groups: Group[],
  groupId: string,
  widths: Record<string, number>,
  makeId: () => string,
): UngroupResult | null {
  const group = groups.find((g) => g.id === groupId && g.free);
  if (!group) return null;
  const singles = explodeGroup(group, widths).map((run) => ({ ...run, id: makeId() }));
  return {
    groups: groups.flatMap((g) => (g.id === groupId ? singles : [g])),
    newGroupIds: singles.map((g) => g.id),
  };
}

/** Moves every group touched by the item selection by the same delta. */
export function nudgeItemGroups(
  groups: Group[],
  selectedIds: readonly string[],
  dx: number,
  dy: number,
): Group[] {
  if (selectedIds.length === 0) return groups;
  const ids = new Set(selectedIds);
  return groups.map((g) =>
    g.items.some((it) => ids.has(it.id)) ? { ...g, x: g.x + dx, y: g.y + dy } : g,
  );
}

export type NudgeFrameResult = {
  frames: Frame[];
  groups: Group[];
  movedGroupIds: string[];
};

/** Moves a frame together with the groups whose centres currently belong to it. */
export function nudgeFrameWithGroups(
  frames: Frame[],
  groups: Group[],
  frameId: string,
  widths: Record<string, number>,
  dx: number,
  dy: number,
): NudgeFrameResult | null {
  const frame = frames.find((f) => f.id === frameId);
  if (!frame) return null;

  const movedGroupIds = groups
    .filter((g) => frameOfGroup(g, frames, widths)?.id === frameId)
    .map((g) => g.id);
  const carried = new Set(movedGroupIds);

  return {
    frames: frames.map((f) =>
      f.id === frameId ? { ...f, x: f.x + dx, y: f.y + dy } : f,
    ),
    groups: groups.map((g) =>
      carried.has(g.id) ? { ...g, x: g.x + dx, y: g.y + dy } : g,
    ),
    movedGroupIds,
  };
}
