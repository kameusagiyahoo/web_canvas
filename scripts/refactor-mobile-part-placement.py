from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()

text = text.replace(
    'import { carryFrame, pullInto, tidyFrame } from "@/lib/tidy";\nimport { adaptItemToFrame } from "@/lib/part-placement";',
    'import { carryFrame, tidyFrame } from "@/lib/tidy";\nimport { placePickedItem } from "@/lib/part-placement";',
)
text = text.replace('type View = { x: number; y: number; z: number };\nconst FRAME_MARGIN = PHONE_MARGIN;\n', 'type View = { x: number; y: number; z: number };\n')

old = '''  /** Phone UI: add any Material part to the selected screen. */
const addPart = (kind: Kind) => {
  const item = makeItem(kind);
  const f = framesRef.current.find((x) => x.id === (selectedFrameId ?? layersFrameId)) ?? framesRef.current[0];
  const baseSize = sizeOf(item, widthsRef.current);
  let placedItem = item;
  let x = 0;
  let y = 0;

  if (f) {
    const frameSize = frameSizeOf(f);
    const adapted = adaptItemToFrame(item, f, groupsRef.current, framesRef.current, widthsRef.current);
    placedItem = adapted.item;
    const sz = sizeOf(placedItem, widthsRef.current);
    x = adapted.slotX ?? f.x + Math.max(FRAME_MARGIN, (frameSize.w - sz.w) / 2);
    y = f.y + FRAME_MARGIN;

    const taken = (yy: number) =>
      itemRects().some((o) => o.l < x + sz.w && o.r > x && o.t < yy + sz.h && o.b > yy);
    let tries = 0;
    while (taken(y) && y + sz.h + FRAME_MARGIN < f.y + frameSize.h && tries++ < 20) {
      y += sz.h + 12;
    }

    const dropped: Group = {
      id: uid(),
      x: Math.round(x),
      y: Math.round(y),
      axis: connectSpecOf(placedItem)?.axis ?? "x",
      items: [placedItem],
    };
    const inside = pullInto(dropped, f, widthsRef.current);
    snapshot();
    setGroups((gs) => [...gs, inside]);
  } else {
    const r = canvasRect();
    const v = viewRef.current;
    x = ((r?.width ?? 0) / 2 - v.x) / v.z - baseSize.w / 2;
    y = ((r?.height ?? 0) / 2 - v.y) / v.z - baseSize.h / 2;
    snapshot();
    setGroups((gs) => [
      ...gs,
      { id: uid(), x: Math.round(x), y: Math.round(y), axis: connectSpecOf(item)?.axis ?? "x", items: [item] },
    ]);
  }

  setSelectedIds([placedItem.id]);
  setSelectedFrameId(null);
  setSheet(null);
};
'''
new = '''  /** Phone UI: add any Material part using the shared picker-placement command. */
  const addPart = (kind: Kind) => {
    const item = makeItem(kind);
    const targetFrame =
      framesRef.current.find(
        (candidate) => candidate.id === (selectedFrameId ?? layersFrameId),
      ) ??
      framesRef.current[0] ??
      null;
    const rect = canvasRect();
    const placement = placePickedItem({
      item,
      targetFrame,
      groups: groupsRef.current,
      frames: framesRef.current,
      widths: widthsRef.current,
      view: viewRef.current,
      viewport: { width: rect?.width ?? 0, height: rect?.height ?? 0 },
      groupId: uid(),
    });

    snapshot();
    setGroups((current) => [...current, placement.group]);
    setSelectedIds([placement.item.id]);
    setSelectedFrameId(null);
    setSheet(null);
  };
'''

if old not in text:
    raise SystemExit("addPart anchor not found")
text = text.replace(old, new)

if 'adaptItemToFrame' in text or 'FRAME_MARGIN' in text or 'pullInto(' in text:
    raise SystemExit("stale mobile placement implementation remains")
if 'placePickedItem({' not in text:
    raise SystemExit("shared picker placement was not wired")

path.write_text(text)
