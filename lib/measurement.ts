import type { Group, Item } from "./tokens";

/** Unique items that need a text measurement pass, including an in-flight palette item. */
export function collectMeasurementItems(
  groups: readonly Group[],
  draggingItem: Item | null,
): Item[] {
  const items = new Map<string, Item>();
  for (const group of groups) {
    for (const item of group.items) items.set(item.id, item);
  }
  if (draggingItem) items.set(draggingItem.id, draggingItem);
  return [...items.values()];
}

/** Returns true only when the measured width map actually changed. */
export function measuredWidthsChanged(
  current: Record<string, number>,
  next: Record<string, number>,
): boolean {
  const keys = Object.keys(next);
  return (
    keys.length !== Object.keys(current).length ||
    keys.some((key) => current[key] !== next[key])
  );
}
