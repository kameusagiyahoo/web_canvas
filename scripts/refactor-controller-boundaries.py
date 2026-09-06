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


write('lib/tidy-session.ts', '''import type { Frame, Group } from "./tokens";
import { tidyFrame } from "./tidy";

export type TidySession = {
  frameId: string;
  before: Group[];
  after: Group[];
};

export type TidyStatus = "undo" | "tidy" | "done";

/** The editor label for one frame without coupling the layout rules to React. */
export function tidyStateForFrame(
  session: TidySession | null,
  groups: Group[],
  frame: Frame,
  frames: Frame[],
  widths: Record<string, number>,
): TidyStatus {
  if (session?.frameId === frame.id && session.after === groups) return "undo";
  return tidyFrame(groups, frame, frames, widths) ? "tidy" : "done";
}

export type ToggleFrameTidyResult = {
  groups: Group[];
  session: TidySession | null;
};

/**
 * Applies the frame tidy pass, or restores the immediately preceding tidy when
 * its after-state is still current. History and animation stay in the caller.
 */
export function toggleFrameTidy(
  session: TidySession | null,
  groups: Group[],
  frame: Frame,
  frames: Frame[],
  widths: Record<string, number>,
): ToggleFrameTidyResult | null {
  if (session?.frameId === frame.id && session.after === groups) {
    return { groups: session.before, session: null };
  }
  const after = tidyFrame(groups, frame, frames, widths);
  if (!after) return null;
  return {
    groups: after,
    session: { frameId: frame.id, before: groups, after },
  };
}
''')

write('lib/tidy-session.test.ts', '''import { describe, expect, it } from "vitest";
import { makeItem, type Frame, type Group } from "./tokens";
import { tidyStateForFrame, toggleFrameTidy, type TidySession } from "./tidy-session";

const frame: Frame = { id: "f", name: "Home", x: 0, y: 0 };

const group = (x = 180, y = 420): Group => ({
  id: "g",
  x,
  y,
  axis: "x",
  items: [{ ...makeItem("button"), id: "i" }],
});

describe("tidy session", () => {
  it("reports done when a frame has no groups to change", () => {
    expect(tidyStateForFrame(null, [], frame, [frame], {})).toBe("done");
  });

  it("records before/after state for a tidy pass", () => {
    const groups = [group()];
    const result = toggleFrameTidy(null, groups, frame, [frame], {});
    expect(result).not.toBeNull();
    expect(result!.session?.before).toBe(groups);
    expect(result!.session?.after).toBe(result!.groups);
    expect(result!.session?.frameId).toBe("f");
  });

  it("offers and performs the one-step tidy undo while after-state is current", () => {
    const before = [group(16, 120)];
    const after = [group(16, 160)];
    const session: TidySession = { frameId: "f", before, after };
    expect(tidyStateForFrame(session, after, frame, [frame], {})).toBe("undo");
    expect(toggleFrameTidy(session, after, frame, [frame], {})).toEqual({
      groups: before,
      session: null,
    });
  });
});
''')

write('lib/ai-commands.ts', '''import type { Frame, Group } from "./tokens";
import { pushHistory } from "./ai";

export type FrameDescriptionResult = { name?: string; note: string };

/** Applies a model-written screen description while retaining the previous text. */
export function applyAiFrameDescription(
  frames: Frame[],
  frameId: string,
  result: FrameDescriptionResult,
): Frame[] {
  return frames.map((frame) =>
    frame.id === frameId
      ? {
          ...frame,
          note: result.note,
          noteHistory: pushHistory(frame.noteHistory, frame.note),
          name: result.name ?? frame.name,
        }
      : frame,
  );
}

/** Applies a model-written part behavior note while retaining the previous text. */
export function applyAiItemBehavior(
  groups: Group[],
  itemId: string,
  note: string,
): Group[] {
  return groups.map((group) =>
    group.items.some((item) => item.id === itemId)
      ? {
          ...group,
          items: group.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  note,
                  noteHistory: pushHistory(item.noteHistory, item.note),
                }
              : item,
          ),
        }
      : group,
  );
}
''')

