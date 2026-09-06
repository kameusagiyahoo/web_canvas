import { patchNavigationLink } from "./navigation-links";
import {
  BACK_TARGET,
  type Doc,
  type Frame,
  type Group,
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
