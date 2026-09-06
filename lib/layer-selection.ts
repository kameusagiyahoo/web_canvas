import { frameOfGroup, type Frame, type FrameMode, type Group } from "./tokens";

/** Frame ownership for groups, shared by canvas rendering and the Layers panel. */
export function groupFrameIdMap(
  groups: readonly Group[],
  frames: Frame[],
  widths: Record<string, number>,
  frameMode: FrameMode,
): Map<string, string> {
  const map = new Map<string, string>();
  if (frameMode !== "phone") return map;
  for (const group of groups) {
    const frame = frameOfGroup(group, frames, widths);
    if (frame) map.set(group.id, frame.id);
  }
  return map;
}

export type ResolveLayersFrameInput = {
  frameMode: FrameMode;
  frames: Frame[];
  groups: readonly Group[];
  groupFrames: ReadonlyMap<string, string>;
  primaryItemId: string | null;
  selectedFrameId: string | null;
  rememberedFrameId: string | null;
};

/** Resolves the Layers panel's active screen using the editor's existing priority. */
export function resolveLayersFrame({
  frameMode,
  frames,
  groups,
  groupFrames,
  primaryItemId,
  selectedFrameId,
  rememberedFrameId,
}: ResolveLayersFrameInput): Frame | null {
  if (frameMode !== "phone") return null;
  if (primaryItemId) {
    const group = groups.find((candidate) =>
      candidate.items.some((item) => item.id === primaryItemId),
    );
    const frameId = group ? groupFrames.get(group.id) : undefined;
    if (frameId) return frames.find((frame) => frame.id === frameId) ?? null;
  }
  if (selectedFrameId) {
    return frames.find((frame) => frame.id === selectedFrameId) ?? null;
  }
  return (
    frames.find((frame) => frame.id === rememberedFrameId) ?? frames[0] ?? null
  );
}

export function groupsForFrame(
  groups: readonly Group[],
  groupFrames: ReadonlyMap<string, string>,
  frameId: string | null,
): Group[] {
  if (!frameId) return [];
  return groups.filter((group) => groupFrames.get(group.id) === frameId);
}
