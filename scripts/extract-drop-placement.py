from pathlib import Path

page = Path("app/page.tsx")
text = page.read_text()

import_anchor = 'import { adaptItemToFrame } from "@/lib/part-placement";\n'
import_line = import_anchor + 'import { appendDroppedGroup, placeDroppedItem } from "@/lib/drop-placement";\n'
if import_anchor not in text:
    raise SystemExit("part-placement import anchor not found")
text = text.replace(import_anchor, import_line, 1)

size_line = '      const item = d.item;\n      const sz = sizeRef(item);\n'
if size_line not in text:
    raise SystemExit("drop size declaration not found")
text = text.replace(size_line, '      const item = d.item;\n', 1)

old = '''      const rect = canvasRect();
      const v = viewRef.current;
      const rawX = d.guide?.x ?? d.px - d.offX;
      const rawY = d.guide?.y ?? d.py - d.offY;
      const screenL = (rawX + sz.w) * v.z + v.x;
      const screenT = (rawY + sz.h) * v.z + v.y;
      const screenR = rawX * v.z + v.x;
      const screenB = rawY * v.z + v.y;
      const cw = rect?.width ?? 0;
      const ch = rect?.height ?? 0;
      if (
        d.fromPalette &&
        (screenL < 0 || screenT < 0 || screenR > cw || screenB > ch)
      ) {
        setSelectedIds((cur) => cur.filter((x) => x !== item.id));
        setDrag(null);
        return;
      }
      if (d.fromPalette) snapshot();
      const targetFrame =
        frameRef.current === "phone"
          ? framesRef.current.find((f) => {
              const r = frameRect(f);
              const cx = rawX + sz.w / 2;
              const cy = rawY + sz.h / 2;
              return cx >= r.l && cx <= r.r && cy >= r.t && cy <= r.b;
            })
          : undefined;
      /* a bar spans the screen it lands on, beside its rail; any other part keeps its phone-sized
       * default (a list or a field as wide as a desktop is rarely what the author means), but no
       * taller than the screen */
      const adapted = targetFrame
        ? adaptItemToFrame(item, targetFrame, groupsRef.current, framesRef.current, widthsRef.current)
        : { item, slotX: null };
      const placedItem = adapted.item;
      const dropped: Group = {
        id: uid(),
        x: Math.round(adapted.slotX ?? rawX),
        y: Math.round(rawY),
        axis: connectSpecOf(item)?.axis ?? "x",
        items: [placedItem],
      };
      /* a part that grew to the screen's width is kept inside it */
      const ng = targetFrame ? pullInto(dropped, targetFrame, widthsRef.current) : dropped;
      setGroups((prev) =>
        prev.some((g) => g.items.some((it) => it.id === item.id))
          ? prev
          : [...prev, ng],
      );
      setDrag(null);'''

new = '''      const rect = canvasRect();
      const rawX = d.guide?.x ?? d.px - d.offX;
      const rawY = d.guide?.y ?? d.py - d.offY;
      const placement = placeDroppedItem({
        item,
        rawX,
        rawY,
        fromPalette: d.fromPalette,
        frameMode: frameRef.current,
        groups: groupsRef.current,
        frames: framesRef.current,
        widths: widthsRef.current,
        view: viewRef.current,
        viewport: { width: rect?.width ?? 0, height: rect?.height ?? 0 },
        groupId: uid(),
      });
      if (!placement.accepted) {
        setSelectedIds((cur) => cur.filter((x) => x !== item.id));
        setDrag(null);
        return;
      }
      if (d.fromPalette) snapshot();
      setGroups((prev) => appendDroppedGroup(prev, placement.group));
      setDrag(null);'''

if old not in text:
    raise SystemExit("free drop block not found")
text = text.replace(old, new, 1)
page.write_text(text)

todo = Path("docs/TODO.md")
t = todo.read_text()
maint_anchor = '- [x] Extract canvas coordinate transforms, fit/focus, pan, wheel and pinch viewport calculations into testable helpers.\n'
maint_line = maint_anchor + '- [x] Extract free-drop viewport rejection, target-frame selection and finalized group placement into testable helpers.\n'
if maint_anchor not in t:
    raise SystemExit("maintainability TODO anchor not found")
t = t.replace(maint_anchor, maint_line, 1)
wire_anchor = '- [x] Wire `app/page.tsx` coordinate transforms, fit/focus and pan/zoom gestures to the extracted canvas-viewport helpers.\n'
wire_line = wire_anchor + '- [x] Wire `app/page.tsx` free-drop finalization to the extracted drop-placement helper.\n'
if wire_anchor not in t:
    raise SystemExit("wiring TODO anchor not found")
t = t.replace(wire_anchor, wire_line, 1)
rel_anchor = '- [x] Add focused tests for extracted canvas viewport coordinate, fit and gesture calculations.\n'
rel_line = rel_anchor + '- [x] Add focused tests for free-drop viewport, target-frame and finalized placement behavior.\n'
if rel_anchor not in t:
    raise SystemExit("reliability TODO anchor not found")
t = t.replace(rel_anchor, rel_line, 1)
todo.write_text(t)
