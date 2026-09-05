from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()

text = text.replace(
    'import { clientToWorld, fitCanvasView, focusFrameView as focusCanvasFrameView, panViewFromOrigin, pinchViewFromOrigin, wheelPanView, zoomViewAt } from "@/lib/canvas-viewport";',
    'import { centerFrameViewAtZoom, clientToWorld, fitCanvasView, focusFrameView as focusCanvasFrameView, panViewFromOrigin, pinchViewFromOrigin, wheelPanView, zoomViewAt } from "@/lib/canvas-viewport";',
)
text = text.replace(
    'import { deleteFrameFromDocument, duplicateFrameInDocument, nextFrameX as nextFrameDocumentX } from "@/lib/frame-commands";',
    'import { createInitialPhoneFrame, createNextFrame, deleteFrameFromDocument, duplicateFrameInDocument } from "@/lib/frame-commands";',
)

old = '''  const nextFrameX = () => nextFrameDocumentX(framesRef.current);

  /** Entering phone mode with no frames wraps the existing parts in one. */
  const ensureFrame = () => {
    if (framesRef.current.length > 0) return;
    const gs = groupsRef.current;
    let x = 0;
    let y = 0;
    if (gs.length) {
      const bbs = gs.map((g) => groupBounds(g, widthsRef.current));
      const l = Math.min(...bbs.map((b) => b.l));
      const t = Math.min(...bbs.map((b) => b.t));
      const r = Math.max(...bbs.map((b) => b.r));
      x = Math.round(Math.max(l - 24, r - PHONE_W + 24 > l ? l : l - 24));
      y = Math.round(t - 72);
      x = Math.min(x, l);
      y = Math.min(y, t);
    }
    const f: Frame = { id: uid(), name: t("home"), x, y };
    setFrames([f]);
  };
'''
new = '''  /** Entering phone mode with no frames wraps the existing parts in one. */
  const ensureFrame = () => {
    if (framesRef.current.length > 0) return;
    setFrames([
      createInitialPhoneFrame(groupsRef.current, widthsRef.current, {
        id: uid(),
        name: t("home"),
      }),
    ]);
  };
'''
if old not in text:
    raise SystemExit("ensureFrame anchor not found")
text = text.replace(old, new)

old = '''  const addFrame = () => {
    snapshot();
    const base = framesRef.current[0];
    const f: Frame = {
      id: uid(),
      name: `${t("screenN")} ${framesRef.current.length + 1}`,
      x: nextFrameX(),
      y: base?.y ?? 0,
    };
    setFrames((fs) => [...fs, f]);
    setSelectedFrameId(f.id);
    setSelectedIds([]);
    const r = canvasRect();
    if (r) {
      const z = viewRef.current.z;
      const { w, h } = frameSizeOf(f);
      setView({
        x: r.width / 2 - (f.x + w / 2) * z,
        y: r.height / 2 - (f.y + h / 2) * z,
        z,
      });
    }
  };
'''
new = '''  const addFrame = () => {
    snapshot();
    const f = createNextFrame(framesRef.current, {
      id: uid(),
      name: `${t("screenN")} ${framesRef.current.length + 1}`,
    });
    setFrames((fs) => [...fs, f]);
    setSelectedFrameId(f.id);
    setSelectedIds([]);
    const r = canvasRect();
    if (r) {
      setView(
        centerFrameViewAtZoom(f, r.width, r.height, viewRef.current.z),
      );
    }
  };
'''
if old not in text:
    raise SystemExit("addFrame anchor not found")
text = text.replace(old, new)

if "nextFrameDocumentX" in text or "const nextFrameX" in text:
    raise SystemExit("stale next-frame wrapper remains")
if "createInitialPhoneFrame(" not in text or "createNextFrame(" not in text:
    raise SystemExit("frame creation helpers were not wired")
if "centerFrameViewAtZoom(" not in text:
    raise SystemExit("frame centering helper was not wired")

path.write_text(text)