write('lib/ai-commands.test.ts', '''import { describe, expect, it } from "vitest";
import { makeItem, type Frame, type Group } from "./tokens";
import { applyAiFrameDescription, applyAiItemBehavior } from "./ai-commands";

const frame: Frame = { id: "f", name: "Home", x: 0, y: 0, note: "Old purpose" };
const item = { ...makeItem("button"), id: "i", note: "Old behavior" };
const group: Group = { id: "g", x: 0, y: 0, axis: "x", items: [item] };

describe("AI document commands", () => {
  it("applies a screen description and keeps the previous note for undo", () => {
    const next = applyAiFrameDescription([frame], "f", {
      name: "Dashboard",
      note: "Shows the account overview.",
    });
    expect(next[0].name).toBe("Dashboard");
    expect(next[0].note).toBe("Shows the account overview.");
    expect(next[0].noteHistory).toEqual(["Old purpose"]);
  });

  it("keeps the existing screen name when the model returns no name", () => {
    expect(
      applyAiFrameDescription([frame], "f", { note: "Updated" })[0].name,
    ).toBe("Home");
  });

  it("applies a part behavior note and keeps the previous note for undo", () => {
    const next = applyAiItemBehavior([group], "i", "Opens the details screen.");
    expect(next[0].items[0].note).toBe("Opens the details screen.");
    expect(next[0].items[0].noteHistory).toEqual(["Old behavior"]);
  });

  it("leaves unrelated groups untouched", () => {
    const next = applyAiItemBehavior([group], "missing", "Ignored");
    expect(next[0]).toBe(group);
  });
});
''')

write('lib/frame-export.ts', '''import { toPng } from "html-to-image";
import { frameSizeOf, type Frame } from "./tokens";

export type FramePngEncoder = (
  element: HTMLElement,
  options: { pixelRatio: number; cacheBust: boolean; width: number; height: number },
) => Promise<string>;

export function frameExportFileName(frame: Frame): string {
  return `${frame.name.trim() || "screen"}.png`;
}

export function framePngOptions(frame: Frame) {
  const { w, h } = frameSizeOf(frame);
  return { pixelRatio: 2, cacheBust: true, width: w, height: h } as const;
}

/** Waits until the offscreen export layer has committed and web fonts have settled. */
export async function waitForFrameExportLayer(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await document.fonts?.ready;
}

export async function encodeFrameElementPng(
  element: HTMLElement,
  frame: Frame,
  encoder: FramePngEncoder = toPng,
): Promise<string> {
  return encoder(element, framePngOptions(frame));
}

/** Encodes the already-rendered export layer and starts the browser download. */
export async function downloadFrameElementPng(
  element: HTMLElement,
  frame: Frame,
): Promise<void> {
  const url = await encodeFrameElementPng(element, frame);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = frameExportFileName(frame);
  anchor.click();
}
''')

write('lib/frame-export.test.ts', '''import { describe, expect, it, vi } from "vitest";
import type { Frame } from "./tokens";
import { encodeFrameElementPng, frameExportFileName, framePngOptions } from "./frame-export";

const frame: Frame = { id: "f", name: "Home", x: 0, y: 0 };

describe("frame export", () => {
  it("uses a stable fallback file name", () => {
    expect(frameExportFileName(frame)).toBe("Home.png");
    expect(frameExportFileName({ ...frame, name: "   " })).toBe("screen.png");
  });

  it("exports at 2x using the frame dimensions", () => {
    expect(framePngOptions(frame)).toEqual({
      pixelRatio: 2,
      cacheBust: true,
      width: 412,
      height: 915,
    });
  });

  it("passes frame dimensions to an injected encoder", async () => {
    const encoder = vi.fn(async () => "data:image/png;base64,test");
    const element = {} as HTMLElement;
    await expect(encodeFrameElementPng(element, frame, encoder)).resolves.toBe(
      "data:image/png;base64,test",
    );
    expect(encoder).toHaveBeenCalledWith(element, framePngOptions(frame));
  });
});
''')

