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

write('lib/navigation-links.ts', '''import type { ItemRect } from "./canvas-selection";
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
''')

write('lib/navigation-links.test.ts', '''import { describe, expect, it } from "vitest";
import { itemRectsOfGroups } from "./canvas-selection";
import { buildNavigationLinks, patchNavigationLink } from "./navigation-links";
import { BACK_TARGET, makeItem, type Frame, type Group } from "./tokens";

const source: Frame = { id: "source", name: "Source", x: 0, y: 0 };
const target: Frame = { id: "target", name: "Target", x: 600, y: 0 };

function linkedGroup(): Group {
  return {
    id: "g",
    x: 16,
    y: 120,
    axis: "x",
    items: [
      {
        ...makeItem("button"),
        id: "button",
        action: { to: "target", transition: "slide" },
      },
    ],
  };
}

describe("navigation link geometry", () => {
  it("builds a rightward curve to the target frame", () => {
    const group = linkedGroup();
    const links = buildNavigationLinks(
      [group],
      [source, target],
      itemRectsOfGroups([group], {}),
    );
    expect(links).toHaveLength(1);
    expect(links[0].id).toBe("button|");
    expect(links[0].ang).toBe(0);
    expect(links[0].tx).toBeLessThan(target.x);
    expect(links[0].d.startsWith("M")).toBe(true);
  });

  it("does not draw back-stack actions", () => {
    const group = linkedGroup();
    group.items[0].action = { to: BACK_TARGET, transition: "slide" };
    expect(
      buildNavigationLinks(
        [group],
        [source, target],
        itemRectsOfGroups([group], {}),
      ),
    ).toEqual([]);
  });
});

describe("navigation link mutation", () => {
  it("patches a top-level transition", () => {
    const next = patchNavigationLink([linkedGroup()], "button|", (action) => ({
      ...action,
      transition: "fade",
    }));
    expect(next[0].items[0].action?.transition).toBe("fade");
  });

  it("removes one slot action without deleting the other slots", () => {
    const group = linkedGroup();
    group.items[0] = {
      ...group.items[0],
      actions: {
        "tab:0": { to: "target", transition: "slide" },
        "tab:1": { to: "source", transition: "fade" },
      },
    };
    const next = patchNavigationLink([group], "button|tab:0", () => undefined);
    expect(next[0].items[0].actions?.["tab:0"]).toBeUndefined();
    expect(next[0].items[0].actions?.["tab:1"]?.to).toBe("source");
  });
});
''')

write('lib/run-radii.ts', '''import { lerp, type Axis, type Radii } from "./tokens";

/** Corner geometry for a connected run while a dragged placeholder opens a gap. */
export function interpolatedRunRadii(
  axis: Axis,
  first: boolean,
  last: boolean,
  previousPlaceholder: boolean,
  nextPlaceholder: boolean,
  pull: number,
  outer: number,
  inner: number,
): Radii {
  const soft = lerp(outer, inner, pull);
  const start = first ? outer : previousPlaceholder ? soft : inner;
  const end = last ? outer : nextPlaceholder ? soft : inner;
  return axis === "x"
    ? { tl: start, bl: start, tr: end, br: end }
    : { tl: start, tr: start, bl: end, br: end };
}
''')

write('lib/run-radii.test.ts', '''import { describe, expect, it } from "vitest";
import { interpolatedRunRadii } from "./run-radii";

describe("interpolated run radii", () => {
  it("keeps outer corners on the ends of a horizontal run", () => {
    expect(interpolatedRunRadii("x", true, false, false, false, 1, 20, 4)).toEqual({
      tl: 20,
      bl: 20,
      tr: 4,
      br: 4,
    });
  });

  it("softens the edge beside an opening placeholder", () => {
    expect(interpolatedRunRadii("y", false, false, true, false, 0.5, 20, 4)).toEqual({
      tl: 12,
      tr: 12,
      bl: 4,
      br: 4,
    });
  });
});
''')

