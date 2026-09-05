from pathlib import Path
import re

page = Path("app/page.tsx")
text = page.read_text()

anchor = 'import { deleteFrameFromDocument, duplicateFrameInDocument, nextFrameX as nextFrameDocumentX } from "@/lib/frame-commands";\n'
addition = 'import { previewCameraForFrame, resolvePreviewStartId } from "@/lib/preview-session";\n'
if addition not in text:
    if anchor not in text:
        raise SystemExit("preview import anchor not found")
    text = text.replace(anchor, anchor + addition, 1)

pattern = re.compile(r'''    queueMicrotask\(\(\) => \{\n      const id = startId \?\? selectedFrameId \?\? layersFrameId \?\? framesRef\.current\[0\]\?\.id \?\? null;\n      const f = framesRef\.current\.find\(\(x\) => x\.id === id\);\n      const r = canvasRect\(\);\n      if \(f && r\) \{\n        /\* the preview's own fit and center, in window coordinates: its stage is sized for the\n         \* largest screen and sits left of the control column, so the screen lands where the\n         \* preview will show it \*/\n        const \{ w, h \} = frameSizeOf\(f\);\n        const wide = window\.innerWidth >= 720;\n        const maxW = Math\.max\(\.\.\.framesRef\.current\.map\(\(x\) => frameSizeOf\(x\)\.w\)\) \+ BEZEL \* 2;\n        const maxH = Math\.max\(\.\.\.framesRef\.current\.map\(\(x\) => frameSizeOf\(x\)\.h\)\) \+ BEZEL \* 2;\n        const z = clamp\(Math\.min\(1\.4, \(window\.innerHeight - 32\) / maxH, \(window\.innerWidth - \(wide \? 236 : 16\)\) / maxW\), MIN_Z, MAX_Z\);\n        const cx = \(window\.innerWidth - \(wide \? 220 : 0\)\) / 2 - r\.left;\n        const cy = window\.innerHeight / 2 - \(wide \? 0 : 28\) - r\.top;\n        viewBeforePreview\.current = viewRef\.current;\n        glide\(\{ x: cx - \(f\.x \+ w / 2\) \* z, y: cy - \(f\.y \+ h / 2\) \* z, z \}\);\n        window\.setTimeout\(\(\) => setPreviewId\(id\), SETTLE_MS\);\n      \} else \{\n        setPreviewId\(id\);\n      \}\n    \}\);''')
replacement = '''    queueMicrotask(() => {
      const id = resolvePreviewStartId(framesRef.current, startId, selectedFrameId, layersFrameId);
      const f = framesRef.current.find((x) => x.id === id);
      const r = canvasRect();
      if (f && r) {
        const wide = window.innerWidth >= 720;
        viewBeforePreview.current = viewRef.current;
        glide(
          previewCameraForFrame({
            frame: f,
            frames: framesRef.current,
            canvasLeft: r.left,
            canvasTop: r.top,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            wide,
            minZoom: MIN_Z,
            maxZoom: MAX_Z,
          }),
        );
        window.setTimeout(() => setPreviewId(id), SETTLE_MS);
      } else {
        setPreviewId(id);
      }
    });'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f"preview block replacements: {count}")

page.write_text(text)
