from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()

old_import = 'import { itemRectsOfGroups, marqueeHitIds, selectionRect } from "@/lib/canvas-selection";'
new_import = old_import + '\nimport { dragCarriedGroupsFromOrigins, dragFrameFromOrigin, dragGroupFromOrigin } from "@/lib/canvas-drag";'
if new_import not in text:
    if old_import not in text:
        raise SystemExit("canvas selection import not found")
    text = text.replace(old_import, new_import, 1)

old_group = '        setGroups((gs) => gs.map((gr) => (gr.id === g.id ? { ...gr, x: Math.round(g.gx + dx), y: Math.round(g.gy + dy) } : gr)));'
new_group = '''        setGroups((gs) =>
          dragGroupFromOrigin(gs, g.id, g.gx, g.gy, dx, dy),
        );'''
if new_group not in text:
    if old_group not in text:
        raise SystemExit("group drag update not found")
    text = text.replace(old_group, new_group, 1)

old_frame = '''        const ids = new Map(g.groups.map((o) => [o.id, o]));
        for (const o of g.groups) instantRef.current.add(o.id);
        setFrames((fs) =>
          fs.map((f) =>
            f.id === g.id
              ? { ...f, x: Math.round(g.fx + dx), y: Math.round(g.fy + dy) }
              : f,
          ),
        );
        setGroups((gs) =>
          gs.map((gr) => {
            const o = ids.get(gr.id);
            return o
              ? { ...gr, x: Math.round(o.x + dx), y: Math.round(o.y + dy) }
              : gr;
          }),
        );'''
new_frame = '''        for (const o of g.groups) instantRef.current.add(o.id);
        setFrames((fs) =>
          dragFrameFromOrigin(fs, g.id, g.fx, g.fy, dx, dy),
        );
        setGroups((gs) =>
          dragCarriedGroupsFromOrigins(gs, g.groups, dx, dy),
        );'''
if new_frame not in text:
    if old_frame not in text:
        raise SystemExit("frame drag update not found")
    text = text.replace(old_frame, new_frame, 1)

path.write_text(text)
