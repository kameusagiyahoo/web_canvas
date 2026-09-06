import type { Group, Frame } from "./tokens";
import type { Lang } from "./i18n";
import { translateDefaultFrameName, translateDefaultText } from "./i18n";

export type TranslatableSnapshot = {
  groups: Group[];
  frames: Frame[];
};

/**
 * Translates only editor-provided default copy while retaining every other
 * snapshot field. The generic return preserves history metadata for whole-doc
 * undo steps when the UI language changes.
 */
export function translateDocumentSnapshot<T extends TranslatableSnapshot>(
  snapshot: T,
  lang: Lang,
): T {
  return {
    ...snapshot,
    groups: snapshot.groups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        label: translateDefaultText(item.label, item.kind, "label", lang),
        ...(item.supporting !== undefined && {
          supporting: translateDefaultText(
            item.supporting,
            item.kind,
            "supporting",
            lang,
          ),
        }),
        ...(item.tabs && {
          tabs: item.tabs.map((tab) => ({
            ...tab,
            label: translateDefaultText(tab.label, item.kind, "tab", lang),
          })),
        }),
      })),
    })),
    frames: snapshot.frames.map((frame) => ({
      ...frame,
      name: translateDefaultFrameName(frame.name, lang),
    })),
  };
}
