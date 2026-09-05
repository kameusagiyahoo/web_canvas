import { explodeGroup, Group } from "./tokens";

/** Reorder only the groups that belong to one screen. `topFirst` is the UI order. */
export function reorderFrameGroups(allGroups: Group[], topFirst: string[]): Group[] | null {
  const inFrame = new Set(topFirst);
  const byId = new Map(allGroups.map((g) => [g.id, g]));
  const ordered = [...topFirst]
    .reverse()
    .map((id) => byId.get(id))
    .filter((g): g is Group => !!g);

  if (ordered.length !== inFrame.size) return null;
  return [...allGroups.filter((g) => !inFrame.has(g.id)), ...ordered];
}

/** Reorder a group's items while preserving free-group layout slots. */
export function reorderItemsInGroup(group: Group, order: string[], widths: Record<string, number>): Group | null {
  const byId = new Map(group.items.map((it) => [it.id, it]));
  const items = order.map((id) => byId.get(id)).filter((it): it is Group["items"][number] => !!it);
  if (items.length !== group.items.length || new Set(order).size !== order.length) return null;

  if (!group.free) return { ...group, items };

  const rank = new Map(items.map((it, i) => [it.id, i]));
  const pos = { ...(group.pos ?? {}) };
  for (const run of explodeGroup(group, widths)) {
    if (run.items.length < 2) continue;
    const slots = run.items.map((it) => pos[it.id] ?? { x: 0, y: 0 });
    const members = [...run.items].sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    members.forEach((it, i) => {
      pos[it.id] = slots[i];
    });
  }

  return { ...group, items, pos };
}
