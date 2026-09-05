from pathlib import Path

# One-shot wiring for the mobile screen picker -> preview flow.
page = Path("app/page.tsx")
text = page.read_text()

old = '      const id = startId ?? selectedFrameId ?? framesRef.current[0]?.id ?? null;'
new = '      const id = startId ?? selectedFrameId ?? layersFrameId ?? framesRef.current[0]?.id ?? null;'
if old not in text:
    raise SystemExit("preview start expression not found")
text = text.replace(old, new, 1)

anchor = '''                  onDelete={(id) => {
                    const next = framesRef.current.find((f) => f.id !== id);
                    deleteFrame(id);
                    if (layersFrameId === id) {
                      setLayersFrameId(next?.id ?? null);
                      if (next) focusFrame(next.id);
                    }
                  }}
'''
replacement = anchor + '''                  onPreview={(id) => {
                    setSheet(null);
                    setLayersFrameId(id);
                    openPreview(id);
                  }}
'''
if anchor not in text:
    raise SystemExit("MobileScreens anchor not found")
text = text.replace(anchor, replacement, 1)

page.write_text(text)
