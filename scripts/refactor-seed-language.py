from pathlib import Path

ROOT = Path('.')

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    if text.count(old) != 1:
        raise SystemExit(f'non-unique anchor ({text.count(old)}): {label}')
    return text.replace(old, new, 1)

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')

write('lib/document-language.ts', '''import type { Group, Frame } from "./tokens";
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
''')

write('lib/document-language.test.ts', '''import { describe, expect, it } from "vitest";
import { makeItem, type Frame, type Group } from "./tokens";
import { translateDocumentSnapshot } from "./document-language";

const frame: Frame = { id: "f", name: "Home", x: 0, y: 0 };
const group: Group = {
  id: "g",
  x: 0,
  y: 0,
  axis: "x",
  items: [{ ...makeItem("button"), id: "i", label: "Button" }],
};

describe("document language translation", () => {
  it("translates known default copy", () => {
    const translated = translateDocumentSnapshot({ groups: [group], frames: [frame] }, "ja");
    expect(translated.frames[0].name).not.toBe("Home");
    expect(translated.groups[0].items[0].label).not.toBe("Button");
  });

  it("preserves extra snapshot metadata used by whole-document undo", () => {
    const meta = { title: "Project", marker: 42 };
    const translated = translateDocumentSnapshot(
      { groups: [group], frames: [frame], meta },
      "ja",
    );
    expect(translated.meta).toBe(meta);
  });

  it("does not rewrite custom labels", () => {
    const custom: Group = {
      ...group,
      items: [{ ...group.items[0], label: "My custom action" }],
    };
    expect(
      translateDocumentSnapshot({ groups: [custom], frames: [frame] }, "ja")
        .groups[0].items[0].label,
    ).toBe("My custom action");
  });
});
''')

write('lib/editor-seed.ts', '''import {
  KIND_SPEC,
  PHONE_H,
  PHONE_MARGIN,
  PHONE_W,
  makeItem,
  uid,
  type Frame,
  type Group,
  type Kind,
} from "./tokens";
import { SEED_TEXT, getLang, t, type Lang } from "./i18n";

export const DEFAULT_SEED_FRAMES: Frame[] = [
  { id: "seedF1", name: "Home", x: 0, y: 0 },
];

/** Deterministic desktop seed so server and client render identical markup. */
export function createDesktopSeed(lang: Lang = getLang()): Group[] {
  const text = SEED_TEXT[lang];
  let n = 0;
  const sid = () => `seed${++n}`;
  const make = (kind: Kind) => ({ ...makeItem(kind), id: sid() });
  const bar = make("topAppBar");
  const first = make("button");
  const second = make("button");
  first.label = text.favorite;
  first.icon = "star";
  second.label = text.share;
  second.icon = "share";
  second.variant = "tonal";
  const rows = [text.inbox, text.starred, text.archive].map((label, index) => {
    const item = make("listItem");
    item.label = label;
    item.icon = ["inbox", "star", "archive"][index];
    item.supporting = text.supporting;
    return item;
  });
  const nav = make("bottomNav");
  const fab = make("fab");
  return [
    { id: sid(), x: 0, y: 0, axis: "x", items: [bar] },
    { id: sid(), x: PHONE_MARGIN, y: 96, axis: "x", items: [first, second] },
    { id: sid(), x: PHONE_MARGIN, y: 184, axis: "y", items: rows },
    {
      id: sid(),
      x: PHONE_W - 56 - PHONE_MARGIN,
      y: PHONE_H - KIND_SPEC.bottomNav.h - 56 - PHONE_MARGIN,
      axis: "x",
      items: [fab],
    },
    {
      id: sid(),
      x: 0,
      y: PHONE_H - KIND_SPEC.bottomNav.h,
      axis: "x",
      items: [nav],
    },
  ];
}

/** Lightweight first-run seed for the phone editor. */
export function createMobileSeed(
  lang: Lang = getLang(),
  makeId: () => string = uid,
): Group[] {
  const text = SEED_TEXT[lang];
  const first = makeItem("button");
  const second = makeItem("button");
  const third = makeItem("button");
  first.label = text.favorite;
  first.icon = "star";
  second.label = text.share;
  second.icon = "share";
  second.variant = "tonal";
  third.label = text.start;
  third.icon = "arrow_forward";
  return [
    { id: makeId(), x: PHONE_MARGIN, y: 120, axis: "x", items: [first, second] },
    { id: makeId(), x: PHONE_MARGIN, y: 200, axis: "x", items: [third] },
  ];
}

export function localizedSeedFrame(lang: Lang, makeId: () => string = uid): Frame {
  return { id: makeId(), name: t("home", lang), x: 0, y: 0 };
}
''')

write('lib/editor-seed.test.ts', '''import { describe, expect, it } from "vitest";
import { createDesktopSeed, createMobileSeed, localizedSeedFrame } from "./editor-seed";

describe("editor seeds", () => {
  it("keeps desktop seed ids deterministic", () => {
    expect(createDesktopSeed("en")).toEqual(createDesktopSeed("en"));
  });

  it("localizes desktop seed copy", () => {
    const en = createDesktopSeed("en");
    const ja = createDesktopSeed("ja");
    expect(en[1].items[0].label).not.toBe(ja[1].items[0].label);
  });

  it("injects mobile group ids for deterministic tests", () => {
    const ids = ["g1", "g2"];
    expect(createMobileSeed("en", () => ids.shift()!).map((g) => g.id)).toEqual([
      "g1",
      "g2",
    ]);
  });

  it("creates a localized initial mobile frame", () => {
    expect(localizedSeedFrame("en", () => "frame")).toEqual({
      id: "frame",
      name: "Home",
      x: 0,
      y: 0,
    });
  });
});
''')

page_path = ROOT / 'app/page.tsx'
page = page_path.read_text(encoding='utf-8')
page = replace_once(
    page,
    'import { interpolatedRunRadii } from "@/lib/run-radii";\n',
    'import { interpolatedRunRadii } from "@/lib/run-radii";\nimport { translateDocumentSnapshot } from "@/lib/document-language";\nimport { DEFAULT_SEED_FRAMES, createDesktopSeed, createMobileSeed, localizedSeedFrame } from "@/lib/editor-seed";\n',
    'seed/language imports',
)
start = page.index('function translateSnapshot(snap: Snapshot, lang: Lang): Snapshot {')
end_marker = '/** While the model works on a screen, the scheme\'s colors drift through its bezel. */'
end = page.index(end_marker)
page = page[:start] + page[end:]
page = page.replace('useState<Group[]>(seed)', 'useState<Group[]>(createDesktopSeed)')
page = page.replace('useState<Frame[]>(SEED_FRAMES)', 'useState<Frame[]>(DEFAULT_SEED_FRAMES)')
page = page.replace('translateSnapshot(', 'translateDocumentSnapshot(')
page = page.replace('setGroups(seed(initialLang));', 'setGroups(createDesktopSeed(initialLang));')
page = page.replace('setFrames([{ ...SEED_FRAMES[0], name: t("home", initialLang) }]);', 'setFrames([{ ...DEFAULT_SEED_FRAMES[0], name: t("home", initialLang) }]);')
page = page.replace('setGroups(mobileSeed(initialLangRef.current));', 'setGroups(createMobileSeed(initialLangRef.current));')
page = page.replace('setFrames([{ id: uid(), name: t("home", initialLangRef.current), x: 0, y: 0 }]);', 'setFrames([localizedSeedFrame(initialLangRef.current)]);')
page_path.write_text(page, encoding='utf-8')

print('seed and language logic refactored')
