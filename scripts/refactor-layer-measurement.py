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

write('lib/layer-selection.ts', '''import { frameOfGroup, type Frame, type FrameMode, type Group } from "./tokens";

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
''')

write('lib/layer-selection.test.ts', '''import { describe, expect, it } from "vitest";
import { groupFrameIdMap, groupsForFrame, resolveLayersFrame } from "./layer-selection";
import { makeItem, type Frame, type Group } from "./tokens";

const a: Frame = { id: "a", name: "A", x: 0, y: 0 };
const b: Frame = { id: "b", name: "B", x: 600, y: 0 };
const onA: Group = { id: "ga", x: 16, y: 120, axis: "x", items: [{ ...makeItem("button"), id: "ia" }] };
const onB: Group = { id: "gb", x: 616, y: 120, axis: "x", items: [{ ...makeItem("button"), id: "ib" }] };

describe("layer frame selection", () => {
  it("maps groups to the screen containing their center", () => {
    expect([...groupFrameIdMap([onA, onB], [a, b], {}, "phone")]).toEqual([
      ["ga", "a"],
      ["gb", "b"],
    ]);
  });

  it("prefers the selected item's screen over remembered screen state", () => {
    const map = new Map([["ga", "a"], ["gb", "b"]]);
    expect(resolveLayersFrame({
      frameMode: "phone",
      frames: [a, b],
      groups: [onA, onB],
      groupFrames: map,
      primaryItemId: "ib",
      selectedFrameId: null,
      rememberedFrameId: "a",
    })?.id).toBe("b");
  });

  it("falls back to explicit, remembered, then first frame", () => {
    const common = { frameMode: "phone" as const, frames: [a, b], groups: [onA], groupFrames: new Map([["ga", "a"]]), primaryItemId: null };
    expect(resolveLayersFrame({ ...common, selectedFrameId: "b", rememberedFrameId: "a" })?.id).toBe("b");
    expect(resolveLayersFrame({ ...common, selectedFrameId: null, rememberedFrameId: "b" })?.id).toBe("b");
    expect(resolveLayersFrame({ ...common, selectedFrameId: null, rememberedFrameId: null })?.id).toBe("a");
  });

  it("returns no frame ownership in blank canvas mode", () => {
    expect(groupFrameIdMap([onA], [a], {}, "blank").size).toBe(0);
  });

  it("filters layers by resolved screen", () => {
    expect(groupsForFrame([onA, onB], new Map([["ga", "a"], ["gb", "b"]]), "b")).toEqual([onB]);
  });
});
''')

write('lib/measurement.ts', '''import type { Group, Item } from "./tokens";

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
''')

write('lib/measurement.test.ts', '''import { describe, expect, it } from "vitest";
import { collectMeasurementItems, measuredWidthsChanged } from "./measurement";
import { makeItem, type Group } from "./tokens";

const one = { ...makeItem("button"), id: "one" };
const two = { ...makeItem("text"), id: "two" };
const groups: Group[] = [{ id: "g", x: 0, y: 0, axis: "x", items: [one, two] }];

describe("measurement helpers", () => {
  it("collects document and in-flight items once by id", () => {
    const replacement = { ...one, label: "Dragging" };
    const items = collectMeasurementItems(groups, replacement);
    expect(items.map((item) => item.id)).toEqual(["one", "two"]);
    expect(items[0].label).toBe("Dragging");
  });

  it("detects width key and value changes", () => {
    expect(measuredWidthsChanged({ one: 10 }, { one: 10 })).toBe(false);
    expect(measuredWidthsChanged({ one: 10 }, { one: 11 })).toBe(true);
    expect(measuredWidthsChanged({ one: 10 }, { one: 10, two: 20 })).toBe(true);
  });
});
''')

# Append world viewport helper and tests to existing canvas viewport files.
viewport_path = ROOT / 'lib/canvas-viewport.ts'
viewport = viewport_path.read_text(encoding='utf-8')
viewport += '''\n/** World-space rectangle currently visible through a viewport. */\nexport function visibleWorldRect(\n  view: CanvasView,\n  viewportWidth: number,\n  viewportHeight: number,\n) {\n  return {\n    l: -view.x / view.z,\n    t: -view.y / view.z,\n    w: viewportWidth / view.z,\n    h: viewportHeight / view.z,\n  };\n}\n'''
viewport_path.write_text(viewport, encoding='utf-8')

vt_path = ROOT / 'lib/canvas-viewport.test.ts'
vt = vt_path.read_text(encoding='utf-8')
vt = replace_once(vt, 'import {', 'import {', 'viewport test import anchor')
# Add named import by modifying first import block terminator through a direct string token.
if 'visibleWorldRect' not in vt:
    # Most tests import a multiline list from ./canvas-viewport; insert before closing `} from`.
    marker = '} from "./canvas-viewport";'
    if marker not in vt:
        raise SystemExit('canvas viewport test import marker missing')
    vt = vt.replace(marker, '  visibleWorldRect,\n' + marker, 1)
    vt += '''\n\ndescribe("visibleWorldRect", () => {\n  it("converts the current camera into world bounds", () => {\n    expect(visibleWorldRect({ x: -100, y: -50, z: 2 }, 800, 600)).toEqual({\n      l: 50,\n      t: 25,\n      w: 400,\n      h: 300,\n    });\n  });\n});\n'''
vt_path.write_text(vt, encoding='utf-8')

