from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()

old_import = 'import { barSlotOf, carryFrame, pullInto, tidyFrame } from "@/lib/tidy";'
new_import = 'import { carryFrame, pullInto, tidyFrame } from "@/lib/tidy";\nimport { adaptItemToFrame } from "@/lib/part-placement";'
if old_import not in text:
    raise SystemExit("tidy import not found")
text = text.replace(old_import, new_import, 1)

old_mobile = '''  if (f) {
    const frameSize = frameSizeOf(f);
    const isBar = FULL_WIDTH.includes(kind);
    const slot = barSlotOf(groupsRef.current, f, framesRef.current, widthsRef.current);
    if (slot) {
      placedItem = isBar
        ? carryItemSize(item, { w: PHONE_W, h: PHONE_H }, { w: slot.w, h: frameSize.h })
        : fitHeight(item, frameSize.h);
    }
    const sz = sizeOf(placedItem, widthsRef.current);
    x = isBar && slot ? slot.x : f.x + Math.max(FRAME_MARGIN, (frameSize.w - sz.w) / 2);
    y = f.y + FRAME_MARGIN;
'''
new_mobile = '''  if (f) {
    const frameSize = frameSizeOf(f);
    const adapted = adaptItemToFrame(item, f, groupsRef.current, framesRef.current, widthsRef.current);
    placedItem = adapted.item;
    const sz = sizeOf(placedItem, widthsRef.current);
    x = adapted.slotX ?? f.x + Math.max(FRAME_MARGIN, (frameSize.w - sz.w) / 2);
    y = f.y + FRAME_MARGIN;
'''
if old_mobile not in text:
    raise SystemExit("mobile placement block not found")
text = text.replace(old_mobile, new_mobile, 1)

old_desktop = '''      const slot = targetFrame ? barSlotOf(groupsRef.current, targetFrame, framesRef.current, widthsRef.current) : null;
      const isBar = FULL_WIDTH.includes(item.kind);
      const placedItem = targetFrame && slot ? (isBar ? carryItemSize(item, { w: PHONE_W, h: PHONE_H }, { w: slot.w, h: frameSizeOf(targetFrame).h }) : fitHeight(item, frameSizeOf(targetFrame).h)) : item;
      const dropped: Group = {
        id: uid(),
        x: Math.round(isBar && slot ? slot.x : rawX),
        y: Math.round(rawY),
        axis: connectSpecOf(item)?.axis ?? "x",
        items: [placedItem],
      };
'''
new_desktop = '''      const adapted = targetFrame
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
'''
if old_desktop not in text:
    raise SystemExit("desktop placement block not found")
text = text.replace(old_desktop, new_desktop, 1)

path.write_text(text)
