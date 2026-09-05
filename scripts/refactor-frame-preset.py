from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# --- lib/frame-commands.ts -------------------------------------------------
replace_once(
    "lib/frame-commands.ts",
    '  Frame,\n  FRAME_GAP,\n  Group,\n',
    '  Frame,\n  FramePreset,\n  FRAME_GAP,\n  Group,\n',
)
replace_once(
    "lib/frame-commands.ts",
    '  frameOfGroup,\n  frameRect,\n  groupBounds,\n} from "./tokens";\n',
    '  frameOfGroup,\n  framePresetPatch,\n  frameRect,\n  frameSizeOf,\n  groupBounds,\n} from "./tokens";\nimport { carryFrame } from "./tidy";\n',
)
insert = '''export type ResizeFramePresetResult = {\n  frames: Frame[];\n  groups: Group[];\n};\n\n/**\n * Applies a phone/desktop preset as one document mutation. The layout rules in\n * carryFrame keep following screens separated, adapt owned parts, and re-tidy\n * the resized screen. UI history/animation/platform state stays in the caller.\n */\nexport function resizeFrameToPreset(\n  frames: Frame[],\n  groups: Group[],\n  widths: Record<string, number>,\n  frameId: string,\n  preset: FramePreset,\n): ResizeFramePresetResult | null {\n  const current = frames.find((frame) => frame.id === frameId);\n  if (!current) return null;\n\n  const next: Frame = { ...current, ...framePresetPatch(preset) };\n  const before = frameSizeOf(current);\n  const after = frameSizeOf(next);\n  if (before.w === after.w && before.h === after.h) return null;\n\n  return carryFrame(groups, current, next, frames, widths);\n}\n\n'''
replace_once(
    "lib/frame-commands.ts",
    '/**\n * Pure document operation for deleting one screen.\n',
    insert + '/**\n * Pure document operation for deleting one screen.\n',
)

# --- lib/frame-commands.test.ts --------------------------------------------
replace_once(
    "lib/frame-commands.test.ts",
    '  duplicateFrameInDocument,\n  nextFrameX,\n',
    '  duplicateFrameInDocument,\n  nextFrameX,\n  resizeFrameToPreset,\n',
)
resize_tests = '''\ndescribe("resizeFrameToPreset", () => {\n  it("expands a screen and shifts later screens with their owned groups", () => {\n    const a = frame("a", 0);\n    const b = frame("b", 600);\n    const onB = group("on-b", 616);\n\n    const result = resizeFrameToPreset([a, b], [onB], {}, "a", "desktop");\n\n    expect(result).not.toBeNull();\n    const resized = result!.frames.find((item) => item.id === "a")!;\n    const movedB = result!.frames.find((item) => item.id === "b")!;\n    const shift = (resized.w ?? 0) - 412;\n    expect(resized.w).toBeGreaterThan(412);\n    expect(movedB.x).toBe(b.x + shift);\n    expect(result!.groups.find((item) => item.id === "on-b")?.x).toBe(\n      onB.x + shift,\n    );\n  });\n\n  it("returns null when the requested preset already matches", () => {\n    expect(resizeFrameToPreset([frame("a", 0)], [], {}, "a", "phone")).toBeNull();\n  });\n\n  it("returns null for an unknown screen", () => {\n    expect(resizeFrameToPreset([], [], {}, "missing", "desktop")).toBeNull();\n  });\n});\n'''
replace_once(
    "lib/frame-commands.test.ts",
    '\ndescribe("nextFrameX", () => {\n',
    resize_tests + '\ndescribe("nextFrameX", () => {\n',
)

# --- app/page.tsx -----------------------------------------------------------
replace_once(
    "app/page.tsx",
    '  framePresetPatch,\n',
    '',
)
replace_once(
    "app/page.tsx",
    'import { carryFrame, tidyFrame } from "@/lib/tidy";\n',
    'import { tidyFrame } from "@/lib/tidy";\n',
)
replace_once(
    "app/page.tsx",
    'import { createInitialPhoneFrame, createNextFrame, deleteFrameFromDocument, duplicateFrameInDocument } from "@/lib/frame-commands";\n',
    'import { createInitialPhoneFrame, createNextFrame, deleteFrameFromDocument, duplicateFrameInDocument, resizeFrameToPreset } from "@/lib/frame-commands";\n',
)
old_fn = '''  const setFramePreset = (id: string, preset: FramePreset) => {\n    const current = framesRef.current.find((f) => f.id === id);\n    if (!current) return;\n    const next = { ...current, ...framePresetPatch(preset) };\n    const before = frameSizeOf(current);\n    const after = frameSizeOf(next);\n    if (before.w === after.w && before.h === after.h) return;\n    const frames = framesRef.current;\n    /* the screens to the right move over, parts take the sizes the new screen calls for,\n     * and the screen is laid out again by the tidy rules */\n    const laid = carryFrame(groupsRef.current, current, next, frames, widthsRef.current);\n    /* a target the author never picked follows the screens */\n    if (platform === defaultPlatformOf(frames, frameRef.current)) setPlatform(null);\n    snapshot();\n    tidyRef.current = null;\n    setEasing(true);\n    window.setTimeout(() => setEasing(false), SETTLE_MS + 40);\n    setFrames(laid.frames);\n    setGroups(laid.groups);\n  };\n'''
new_fn = '''  const setFramePreset = (id: string, preset: FramePreset) => {\n    const frames = framesRef.current;\n    const laid = resizeFrameToPreset(\n      frames,\n      groupsRef.current,\n      widthsRef.current,\n      id,\n      preset,\n    );\n    if (!laid) return;\n    /* a target the author never picked follows the screens */\n    if (platform === defaultPlatformOf(frames, frameRef.current)) setPlatform(null);\n    snapshot();\n    tidyRef.current = null;\n    setEasing(true);\n    window.setTimeout(() => setEasing(false), SETTLE_MS + 40);\n    setFrames(laid.frames);\n    setGroups(laid.groups);\n  };\n'''
replace_once("app/page.tsx", old_fn, new_fn)

# --- docs ------------------------------------------------------------------
replace_once(
    "docs/TODO.md",
    '- [x] Extract frame/screen document commands into testable helpers.\n',
    '- [x] Extract frame/screen document commands into testable helpers.\n- [x] Extract frame preset resizing, dependent screen shifts and part re-layout into the shared frame command boundary.\n',
)
replace_once(
    "docs/TODO.md",
    '- [x] Add focused tests for extracted frame/screen and layer operations.\n',
    '- [x] Add focused tests for extracted frame/screen and layer operations.\n- [x] Add focused tests for frame preset resize no-op and dependent screen/group shifting.\n',
)
replace_once(
    "docs/ARCHITECTURE.md",
    '- `lib/frame-commands.ts` — screen/frame document mutations\n',
    '- `lib/frame-commands.ts` — screen/frame creation, preset resizing and document mutations\n',
)