page_path = ROOT / 'app/page.tsx'
page = page_path.read_text(encoding='utf-8')
page = replace_once(
    page,
    'import { tidyStateForFrame, toggleFrameTidy, type TidySession } from "@/lib/tidy-session";\n',
    'import { tidyStateForFrame, toggleFrameTidy, type TidySession } from "@/lib/tidy-session";\nimport { buildNavigationLinks, patchNavigationLink } from "@/lib/navigation-links";\nimport { interpolatedRunRadii } from "@/lib/run-radii";\n',
    'navigation imports',
)
old_links = '''  /** arrows from tappable parts to the frames they open */\n  const links = useMemo(() => {\n    if (frame !== "phone") return [];\n    const rects = itemRects();\n    const out: {\n      id: string;\n      d: string;\n      mx: number;\n      my: number;\n      tx: number;\n      ty: number;\n      ang: number;\n      t: Transition;\n    }[] = [];\n    for (const g of groups) {\n      for (const it of g.items) {\n        for (const { slot, action } of actionsOf(it)) {\n        if (action.to === BACK_TARGET) continue;\n        const f = frames.find((x) => x.id === action.to);\n        const r = rects.find((x) => x.id === it.id);\n        if (!f || !r) continue;\n        const fr = frameRect(f);\n        const rightward = (fr.l + fr.r) / 2 >= (r.l + r.r) / 2;\n        const sx = rightward ? r.r : r.l;\n        const sy = (r.t + r.b) / 2;\n        const tx = rightward ? fr.l - BEZEL : fr.r + BEZEL;\n        const ty = clamp(sy, fr.t + 40, fr.b - 40);\n        const dx = Math.max(60, Math.abs(tx - sx) * 0.5);\n        const c1x = sx + (rightward ? dx : -dx);\n        const c2x = tx + (rightward ? -dx : dx);\n        const d = `M${sx} ${sy} C${c1x} ${sy} ${c2x} ${ty} ${tx} ${ty}`;\n        // midpoint of the cubic at t = 0.5\n        const mx = 0.125 * sx + 0.375 * c1x + 0.375 * c2x + 0.125 * tx;\n        const my = 0.125 * sy + 0.375 * sy + 0.375 * ty + 0.125 * ty;\n        out.push({\n          id: `${it.id}|${slot}`,\n          d,\n          mx,\n          my,\n          tx,\n          ty,\n          ang: rightward ? 0 : 180,\n          t: action.transition,\n        });\n        }\n      }\n    }\n    return out;\n  }, [groups, frames, frame, itemRects, widths]);\n'''
new_links = '''  /** arrows from tappable parts to the frames they open */\n  const links = useMemo(\n    () =>\n      frame === "phone"\n        ? buildNavigationLinks(groups, frames, itemRects())\n        : [],\n    [groups, frames, frame, itemRects, widths],\n  );\n'''
page = replace_once(page, old_links, new_links, 'link geometry block')
old_patch = '''  /** apply a change to the action behind a link id ("itemId|slot") */\n  const patchLink = (linkId: string, fn: (a: Action) => Action | undefined) => {\n    const [itemId, slot] = linkId.split("|");\n    setGroups((gs) =>\n      gs.map((g) => ({\n        ...g,\n        items: g.items.map((it) => {\n          if (it.id !== itemId) return it;\n          if (!slot) return { ...it, action: it.action ? fn(it.action) : undefined };\n          const cur = it.actions?.[slot];\n          if (!cur) return it;\n          const next = fn(cur);\n          const actions = { ...(it.actions ?? {}) };\n          if (next) actions[slot] = next;\n          else delete actions[slot];\n          return { ...it, actions: Object.keys(actions).length ? actions : undefined };\n        }),\n      })),\n    );\n  };\n'''
new_patch = '''  /** apply a change to the action behind a link id ("itemId|slot") */\n  const patchLink = (linkId: string, fn: (a: Action) => Action | undefined) => {\n    setGroups((groups) => patchNavigationLink(groups, linkId, fn));\n  };\n'''
page = replace_once(page, old_patch, new_patch, 'link mutation block')
old_radii = '''  const runRadii = (\n    axis: Axis,\n    first: boolean,\n    last: boolean,\n    prevPh: boolean,\n    nextPh: boolean,\n    pull: number,\n    outer: number,\n    inner: number,\n  ): Radii => {\n    const soft = lerp(outer, inner, pull);\n    const s = first ? outer : prevPh ? soft : inner;\n    const e = last ? outer : nextPh ? soft : inner;\n    return axis === "x"\n      ? { tl: s, bl: s, tr: e, br: e }\n      : { tl: s, tr: s, bl: e, br: e };\n  };\n\n'''
page = replace_once(page, old_radii, '', 'run radii helper')
page = page.replace('runRadii(\n', 'interpolatedRunRadii(\n')
page_path.write_text(page, encoding='utf-8')

print('navigation and run geometry refactored')
