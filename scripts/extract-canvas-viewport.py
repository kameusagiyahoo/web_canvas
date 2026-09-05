from pathlib import Path
import re

page_path = Path("app/page.tsx")
text = page_path.read_text()

import_anchor = 'import { dragCarriedGroupsFromOrigins, dragFrameFromOrigin, dragGroupFromOrigin } from "@/lib/canvas-drag";\n'
viewport_import = (
    import_anchor
    + 'import { clientToWorld, fitCanvasView, focusFrameView as focusCanvasFrameView, panViewFromOrigin, pinchViewFromOrigin, wheelPanView, zoomViewAt } from "@/lib/canvas-viewport";\n'
)
if import_anchor not in text:
    raise SystemExit("canvas-drag import anchor not found")
text = text.replace(import_anchor, viewport_import, 1)

to_world_old = '''  const toWorld = (clientX: number, clientY: number) => {
    const r = canvasRect();
    const v = viewRef.current;
    return {
      x: (clientX - (r?.left ?? 0) - v.x) / v.z,
      y: (clientY - (r?.top ?? 0) - v.y) / v.z,
    };
  };
'''
to_world_new = '''  const toWorld = (clientX: number, clientY: number) =>
    clientToWorld(clientX, clientY, canvasRect(), viewRef.current);
'''
if to_world_old not in text:
    raise SystemExit("toWorld block not found")
text = text.replace(to_world_old, to_world_new, 1)

zoom_pattern = re.compile(
    r'  const setZoomAt = useCallback\(\(nz: number, cx\?: number, cy\?: number\) => \{\n.*?\n  \}, \[\]\);',
    re.S,
)
zoom_new = '''  const setZoomAt = useCallback((nz: number, cx?: number, cy?: number) => {
    setView(
      zoomViewAt(
        viewRef.current,
        nz,
        canvasRect(),
        MIN_Z,
        MAX_Z,
        cx,
        cy,
      ),
    );
  }, []);'''
text, count = zoom_pattern.subn(zoom_new, text, count=1)
if count != 1:
    raise SystemExit(f"setZoomAt replacements: {count}")

fit_pattern = re.compile(
    r'  const fit = useCallback\(\(\) => \{\n.*?\n  \}, \[\]\);\n  const fitRef = useRef\(fit\);',
    re.S,
)
fit_new = '''  const fit = useCallback(() => {
    const r = canvasRect();
    if (!r) return;
    setView(
      fitCanvasView({
        groups: groupsRef.current,
        frames: framesRef.current,
        widths: widthsRef.current,
        frameMode: frameRef.current,
        viewportWidth: r.width,
        viewportHeight: r.height,
        mobile: mobileRef.current,
        minZoom: MIN_Z,
        maxZoom: MAX_Z,
      }),
    );
  }, []);
  const fitRef = useRef(fit);'''
text, count = fit_pattern.subn(fit_new, text, count=1)
if count != 1:
    raise SystemExit(f"fit replacements: {count}")

focus_pattern = re.compile(
    r'  /\*\* Mobile screen switching keeps one screen framed at a readable width\. \*/\n'
    r'  const focusFrame = useCallback\(\(id: string\) => \{\n.*?\n  \}, \[\]\);',
    re.S,
)
focus_new = '''  /** Mobile screen switching keeps one screen framed at a readable width. */
  const focusFrame = useCallback((id: string) => {
    const r = canvasRect();
    const f = framesRef.current.find((x) => x.id === id);
    if (!r || !f) return;
    setView(focusCanvasFrameView(f, r.width, MIN_Z, MAX_Z));
  }, []);'''
text, count = focus_pattern.subn(focus_new, text, count=1)
if count != 1:
    raise SystemExit(f"focusFrame replacements: {count}")

pinch_old = '''      const r = canvasRef.current?.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const z = clamp((pinch.z0 * d) / Math.max(1, pinch.d0), MIN_Z, MAX_Z);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const px = pinch.mx - (r?.left ?? 0);
      const py = pinch.my - (r?.top ?? 0);
      setView({
        x: px - ((px - pinch.vx) * z) / pinch.z0 + (mx - pinch.mx),
        y: py - ((py - pinch.vy) * z) / pinch.z0 + (my - pinch.my),
        z,
      });
'''
pinch_new = '''      const r = canvasRef.current?.getBoundingClientRect();
      setView(
        pinchViewFromOrigin(
          pinch,
          a,
          b,
          r?.left ?? 0,
          r?.top ?? 0,
          MIN_Z,
          MAX_Z,
        ),
      );
'''
if pinch_old not in text:
    raise SystemExit("pinch calculation block not found")
text = text.replace(pinch_old, pinch_new, 1)

wheel_old = '        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));'
wheel_new = '        setView((v) => wheelPanView(v, e.deltaX, e.deltaY));'
if wheel_old not in text:
    raise SystemExit("wheel pan block not found")
text = text.replace(wheel_old, wheel_new, 1)

pan_old = '''        setView((v) => ({
          ...v,
          x: g.vx + (e.clientX - g.sx),
          y: g.vy + (e.clientY - g.sy),
        }));'''
pan_new = '''        setView((v) =>
          panViewFromOrigin(
            { x: g.vx, y: g.vy },
            g.sx,
            g.sy,
            e.clientX,
            e.clientY,
            v.z,
          ),
        );'''
if pan_old not in text:
    raise SystemExit("pan gesture block not found")
text = text.replace(pan_old, pan_new, 1)

page_path.write_text(text)

todo_path = Path("docs/TODO.md")
todo = todo_path.read_text()
maint_anchor = '- [x] Extract frame/group drag coordinate updates into testable helpers.\n'
maint_line = '- [x] Extract canvas coordinate transforms, fit/focus, pan, wheel and pinch viewport calculations into testable helpers.\n'
if maint_line not in todo:
    if maint_anchor not in todo:
        raise SystemExit("maintainability TODO anchor not found")
    todo = todo.replace(maint_anchor, maint_anchor + maint_line, 1)

wire_anchor = '- [x] Wire `app/page.tsx` frame/group drag updates to the extracted canvas-drag helpers.\n'
wire_line = '- [x] Wire `app/page.tsx` coordinate transforms, fit/focus and pan/zoom gestures to the extracted canvas-viewport helpers.\n'
if wire_line not in todo:
    if wire_anchor not in todo:
        raise SystemExit("viewport wiring TODO anchor not found")
    todo = todo.replace(wire_anchor, wire_anchor + wire_line, 1)

reliability_anchor = '- [x] Add focused tests for extracted canvas frame/group drag coordinates.\n'
reliability_line = '- [x] Add focused tests for extracted canvas viewport coordinate, fit and gesture calculations.\n'
if reliability_line not in todo:
    if reliability_anchor not in todo:
        raise SystemExit("viewport test TODO anchor not found")
    todo = todo.replace(reliability_anchor, reliability_anchor + reliability_line, 1)

todo_path.write_text(todo)