page_path = ROOT / 'app/page.tsx'
page = page_path.read_text(encoding='utf-8')
page = replace_once(
    page,
    'import { DEFAULT_SEED_FRAMES, createDesktopSeed, createMobileSeed, localizedSeedFrame } from "@/lib/editor-seed";\n',
    'import { DEFAULT_SEED_FRAMES, createDesktopSeed, createMobileSeed, localizedSeedFrame } from "@/lib/editor-seed";\nimport { groupFrameIdMap, groupsForFrame, resolveLayersFrame } from "@/lib/layer-selection";\nimport { collectMeasurementItems, measuredWidthsChanged } from "@/lib/measurement";\n',
    'layer measurement imports',
)
# Add visibleWorldRect to current canvas viewport import.
old_view_import = 'import { centerFrameViewAtZoom, clientToWorld, fitCanvasView, focusFrameView as focusCanvasFrameView, panViewFromOrigin, pinchViewFromOrigin, wheelPanView, zoomViewAt } from "@/lib/canvas-viewport";'
new_view_import = 'import { centerFrameViewAtZoom, clientToWorld, fitCanvasView, focusFrameView as focusCanvasFrameView, panViewFromOrigin, pinchViewFromOrigin, visibleWorldRect, wheelPanView, zoomViewAt } from "@/lib/canvas-viewport";'
page = replace_once(page, old_view_import, new_view_import, 'canvas viewport import')
old_measure = '''  const allItems = useMemo(() => {\n    const map = new Map<string, Item>();\n    for (const g of groups) for (const it of g.items) map.set(it.id, it);\n    if (drag) map.set(drag.item.id, drag.item);\n    return [...map.values()];\n  }, [groups, drag]);\n'''
new_measure = '''  const allItems = useMemo(\n    () => collectMeasurementItems(groups, drag?.item ?? null),\n    [groups, drag],\n  );\n'''
page = replace_once(page, old_measure, new_measure, 'measurement item collection')
old_changed = '''    const keys = Object.keys(next);\n    const changed =\n      keys.length !== Object.keys(widthsRef.current).length ||\n      keys.some((k) => widthsRef.current[k] !== next[k]);\n    if (changed) setWidths(next);'''
page = replace_once(page, old_changed, '    if (measuredWidthsChanged(widthsRef.current, next)) setWidths(next);', 'measurement change detection')
old_frame_map = '''  /** which frame each run sits on (phone mode only) */\n  const frameOf = useMemo(() => {\n    const m = new Map<string, string>();\n    if (frame !== "phone") return m;\n    for (const g of groups) {\n      const f = frameOfGroup(g, frames, widths);\n      if (f) m.set(g.id, f.id);\n    }\n    return m;\n  }, [groups, frames, frame, widths]);\n\n  /** the screen whose layers the panel lists: the selection's, else the chosen one */\n  const layersFrame = useMemo(() => {\n    if (frame !== "phone") return null;\n    if (primaryId) {\n      const g = groups.find((x) => x.items.some((it) => it.id === primaryId));\n      const fid = g ? frameOf.get(g.id) : undefined;\n      if (fid) return frames.find((f) => f.id === fid) ?? null;\n    }\n    if (selectedFrameId) return frames.find((f) => f.id === selectedFrameId) ?? null;\n    return frames.find((f) => f.id === layersFrameId) ?? frames[0] ?? null;\n  }, [frame, primaryId, groups, frameOf, frames, selectedFrameId, layersFrameId]);\n  const layerGroups = useMemo(\n    () => (layersFrame ? groups.filter((g) => frameOf.get(g.id) === layersFrame.id) : []),\n    [groups, frameOf, layersFrame],\n  );\n'''
new_frame_map = '''  /** which frame each run sits on (phone mode only) */\n  const frameOf = useMemo(\n    () => groupFrameIdMap(groups, frames, widths, frame),\n    [groups, frames, frame, widths],\n  );\n\n  /** the screen whose layers the panel lists: the selection's, else the chosen one */\n  const layersFrame = useMemo(\n    () =>\n      resolveLayersFrame({\n        frameMode: frame,\n        frames,\n        groups,\n        groupFrames: frameOf,\n        primaryItemId: primaryId,\n        selectedFrameId,\n        rememberedFrameId: layersFrameId,\n      }),\n    [frame, primaryId, groups, frameOf, frames, selectedFrameId, layersFrameId],\n  );\n  const layerGroups = useMemo(\n    () => groupsForFrame(groups, frameOf, layersFrame?.id ?? null),\n    [groups, frameOf, layersFrame],\n  );\n'''
page = replace_once(page, old_frame_map, new_frame_map, 'layer frame selection block')
old_visible = '''  const visibleWorld = (() => {\n    const r = canvasRef.current?.getBoundingClientRect();\n    return {\n      l: -view.x / view.z,\n      t: -view.y / view.z,\n      w: (r?.width ?? 0) / view.z,\n      h: (r?.height ?? 0) / view.z,\n    };\n  })();'''
new_visible = '''  const visibleRect = canvasRef.current?.getBoundingClientRect();\n  const visibleWorld = visibleWorldRect(\n    view,\n    visibleRect?.width ?? 0,\n    visibleRect?.height ?? 0,\n  );'''
page = replace_once(page, old_visible, new_visible, 'visible world block')
page_path.write_text(page, encoding='utf-8')

print('layer, measurement, and visible viewport logic refactored')
