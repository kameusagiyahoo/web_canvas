from pathlib import Path

page = Path("app/page.tsx")
text = page.read_text()

storage_import = 'import { STORAGE_KEYS, clearStoredDraft, getBrowserStorage, readStoredDocument, readStoredDraft, readStoredUi, saveStoredDocument, saveStoredDraft, saveStoredUi } from "@/lib/storage";\n'
type_import = 'import type { StorageFailureReason } from "@/lib/storage";\n'
if storage_import not in text:
    raise SystemExit("storage import not found")
if type_import not in text:
    text = text.replace(storage_import, storage_import + type_import, 1)

mobile_parts_import = 'import { MobileParts } from "@/components/MobileParts";\n'
warning_import = 'import { StorageWarning } from "@/components/StorageWarning";\n'
if warning_import not in text:
    if mobile_parts_import not in text:
        raise SystemExit("component import anchor not found")
    text = text.replace(mobile_parts_import, mobile_parts_import + warning_import, 1)

state_anchor = '  const [toast, setToast] = useState<string | null>(null);\n'
state_add = '  const [storageWarning, setStorageWarning] = useState<StorageFailureReason | null>(null);\n'
if state_add not in text:
    if state_anchor not in text:
        raise SystemExit("toast state anchor not found")
    text = text.replace(state_anchor, state_anchor + state_add, 1)

old_save = '''    saveStoredDocument(getBrowserStorage(), {
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
'''
new_save = '''    const result = saveStoredDocument(getBrowserStorage(), {
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
    setStorageWarning(result.ok ? null : result.reason);
'''
if old_save not in text:
    raise SystemExit("document autosave block not found")
text = text.replace(old_save, new_save, 1)

render_anchor = '''          {toast && (
'''
warning_render = '''          {storageWarning && (
            <StorageWarning
              reason={storageWarning}
              lang={lang}
              palette={p}
              onExport={() => saveProject(docRef.current)}
              onDismiss={() => setStorageWarning(null)}
            />
          )}

'''
if warning_render not in text:
    if render_anchor not in text:
        raise SystemExit("toast render anchor not found")
    text = text.replace(render_anchor, warning_render + render_anchor, 1)

text = text.replace(
    '/** The phone version starts with buttons only: that is all it edits. */',
    '/** Lightweight first-run content for a phone-sized editor. */',
    1,
)
text = text.replace(
    '/* everyone works on phone screens; a phone gets one fixed screen and the select tool only */',
    '/* Mobile keeps the canvas in phone-screen mode while sharing the same document model. */',
    1,
)

page.write_text(text)
