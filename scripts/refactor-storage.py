from pathlib import Path
import re

page = Path("app/page.tsx")
text = page.read_text()

anchor = 'import { previewCameraForFrame, resolvePreviewStartId } from "@/lib/preview-session";\n'
addition = 'import { STORAGE_KEYS, clearStoredDraft, getBrowserStorage, readStoredDocument, readStoredDraft, readStoredUi, saveStoredDocument, saveStoredDraft, saveStoredUi } from "@/lib/storage";\n'
if addition not in text:
    if anchor not in text:
        raise SystemExit("storage import anchor not found")
    text = text.replace(anchor, anchor + addition, 1)

old_keys = '''const HISTORY_MAX = 100;
const DOC_KEY = "m3e:doc";
/** the design a draft or a link replaced, until the author keeps or undoes it */
const BEFORE_KEY = "m3e:doc:before";
const DOC_LOCK = "m3e:doc:editor";
const UI_KEY = "m3e:ui";
'''
if old_keys not in text:
    raise SystemExit("storage key block not found")
text = text.replace(old_keys, 'const HISTORY_MAX = 100;\n', 1)
text = text.replace('.request(DOC_LOCK, { ifAvailable: true }, async (lock) => {', '.request(STORAGE_KEYS.editorLock, { ifAvailable: true }, async (lock) => {', 1)

load_pattern = re.compile(r'''  useEffect\(\(\) => \{\n    // React's development double-run would otherwise read back its own first save\n    if \(loadedRef\.current\) return;\n.*?    loadedRef\.current = true;\n  \}, \[\]\);''', re.S)
load_replacement = '''  useEffect(() => {
    // React's development double-run would otherwise read back its own first save
    if (loadedRef.current) return;
    const storage = getBrowserStorage();
    const storedDoc = readStoredDocument(storage);
    if (storedDoc) {
      hadDocRef.current = true;
      applyDoc(storedDoc, false);
      // frame mode is decided by the device (media-query effect), not restored
    }
    const before = readStoredDraft(storage, !!storedDoc);
    if (before) setDraftBefore(before);

    let initialLang: Lang = "ja";
    const ui = readStoredUi(storage);
    if (ui) {
      if (ui.view) setView(ui.view);
      if (ui.leftOpen !== undefined) setLeftOpen(ui.leftOpen);
      if (ui.rightOpen !== undefined) setRightOpen(ui.rightOpen);
      if (ui.leftW !== undefined) setLeftW(Math.max(RAIL_W + 244, ui.leftW));
      if (ui.rightW !== undefined) setRightW(ui.rightW);
      if (ui.favorites) setFavorites(ui.favorites);
      if (ui.mode) setMode(ui.mode);
      if (ui.lang) {
        initialLang = ui.lang;
        setLang(ui.lang);
      }
    } else {
      const nl = (navigator.language ?? "").toLowerCase();
      initialLang = nl.startsWith("zh") ? "zh" : nl.startsWith("ko") ? "ko" : nl.startsWith("ja") ? "ja" : "en";
      setLang(initialLang);
      queueMicrotask(() => fitRef.current());
    }
    setGlobalLang(initialLang);
    initialLangRef.current = initialLang;
    if (!storedDoc) {
      setGroups(seed(initialLang));
      setFrames([{ ...SEED_FRAMES[0], name: t("home", initialLang) }]);
    }
    setAiSettings(loadAiSettings());
    loadedRef.current = true;
  }, []);'''
text, count = load_pattern.subn(load_replacement, text, count=1)
if count != 1:
    raise SystemExit(f"storage load replacements: {count}")

save_doc_pattern = re.compile(r'''  useEffect\(\(\) => \{\n    if \(!loadedRef\.current \|\| editAccess !== "editable"\) return;\n    try \{\n      localStorage\.setItem\(\n        DOC_KEY,\n        JSON\.stringify\(\{ groups, frames, paletteKey, frame, title, brief, promptEdit, platform: platform \?\? undefined, customPalette: customPalette \?\? undefined, dynamicColor, theme \}\),\n      \);\n    \} catch \{\}\n  \}, \[editAccess, groups, frames, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme\]\);''')
save_doc_replacement = '''  useEffect(() => {
    if (!loadedRef.current || editAccess !== "editable") return;
    saveStoredDocument(getBrowserStorage(), {
      groups,
      frames,
      paletteKey,
      frame,
      title,
      brief,
      promptEdit,
      platform: platform ?? undefined,
      customPalette: customPalette ?? undefined,
      dynamicColor,
      theme,
    });
  }, [editAccess, groups, frames, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme]);'''
text, count = save_doc_pattern.subn(save_doc_replacement, text, count=1)
if count != 1:
    raise SystemExit(f"document save replacements: {count}")

save_ui_pattern = re.compile(r'''  useEffect\(\(\) => \{\n    if \(!loadedRef\.current\) return;\n    try \{\n      localStorage\.setItem\(\n        UI_KEY,\n        JSON\.stringify\(\{\n          view,\n          leftOpen,\n          rightOpen,\n          leftW,\n          rightW,\n          favorites,\n          mode,\n          lang,\n        \}\),\n      \);\n    \} catch \{\}\n  \}, \[\n    view,\n    leftOpen,\n    rightOpen,\n    leftW,\n    rightW,\n    favorites,\n    mode,\n    lang,\n  \]\);''')
save_ui_replacement = '''  useEffect(() => {
    if (!loadedRef.current) return;
    saveStoredUi(getBrowserStorage(), {
      view,
      leftOpen,
      rightOpen,
      leftW,
      rightW,
      favorites,
      mode,
      lang,
    });
  }, [view, leftOpen, rightOpen, leftW, rightW, favorites, mode, lang]);'''
text, count = save_ui_pattern.subn(save_ui_replacement, text, count=1)
if count != 1:
    raise SystemExit(f"ui save replacements: {count}")

text, removed = re.subn(
    r'''try \{\s*localStorage\.removeItem\(BEFORE_KEY\);\s*\} catch \{\}''',
    'clearStoredDraft(getBrowserStorage());',
    text,
)
if removed < 2:
    raise SystemExit(f"draft clear replacements too low: {removed}")

text, saved = re.subn(
    r'''try \{\s*localStorage\.setItem\(BEFORE_KEY, JSON\.stringify\(before\)\);\s*\} catch \{\}''',
    'saveStoredDraft(getBrowserStorage(), before);',
    text,
)
if saved != 1:
    raise SystemExit(f"draft save replacements: {saved}")

for token in ("DOC_KEY", "BEFORE_KEY", "DOC_LOCK", "UI_KEY", "localStorage.getItem", "localStorage.setItem", "localStorage.removeItem"):
    if token in text:
        raise SystemExit(f"legacy storage access remains: {token}")

page.write_text(text)