write('lib/document-migrations.ts', '''import {
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
''')

write('lib/document-migrations.test.ts', '''import { describe, expect, it } from "vitest";
import { KIND_SPEC, NAV_BAR_H, frameRect, makeItem, type Frame, type Group } from "./tokens";
import { migrateLegacyGroups } from "./document-migrations";

const frame: Frame = { id: "f", name: "Home", x: 0, y: 0 };

describe("legacy document migrations", () => {
  it("moves an old navigation bar to the current bottom inset", () => {
    const oldHeight = KIND_SPEC.bottomNav.h - NAV_BAR_H;
    const group: Group = {
      id: "g",
      x: 0,
      y: frameRect(frame).b - oldHeight,
      axis: "x",
      items: [{ ...makeItem("bottomNav"), id: "nav" }],
    };
    const [migrated] = migrateLegacyGroups([group], [frame]);
    expect(migrated.y).toBe(frameRect(frame).b - KIND_SPEC.bottomNav.h);
  });

  it("leaves unrelated groups by reference", () => {
    const group: Group = {
      id: "g",
      x: 16,
      y: 120,
      axis: "x",
      items: [{ ...makeItem("button"), id: "button" }],
    };
    expect(migrateLegacyGroups([group], [frame])[0]).toBe(group);
  });
});
''')

# Storage centralization for AI settings.
storage_path = ROOT / 'lib/storage.ts'
storage = storage_path.read_text(encoding='utf-8')
storage = replace_once(
    storage,
    '  editorLock: "m3e:doc:editor",\n  ui: "m3e:ui",',
    '  editorLock: "m3e:doc:editor",\n  ui: "m3e:ui",\n  aiSettings: "m3e:ai",',
    'storage ai key',
)
storage_path.write_text(storage, encoding='utf-8')

ai_path = ROOT / 'lib/ai.ts'
ai = ai_path.read_text(encoding='utf-8')
ai = replace_once(
    ai,
    'import { Lang } from "./i18n";\n',
    'import { Lang } from "./i18n";\nimport { STORAGE_KEYS, getBrowserStorage, readStoredJson, writeStoredJson, type StorageLike, type StorageWriteResult } from "./storage";\n',
    'ai storage import',
)
old_ai_storage = '''const STORE_KEY = "m3e:ai";\n\nexport function loadAiSettings(): AiSettings {\n  const s = { ...DEFAULT_AI };\n  try {\n    const raw = localStorage.getItem(STORE_KEY);\n    if (raw) {\n      const v = JSON.parse(raw) as Partial<AiSettings>;\n      if (PROVIDERS.some((p) => p.key === v.provider)) s.provider = v.provider as Provider;\n      if (typeof v.baseUrl === "string") s.baseUrl = v.baseUrl;\n      if (typeof v.model === "string") s.model = v.model;\n      if (typeof v.key === "string") s.key = v.key;\n    }\n  } catch {}\n  return s;\n}\n\n/** Settings live in this browser only, like the document itself. */\nexport function saveAiSettings(s: AiSettings) {\n  try {\n    localStorage.setItem(STORE_KEY, JSON.stringify(s));\n  } catch {}\n}\n'''
new_ai_storage = '''export function loadAiSettings(\n  storage: StorageLike | null = getBrowserStorage(),\n): AiSettings {\n  const settings = { ...DEFAULT_AI };\n  const value = readStoredJson(storage, STORAGE_KEYS.aiSettings);\n  if (!value || typeof value !== "object" || Array.isArray(value)) return settings;\n  const stored = value as Partial<AiSettings>;\n  if (PROVIDERS.some((provider) => provider.key === stored.provider))\n    settings.provider = stored.provider as Provider;\n  if (typeof stored.baseUrl === "string") settings.baseUrl = stored.baseUrl;\n  if (typeof stored.model === "string") settings.model = stored.model;\n  if (typeof stored.key === "string") settings.key = stored.key;\n  return settings;\n}\n\n/** Settings live in this browser only, like the document itself. */\nexport function saveAiSettings(\n  settings: AiSettings,\n  storage: StorageLike | null = getBrowserStorage(),\n): StorageWriteResult {\n  return writeStoredJson(storage, STORAGE_KEYS.aiSettings, settings);\n}\n'''
ai = replace_once(ai, old_ai_storage, new_ai_storage, 'ai settings storage block')
ai_path.write_text(ai, encoding='utf-8')

