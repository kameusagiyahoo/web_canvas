import {
  GAP,
  PHONE_MARGIN,
  collapseFree,
  connectSpecOf,
  frameOfGroup,
  frameSizeOf,
  layoutOf,
  sizeOf,
  type Frame,
  type Group,
  type Item,
} from "./tokens";

export type PatchItemResult = {
  groups: Group[];
  shiftedGroupIds: string[];
};

/**
 * Applies an item patch without React state. When a lone item is resized on a
 * phone canvas, keep the alignment the author established against its frame:
 * centre alignment stays centred and a far edge aligned to the screen or its
 * content margin stays anchored there.
 */
export function patchItemInGroups(
  groups: Group[],
  itemId: string,
  patch: Partial<Item>,
  frames: Frame[],
  widths: Record<string, number>,
  preservePhoneAlignment: boolean,
): PatchItemResult | null {
  const resizes = "size" in patch || "size2" in patch;
  const shiftedGroupIds: string[] = [];
  let found = false;

  const shiftForAxis = (
    pos: number,
    beforeLen: number,
    afterLen: number,
    frameStart: number,
    frameLen: number,
  ) => {
    const delta = afterLen - beforeLen;
    if (delta === 0) return 0;
    const near = (value: number, target: number) => Math.abs(value - target) <= 1;
    if (near(pos + beforeLen / 2, frameStart + frameLen / 2)) {
      return -Math.round(delta / 2);
    }
    if (
      near(pos + beforeLen, frameStart + frameLen - PHONE_MARGIN) ||
      near(pos + beforeLen, frameStart + frameLen)
    ) {
      return -delta;
    }
    return 0;
  };

  const next = groups.map((group) => {
    const index = group.items.findIndex((item) => item.id === itemId);
    if (index < 0) return group;
    found = true;

    const before = group.items[index];
    const after = { ...before, ...patch };
    let dx = 0;
    let dy = 0;

    if (resizes && preservePhoneAlignment && group.items.length === 1) {
      const frame = frameOfGroup(group, frames, widths);
      if (frame) {
        const frameSize = frameSizeOf(frame);
        const beforeSize = sizeOf(before, widths);
        const afterSize = sizeOf(after, widths);
        dx = shiftForAxis(group.x, beforeSize.w, afterSize.w, frame.x, frameSize.w);
        dy = shiftForAxis(group.y, beforeSize.h, afterSize.h, frame.y, frameSize.h);
      }
    }

    if (dx || dy) shiftedGroupIds.push(group.id);
    return {
      ...group,
      x: group.x + dx,
      y: group.y + dy,
      items: group.items.map((item, i) => (i === index ? after : item)),
    };
  });

  return found ? { groups: next, shiftedGroupIds } : null;
}

export type DeleteItemsResult = {
  groups: Group[];
  shiftedGroupIds: string[];
};

/**
 * Removes selected items while preserving the world-space position of the
 * remaining connected run. Free groups collapse back to a normal run when one
 * item remains.
 */
export function deleteItemsFromGroups(
  groups: Group[],
  selectedIds: readonly string[],
  widths: Record<string, number>,
): DeleteItemsResult {
  if (selectedIds.length === 0) return { groups, shiftedGroupIds: [] };

  const ids = new Set(selectedIds);
  const shiftedGroupIds: string[] = [];
  const next = groups
    .map((g) => {
      if (g.free) {
        return collapseFree(
          { ...g, items: g.items.filter((it) => !ids.has(it.id)) },
          widths,
        );
      }

      let x = g.x;
      let y = g.y;
      let items = g.items;
      while (items.length && ids.has(items[0].id)) {
        const sz = sizeOf(items[0], widths);
        if (g.axis === "x") x += sz.w + GAP;
        else y += sz.h + GAP;
        items = items.slice(1);
      }
      if (x !== g.x || y !== g.y) shiftedGroupIds.push(g.id);
      return { ...g, x, y, items: items.filter((it) => !ids.has(it.id)) };
    })
    .filter((g) => g.items.length > 0);

  return { groups: next, shiftedGroupIds };
}

function cloneItem(it: Item, id: string): Item {
  return {
    ...it,
    id,
    tabs: it.tabs?.map((tab) => ({ ...tab })),
  };
}

export type DuplicateItemsResult = {
  groups: Group[];
  selectedIds: string[];
  addedGroup: Group;
};

/**
 * Duplicates either a complete hand-made free group or the primary selected
 * item. ID generation is injected so the command stays deterministic in tests.
 */
export function duplicateItemSelection(
  groups: Group[],
  selectedIds: readonly string[],
  primaryId: string | null,
  widths: Record<string, number>,
  makeId: () => string,
  offset = 24,
): DuplicateItemsResult | null {
  if (!primaryId) return null;

  const selected = groups
    .flatMap((g) => g.items)
    .find((it) => it.id === primaryId);
  if (!selected) return null;

  const selectedSet = new Set(selectedIds);
  const freeGroup = groups.find(
    (g) => g.free && g.items.some((it) => it.id === selected.id),
  );

  if (freeGroup && freeGroup.items.every((it) => selectedSet.has(it.id))) {
    const idMap = new Map(freeGroup.items.map((it) => [it.id, makeId()]));
    const pos: Record<string, { x: number; y: number }> = {};
    for (const it of freeGroup.items) {
      pos[idMap.get(it.id)!] = freeGroup.pos?.[it.id] ?? { x: 0, y: 0 };
    }
    const copyGroup: Group = {
      ...freeGroup,
      id: makeId(),
      x: freeGroup.x + offset,
      y: freeGroup.y + offset,
      pos,
      items: freeGroup.items.map((it) => cloneItem(it, idMap.get(it.id)!)),
    };
    return {
      groups: [...groups, copyGroup],
      selectedIds: copyGroup.items.map((it) => it.id),
      addedGroup: copyGroup,
    };
  }

  const placed = groups
    .flatMap((g) => layoutOf(g, widths))
    .find((pl) => pl.item.id === selected.id);
  if (!placed) return null;

  const copy = cloneItem(selected, makeId());
  const copyGroup: Group = {
    id: makeId(),
    x: placed.x + offset,
    y: placed.y + offset,
    axis: connectSpecOf(copy)?.axis ?? "x",
    items: [copy],
  };
  return {
    groups: [...groups, copyGroup],
    selectedIds: [copy.id],
    addedGroup: copyGroup,
  };
}
