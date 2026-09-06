import { patchNavigationLink } from "./navigation-links";
import { placePickedItem } from "./part-placement";
import {
  BACK_TARGET,
  SWIPE_DIRS,
  actionSlotsOf,
  frameOfGroup,
  makeItem,
  uid,
  type Doc,
  type Frame,
  type Group,
  type SwipeDir,
  type Transition,
} from "./tokens";
import type { NavigationEdge } from "./navigation-graph";

export type NavigationEdgePatch = {
  to?: string;
  transition?: Transition;
  remove?: boolean;
};

export type NavigationEditResult = {
  frames: Frame[];
  groups: Group[];
};

export type NavigationRouteTrigger =
  | { kind: "item"; itemId: string; label: string }
  | { kind: "slot"; itemId: string; slot: string; label: string }
  | { kind: "swipe"; swipe: SwipeDir; label: string }
  | { kind: "new-button"; label: string };

/**
 * Apply an edit made through the derived navigation graph back to the existing
 * document navigation fields. The graph itself remains derived and is never
 * persisted as a second source of truth.
 */
export function editNavigationEdge(
  doc: Pick<Doc, "frames" | "groups">,
  edge: NavigationEdge,
  patch: NavigationEdgePatch,
): NavigationEditResult | null {
  if (edge.source === "swipe") {
    if (!edge.swipe) return null;
    const frameIndex = doc.frames.findIndex((frame) => frame.id === edge.fromFrameId);
    if (frameIndex < 0) return null;
    if (patch.to === BACK_TARGET) return null;

    const frames = doc.frames.map((frame, index) => {
      if (index !== frameIndex) return frame;
      const swipe = { ...(frame.swipe ?? {}) };
      if (patch.remove) delete swipe[edge.swipe!];
      else if (patch.to) swipe[edge.swipe!] = patch.to;
      else return frame;
      return {
        ...frame,
        swipe: Object.keys(swipe).length ? swipe : undefined,
      };
    });
    return { frames, groups: doc.groups.slice() };
  }

  if (!edge.itemId) return null;
  const linkId = `${edge.itemId}|${edge.slot ?? ""}`;
  const groups = patchNavigationLink(doc.groups.slice(), linkId, (action) => {
    if (patch.remove) return undefined;
    return {
      ...action,
      ...(patch.to !== undefined ? { to: patch.to } : {}),
      ...(patch.transition !== undefined ? { transition: patch.transition } : {}),
    };
  });
  return { frames: doc.frames.slice(), groups };
}

/** Returns currently unused interaction slots on one source screen. */
export function availableNavigationRouteTriggers(
  doc: Pick<Doc, "frames" | "groups">,
  widths: Record<string, number>,
  sourceFrameId: string,
): NavigationRouteTrigger[] {
  const sourceFrame = doc.frames.find((frame) => frame.id === sourceFrameId);
  if (!sourceFrame) return [];

  const triggers: NavigationRouteTrigger[] = [];
  for (const group of doc.groups) {
    if (frameOfGroup(group, doc.frames, widths)?.id !== sourceFrameId) continue;
    for (const item of group.items) {
      if (!item.action) {
        triggers.push({
          kind: "item",
          itemId: item.id,
          label: item.label || item.kind,
        });
      }
      for (const slot of actionSlotsOf(item)) {
        if (item.actions?.[slot.key]) continue;
        triggers.push({
          kind: "slot",
          itemId: item.id,
          slot: slot.key,
          label: `${item.label || item.kind} / ${slot.label}`,
        });
      }
    }
  }

  for (const swipe of SWIPE_DIRS) {
    if (sourceFrame.swipe?.[swipe.key]) continue;
    triggers.push({
      kind: "swipe",
      swipe: swipe.key,
      label: swipe.key,
    });
  }

  triggers.push({ kind: "new-button", label: "New button" });
  return triggers;
}

/**
 * Creates a new route chosen in the graph and writes it into the existing Doc
 * navigation fields. No graph-owned edge is persisted.
 */
export function createNavigationRoute(
  doc: Pick<Doc, "frames" | "groups">,
  widths: Record<string, number>,
  sourceFrameId: string,
  targetFrameId: string,
  trigger: NavigationRouteTrigger,
  transition: Transition = "slide",
): NavigationEditResult | null {
  const sourceFrame = doc.frames.find((frame) => frame.id === sourceFrameId);
  const targetFrame = doc.frames.find((frame) => frame.id === targetFrameId);
  if (!sourceFrame || !targetFrame) return null;

  if (trigger.kind === "swipe") {
    if (sourceFrame.swipe?.[trigger.swipe]) return null;
    return {
      groups: doc.groups.slice(),
      frames: doc.frames.map((frame) =>
        frame.id === sourceFrameId
          ? { ...frame, swipe: { ...(frame.swipe ?? {}), [trigger.swipe]: targetFrameId } }
          : frame,
      ),
    };
  }

  if (trigger.kind === "new-button") {
    const item = {
      ...makeItem("button"),
      label: targetFrame.name ? `Open ${targetFrame.name}` : "Open screen",
      action: { to: targetFrameId, transition },
    };
    const placed = placePickedItem({
      item,
      targetFrame: sourceFrame,
      groups: doc.groups.slice(),
      frames: doc.frames.slice(),
      widths,
      view: { x: 0, y: 0, z: 1 },
      viewport: { width: 1, height: 1 },
      groupId: uid(),
    });
    return {
      frames: doc.frames.slice(),
      groups: [...doc.groups, placed.group],
    };
  }

  let changed = false;
  const groups: Group[] = doc.groups.map((group) => {
    if (frameOfGroup(group, doc.frames, widths)?.id !== sourceFrameId) return group;
    return {
      ...group,
      items: group.items.map((item) => {
        if (item.id !== trigger.itemId) return item;
        if (trigger.kind === "item") {
          if (item.action) return item;
          changed = true;
          return { ...item, action: { to: targetFrameId, transition } };
        }
        if (item.actions?.[trigger.slot]) return item;
        changed = true;
        return {
          ...item,
          actions: {
            ...(item.actions ?? {}),
            [trigger.slot]: { to: targetFrameId, transition },
          },
        };
      }),
    };
  });

  return changed ? { frames: doc.frames.slice(), groups } : null;
}
