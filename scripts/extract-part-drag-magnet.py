from pathlib import Path
import re

path = Path("app/page.tsx")
text = path.read_text()

import_anchor = 'import { dragCarriedGroupsFromOrigins, dragFrameFromOrigin, dragGroupFromOrigin } from "@/lib/canvas-drag";\n'
imports = (
    import_anchor
    + 'import { findAlignmentGuide, findMagneticSnap, restPosition, type Guide, type Snap } from "@/lib/canvas-magnet";\n'
    + 'import { detachItemForDrag, insertItemAtSnap } from "@/lib/part-drag";\n'
)
if import_anchor not in text:
    raise SystemExit("canvas-drag import anchor not found")
text = text.replace(import_anchor, imports, 1)

local_types = '''type View = { x: number; y: number; z: number };
type Snap = { groupId: string; index: number; pull: number };

/** alignment guide: the snapped position plus the line to draw */
type Guide = { x?: number; y?: number; gx?: number; gy?: number };
const GUIDE_PX = 7;
const FRAME_MARGIN = PHONE_MARGIN;
'''
replacement_types = 'type View = { x: number; y: number; z: number };\n'
if local_types not in text:
    raise SystemExit("local Snap/Guide type block not found")
text = text.replace(local_types, replacement_types, 1)

magnet_pattern = re.compile(
    r'  /\* ---------- rest positions and the magnet ---------- \*/\n.*?'
    r'  const sx = useSpring\(0, CARRY\);',
    re.S,
)
magnet_replacement = '''  /* ---------- rest positions and the magnet ---------- */
  const restPos = useCallback(
    (g: Group, k: number, sz: { w: number; h: number }) =>
      restPosition(g, k, sz, widthsRef.current),
    [],
  );

  const findSnap = useCallback(
    (item: Item, left: number, top: number): Snap | null =>
      findMagneticSnap(item, left, top, groupsRef.current, widthsRef.current),
    [],
  );

  const sx = useSpring(0, CARRY);'''
text, count = magnet_pattern.subn(magnet_replacement, text, count=1)
if count != 1:
    raise SystemExit(f"magnet block replacements: {count}")

# findGuide sits after the two springs; replace only its calculation, leaving the springs intact.
guide_pattern = re.compile(
    r'  /\*\* Canva-style alignment: edges and centres of neighbours and of the frame\n'
    r'.*?'
    r'  /\* ---------- pointer: parts ---------- \*/',
    re.S,
)
guide_replacement = '''  /** Alignment candidates and tolerance live in canvas-magnet; the page supplies live editor refs. */
  const findGuide = useCallback(
    (item: Item, left: number, top: number): Guide | null =>
      findAlignmentGuide(
        item,
        left,
        top,
        groupsRef.current,
        framesRef.current,
        widthsRef.current,
        { phoneMode: frameRef.current === "phone", zoom: viewRef.current.z },
      ),
    [],
  );

  /* ---------- pointer: parts ---------- */'''
text, count = guide_pattern.subn(guide_replacement, text, count=1)
if count != 1:
    raise SystemExit(f"guide block replacements: {count}")

detach_old = '''        setGroups((prev) => {
          const out: Group[] = [];
          for (const g of prev) {
            const idx = g.items.findIndex((it) => it.id === id);
            if (idx < 0) {
              out.push(g);
              continue;
            }
            const rest = g.items.filter((it) => it.id !== id);
            if (rest.length === 0) continue;
            const sz = sizeOf(g.items[idx], widthsRef.current);
            const back = idx === 0;
            // The anchor moves to the new first item; that jump must not animate,
            // otherwise the remaining run springs sideways for a frame.
            if (back) instantRef.current.add(g.id);
            out.push({
              ...g,
              x: back && g.axis === "x" ? g.x + sz.w + GAP : g.x,
              y: back && g.axis === "y" ? g.y + sz.h + GAP : g.y,
              items: rest,
            });
          }
          return out;
        });'''
detach_new = '''        setGroups((prev) => {
          const result = detachItemForDrag(prev, id, widthsRef.current);
          // The anchor moves to the new first item; that jump must not animate,
          // otherwise the remaining run springs sideways for a frame.
          for (const groupId of result.shiftedGroupIds) instantRef.current.add(groupId);
          return result.groups;
        });'''
if detach_old not in text:
    raise SystemExit("drag detach block not found")
text = text.replace(detach_old, detach_new, 1)

snap_old = '''          setGroups((prev) => {
            if (prev.some((g) => g.items.some((it) => it.id === item.id)))
              return prev;
            return prev.map((g) => {
              if (g.id !== t.groupId) return g;
              const front = t.index === 0;
              return {
                ...g,
                x: front && g.axis === "x" ? g.x - sz.w - GAP : g.x,
                y: front && g.axis === "y" ? g.y - sz.h - GAP : g.y,
                items: [
                  ...g.items.slice(0, t.index),
                  item,
                  ...g.items.slice(t.index),
                ],
              };
            });
          });'''
snap_new = '''          setGroups((prev) =>
            insertItemAtSnap(prev, item, t, widthsRef.current),
          );'''
if snap_old not in text:
    raise SystemExit("snap commit block not found")
text = text.replace(snap_old, snap_new, 1)

# These token imports belonged only to the page-local magnet calculation.
for name in ["canJoin", "PULL_EXP", "SNAP_CROSS", "SNAP_MAIN"]:
    if text.count(name) == 1:
        text = text.replace(f"  {name},\n", "", 1)

path.write_text(text)
