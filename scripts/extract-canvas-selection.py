from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()

old_import = 'import { groupItemSelection, nudgeFrameWithGroups, nudgeItemGroups, ungroupFreeGroup } from "@/lib/group-commands";'
new_import = old_import + '\nimport { itemRectsOfGroups, marqueeHitIds, selectionRect } from "@/lib/canvas-selection";'
if old_import not in text:
    raise SystemExit("group command import not found")
text = text.replace(old_import, new_import, 1)

old_rects = '''  const itemRects = useCallback(() => {
    const out: { id: string; l: number; t: number; r: number; b: number }[] =
      [];
    for (const g of groupsRef.current) {
      for (const pl of layoutOf(g, widthsRef.current)) {
        out.push({ id: pl.item.id, l: pl.x, t: pl.y, r: pl.x + pl.w, b: pl.y + pl.h });
      }
    }
    return out;
  }, []);
'''
new_rects = '''  const itemRects = useCallback(
    () => itemRectsOfGroups(groupsRef.current, widthsRef.current),
    [],
  );
'''
if old_rects not in text:
    raise SystemExit("itemRects block not found")
text = text.replace(old_rects, new_rects, 1)

old_marquee = '''        const l = Math.min(g.x0, g.x1);
        const r = Math.max(g.x0, g.x1);
        const t = Math.min(g.y0, g.y1);
        const b = Math.max(g.y0, g.y1);
        const hit = itemRects()
          .filter((it) => it.l < r && it.r > l && it.t < b && it.b > t)
          .map((it) => it.id);
        setSelectedIds(hit);
'''
new_marquee = '''        const marquee = selectionRect(g.x0, g.y0, g.x1, g.y1);
        setSelectedIds(marqueeHitIds(itemRects(), marquee));
'''
if old_marquee not in text:
    raise SystemExit("marquee block not found")
text = text.replace(old_marquee, new_marquee, 1)

path.write_text(text)