write('lib/ai-settings.test.ts', '''import { describe, expect, it } from "vitest";
import { DEFAULT_AI, loadAiSettings, saveAiSettings } from "./ai";
import type { StorageLike } from "./storage";

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

describe("AI settings storage", () => {
  it("round-trips settings through the shared storage boundary", () => {
    const storage = memoryStorage();
    const settings = {
      ...DEFAULT_AI,
      model: "local-test-model",
      key: "secret",
    };
    expect(saveAiSettings(settings, storage)).toEqual({ ok: true });
    expect(loadAiSettings(storage)).toEqual(settings);
  });

  it("falls back to defaults for malformed stored data", () => {
    const storage: StorageLike = {
      getItem: () => "not json",
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadAiSettings(storage)).toEqual(DEFAULT_AI);
  });
});
''')

# Wire app/page.tsx to the new boundaries.
page_path = ROOT / 'app/page.tsx'
page = page_path.read_text(encoding='utf-8')
page = replace_once(page, 'import { toPng } from "html-to-image";\n', '', 'remove html-to-image import')
page = replace_once(page, 'import { TidyState } from "@/components/ui";\n', '', 'remove TidyState import')
page = replace_once(
    page,
    'import { AiSettings, DEFAULT_AI, hasKey, isSecureUrl, loadAiSettings, proposeBehavior, proposeDescription, pushHistory, saveAiSettings } from "@/lib/ai";\nimport { tidyFrame } from "@/lib/tidy";\n',
    'import { AiSettings, DEFAULT_AI, hasKey, isSecureUrl, loadAiSettings, proposeBehavior, proposeDescription, saveAiSettings } from "@/lib/ai";\nimport { applyAiFrameDescription, applyAiItemBehavior } from "@/lib/ai-commands";\nimport { downloadFrameElementPng, waitForFrameExportLayer } from "@/lib/frame-export";\nimport { migrateLegacyGroups } from "@/lib/document-migrations";\nimport { tidyStateForFrame, toggleFrameTidy, type TidySession } from "@/lib/tidy-session";\n',
    'domain imports',
)
old_migrate = '''/** Documents saved before the bars grew their system insets have the navigation\n *  bar flush with the old 80dp bottom; keep it on the bottom edge. */\nfunction migrateGroups(groups: Group[], frames: Frame[]): Group[] {\n  const oldNavH = KIND_SPEC.bottomNav.h - NAV_BAR_H;\n  return groups.map((g) => {\n    if (g.items.length !== 1 || g.items[0].kind !== "bottomNav") return g;\n    const f = frames.find((fr) => {\n      const r = frameRect(fr);\n      return g.x >= r.l - 1 && g.x <= r.r && g.y === r.b - oldNavH;\n    });\n    return f ? { ...g, y: frameRect(f).b - KIND_SPEC.bottomNav.h } : g;\n  });\n}\n\n'''
page = replace_once(page, old_migrate, '', 'remove legacy migration')
page = replace_once(
    page,
    '  const tidyRef = useRef<{ frameId: string; before: Group[]; after: Group[] } | null>(null);',
    '  const tidyRef = useRef<TidySession | null>(null);',
    'tidy ref type',
)
page = replace_once(page, 'setGroups(migrateGroups(doc.groups, frames));', 'setGroups(migrateLegacyGroups(doc.groups, frames));', 'apply doc migration')
old_tidy = '''  /** the tidy button's state for the screen in play; the layout pass runs only when the document changes */\n  const tidyState = useMemo((): TidyState | null => {\n    if (!tidyTarget) return null;\n    const last = tidyRef.current;\n    if (last && last.frameId === tidyTarget.id && last.after === groups) return "undo";\n    return tidyFrame(groups, tidyTarget, frames, widths) ? "tidy" : "done";\n  }, [tidyTarget, groups, frames, widths]);\n\n  const tidy = (f: Frame) => {\n    const last = tidyRef.current;\n    if (last && last.frameId === f.id && last.after === groupsRef.current) {\n      snapshot();\n      setGroups(last.before);\n      tidyRef.current = null;\n      return;\n    }\n    const after = tidyFrame(groupsRef.current, f, framesRef.current, widthsRef.current);\n    if (!after) return;\n    snapshot();\n    tidyRef.current = { frameId: f.id, before: groupsRef.current, after };\n    setGroups(after);\n  };\n'''
new_tidy = '''  /** the tidy button's state for the screen in play; the layout pass runs only when the document changes */\n  const tidyState = useMemo(() => {\n    if (!tidyTarget) return null;\n    return tidyStateForFrame(tidyRef.current, groups, tidyTarget, frames, widths);\n  }, [tidyTarget, groups, frames, widths]);\n\n  const tidy = (f: Frame) => {\n    const result = toggleFrameTidy(\n      tidyRef.current,\n      groupsRef.current,\n      f,\n      framesRef.current,\n      widthsRef.current,\n    );\n    if (!result) return;\n    snapshot();\n    tidyRef.current = result.session;\n    setGroups(result.groups);\n  };\n'''
page = replace_once(page, old_tidy, new_tidy, 'tidy state and toggle')
old_frame_apply = 'setFrames((fs) => fs.map((x) => (x.id === f.id ? { ...x, note: r.note, noteHistory: pushHistory(x.noteHistory, x.note), name: r.name ?? x.name } : x)));'
page = replace_once(page, old_frame_apply, 'setFrames((fs) => applyAiFrameDescription(fs, f.id, r));', 'AI frame apply')
old_item_apply = 'setGroups((gs) => gs.map((g) => (g.items.some((it) => it.id === itemId) ? { ...g, items: g.items.map((it) => (it.id === itemId ? { ...it, note, noteHistory: pushHistory(it.noteHistory, it.note) } : it)) } : g)));'
page = replace_once(page, old_item_apply, 'setGroups((gs) => applyAiItemBehavior(gs, itemId, note));', 'AI item apply')
old_export = '''  /** The screen is re-rendered offscreen at 1:1 with static parts, so the\n   *  canvas zoom, selection outlines and in-flight animations never leak into the PNG. */\n  const saveFrameImage = async (f: Frame) => {\n    setExportFrame(f);\n    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));\n    try {\n      await document.fonts?.ready;\n      const el = document.querySelector<HTMLElement>(`[data-export="${f.id}"]`);\n      if (!el) return;\n      const { w, h } = frameSizeOf(f);\n      const url = await toPng(el, { pixelRatio: 2, cacheBust: true, width: w, height: h });\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = `${f.name || "screen"}.png`;\n      a.click();\n    } finally {\n      setExportFrame(null);\n    }\n  };\n'''
new_export = '''  /** The screen is re-rendered offscreen at 1:1 with static parts, so the\n   *  canvas zoom, selection outlines and in-flight animations never leak into the PNG. */\n  const saveFrameImage = async (f: Frame) => {\n    setExportFrame(f);\n    try {\n      await waitForFrameExportLayer();\n      const el = document.querySelector<HTMLElement>(`[data-export="${f.id}"]`);\n      if (!el) return;\n      await downloadFrameElementPng(el, f);\n    } finally {\n      setExportFrame(null);\n    }\n  };\n'''
page = replace_once(page, old_export, new_export, 'frame image export')
page_path.write_text(page, encoding='utf-8')

print('controller boundaries refactored')
