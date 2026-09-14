from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:120]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"expected one match in {path}, found {text.count(old)}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "lib/tokens.ts",
    '''/** where the generated prompt asks for the app to be built */
export type Platform = "android" | "web";
export const DEFAULT_PLATFORM: Platform = "android";
export const isPlatform = (v: unknown): v is Platform => v === "android" || v === "web";
/** The target the prompt assumes when the author has not picked one: the web as
 *  soon as a desktop screen exists, Android otherwise. */
export const defaultPlatformOf = (frames: Frame[], mode: FrameMode): Platform => (mode === "phone" && frames.some((f) => !isPhoneFrame(f)) ? "web" : DEFAULT_PLATFORM);''',
    '''/** where the generated implementation prompt asks for the app to be built */
export type Platform = "neutral" | "android" | "ios" | "web" | "pyside";
export const DEFAULT_PLATFORM: Platform = "neutral";
export const isPlatform = (v: unknown): v is Platform =>
  v === "neutral" || v === "android" || v === "ios" || v === "web" || v === "pyside";
/** A design does not imply an implementation stack. New/unset projects remain
 *  platform-neutral until the author explicitly chooses a target. The parameters
 *  stay for API compatibility with callers that already derive this alongside frames. */
export const defaultPlatformOf = (_frames: Frame[], _mode: FrameMode): Platform => DEFAULT_PLATFORM;''',
)

replace_once(
    "lib/prompt.ts",
    'import { KIND_TEXT, Lang, SWIPE_TEXT, TRANSITION_TEXT, getLang } from "./i18n";\n',
    'import { KIND_TEXT, Lang, SWIPE_TEXT, TRANSITION_TEXT, getLang } from "./i18n";\nimport { adaptPromptForPlatform, basePromptPlatform } from "./platform-prompt";\n',
)
replace_once(
    "lib/prompt.ts",
    '  const platform: Platform = doc.platform ?? defaultPlatformOf(doc.frames, doc.frame);\n',
    '  const platform: Platform = doc.platform ?? defaultPlatformOf(doc.frames, doc.frame);\n  const promptPlatform = basePromptPlatform(platform);\n',
)
replace_once(
    "lib/prompt.ts",
    '(platform === "web" && STYLE_NOTES_WEB[lang][k]) || STYLE_NOTES[lang][k]',
    '(promptPlatform === "web" && STYLE_NOTES_WEB[lang][k]) || STYLE_NOTES[lang][k]',
)
replace_once(
    "lib/prompt.ts",
    '  lines.push(ph.target(viewport, platform, th.dark, th.bothModes));\n  lines.push(ph.platform(platform));',
    '  lines.push(ph.target(viewport, promptPlatform, th.dark, th.bothModes));\n  lines.push(ph.platform(promptPlatform));',
)
replace_once(
    "lib/prompt.ts",
    '  if (doc.dynamicColor) lines.push(ph.dynamic(platform));',
    '  if (doc.dynamicColor) lines.push(ph.dynamic(promptPlatform));',
)
replace_once(
    "lib/prompt.ts",
    '  for (const s of GENERAL[lang]) lines.push(`- ${typeof s === "function" ? s(platform) : s}`);\n  return lines.join("\\n");',
    '  for (const s of GENERAL[lang]) lines.push(`- ${typeof s === "function" ? s(promptPlatform) : s}`);\n  return adaptPromptForPlatform(lines.join("\\n"), platform, lang);',
)

replace_once(
    "app/page.tsx",
    '/** the author\'s explicit target; null follows the screens (web once a desktop screen exists) */',
    '/** the author\'s explicit implementation target; null resolves to platform-neutral */',
)
replace_once(
    "app/page.tsx",
    '    /* a target the author never picked follows the screens */\n    if (platform === defaultPlatformOf(frames, frameRef.current)) setPlatform(null);',
    '    /* keep an implicit neutral target implicit when screen geometry changes */\n    if (platform === defaultPlatformOf(frames, frameRef.current)) setPlatform(null);',
)

print("prompt target patch applied")
