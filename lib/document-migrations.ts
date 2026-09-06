import {
  KIND_SPEC,
  NAV_BAR_H,
  frameRect,
  type Frame,
  type Group,
} from "./tokens";

/**
 * Runtime compatibility for documents saved before the navigation bar gained
 * its system inset. Project-file version migrations live in project.ts; this
 * handles legacy editor/localStorage documents that predate that envelope.
 */
export function migrateLegacyGroups(groups: Group[], frames: Frame[]): Group[] {
  const oldNavH = KIND_SPEC.bottomNav.h - NAV_BAR_H;
  return groups.map((group) => {
    if (group.items.length !== 1 || group.items[0].kind !== "bottomNav") return group;
    const frame = frames.find((candidate) => {
      const rect = frameRect(candidate);
      return (
        group.x >= rect.l - 1 &&
        group.x <= rect.r &&
        group.y === rect.b - oldNavH
      );
    });
    return frame
      ? { ...group, y: frameRect(frame).b - KIND_SPEC.bottomNav.h }
      : group;
  });
}
