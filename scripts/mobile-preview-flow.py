from pathlib import Path
import re

# One-shot wiring for the mobile screen picker -> preview flow.
page = Path("app/page.tsx")
text = page.read_text()

old = '      const id = startId ?? selectedFrameId ?? framesRef.current[0]?.id ?? null;'
new = '      const id = startId ?? selectedFrameId ?? layersFrameId ?? framesRef.current[0]?.id ?? null;'
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit("preview start expression not found")

if 'onPreview={(id) => {' not in text:
    pattern = re.compile(r'(\s+onDelete=\{\(id\) => \{.*?\n\s+\}\}\n)(\s*/>)', re.S)
    match = pattern.search(text, text.find('<MobileScreens'))
    if not match:
        raise SystemExit("MobileScreens delete prop not found")
    preview = '''                  onPreview={(id) => {
                    setSheet(null);
                    setLayersFrameId(id);
                    openPreview(id);
                  }}
'''
    text = text[:match.end(1)] + preview + text[match.end(1):]

page.write_text(text)
