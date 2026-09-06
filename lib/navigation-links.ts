import type { ItemRect } from "./canvas-selection";
import {
  actionsOf,
  BACK_TARGET,
  BEZEL,
  clamp,
  frameRect,
  type Action,
  type Frame,
  type Group,
  type Transition,
} from "./tokens";

export type CanvasNavigationLink = {
  id: string;
  d: string;
  mx: number;
  my: number;
  tx: number;
  ty: number;
  ang: number;
  t: Transition;
};

/** Builds the curved editor arrows for every screen-navigation action. */
export function buildNavigationLinks(
  groups: readonly Group[],
  frames: readonly Frame[],
  rects: readonly ItemRect[],
): CanvasNavigationLink[] {
  const out: CanvasNavigationLink[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      for (const { slot, action } of actionsOf(item)) {
        if (action.to === BACK_TARGET) continue;
        const frame = frames.find((candidate) => candidate.id === action.to);
        const rect = rects.find((candidate) => candidate.id === item.id);
        if (!frame || !rect) continue;
        const target = frameRect(frame);
        const rightward =
          (target.l + target.r) / 2 >= (rect.l + rect.r) / 2;
        const sx = rightward ? rect.r : rect.l;
        const sy = (rect.t + rect.b) / 2;
        const tx = rightward ? target.l - BEZEL : target.r + BEZEL;
        const ty = clamp(sy, target.t + 40, target.b - 40);
        const dx = Math.max(60, Math.abs(tx - sx) * 0.5);
        const c1x = sx + (rightward ? dx : -dx);
        const c2x = tx + (rightward ? -dx : dx);
        out.push({
          id: `${item.id}|${slot}`,
          d: `M${sx} ${sy} C${c1x} ${sy} ${c2x} ${ty} ${tx} ${ty}`,
          mx: 0.125 * sx + 0.375 * c1x + 0.375 * c2x + 0.125 * tx,
          my: 0.125 * sy + 0.375 * sy + 0.375 * ty + 0.125 * ty,
          tx,
          ty,
          ang: rightward ? 0 : 180,
          t: action.transition,
        });
      }
    }
  }
  return out;
}

/** Applies an edit to one top-level or per-slot navigation edge. */
export function patchNavigationLink(
  groups: Group[],
  linkId: string,
  patch: (action: Action) => Action | undefined,
): Group[] {
  const [itemId, slot] = linkId.split("|");
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      if (item.id !== itemId) return item;
      if (!slot) {
        return {
          ...item,
          action: item.action ? patch(item.action) : undefined,
        };
      }
      const current = item.actions?.[slot];
      if (!current) return item;
      const next = patch(current);
      const actions = { ...(item.actions ?? {}) };
      if (next) actions[slot] = next;
      else delete actions[slot];
      return {
        ...item,
        actions: Object.keys(actions).length ? actions : undefined,
      };
    }),
  }));
}
