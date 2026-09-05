from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()

old_import = 'import { reorderFrameGroups, reorderItemsInGroup } from "@/lib/layer-commands";'
new_import = old_import + '\nimport { deleteItemsFromGroups, duplicateItemSelection } from "@/lib/item-commands";'
if old_import not in text:
    raise SystemExit("layer command import not found")
text = text.replace(old_import, new_import, 1)

old_delete = '''  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const ids = new Set(selectedIds);
    snapshot();
    setGroups((prev) =>
      prev
        .map((g) => {
          if (g.free) return collapseFree({ ...g, items: g.items.filter((it) => !ids.has(it.id)) }, widthsRef.current);
          let x = g.x;
          let y = g.y;
          let items = g.items;
          while (items.length && ids.has(items[0].id)) {
            const sz = sizeOf(items[0], widthsRef.current);
            if (g.axis === "x") x += sz.w + GAP;
            else y += sz.h + GAP;
            items = items.slice(1);
          }
          if (x !== g.x || y !== g.y) instantRef.current.add(g.id);
          return { ...g, x, y, items: items.filter((it) => !ids.has(it.id)) };
        })
        .filter((g) => g.items.length > 0),
    );
    setSelectedIds([]);
  }, [selectedIds, snapshot]);
'''
new_delete = '''  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    snapshot();
    setGroups((prev) => {
      const result = deleteItemsFromGroups(prev, selectedIds, widthsRef.current);
      for (const id of result.shiftedGroupIds) instantRef.current.add(id);
      return result.groups;
    });
    setSelectedIds([]);
  }, [selectedIds, snapshot]);
'''
if old_delete not in text:
    raise SystemExit("deleteSelected block not found")
text = text.replace(old_delete, new_delete, 1)

old_duplicate = '''  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    /* a selected hand-made group is copied whole, keeping its layout */
    const fg = groupsRef.current.find((g) => g.free && g.items.some((it) => it.id === selected.id));
    if (fg && fg.items.every((it) => selectedIds.includes(it.id))) {
      const idMap = new Map(fg.items.map((it) => [it.id, uid()]));
      const pos: Record<string, { x: number; y: number }> = {};
      for (const it of fg.items) pos[idMap.get(it.id)!] = fg.pos?.[it.id] ?? { x: 0, y: 0 };
      const copyG: Group = {
        ...fg,
        id: uid(),
        x: fg.x + 24,
        y: fg.y + 24,
        pos,
        items: fg.items.map((it) => ({ ...it, id: idMap.get(it.id)!, tabs: it.tabs?.map((t) => ({ ...t })) })),
      };
      snapshot();
      setGroups((prev) => [...prev, copyG]);
      setSelectedIds(copyG.items.map((it) => it.id));
      return;
    }
    const rect = itemRects().find((r) => r.id === selected.id);
    if (!rect) return;
    const copy: Item = {
      ...selected,
      id: uid(),
      tabs: selected.tabs?.map((t) => ({ ...t })),
    };
    snapshot();
    setGroups((prev) => [
      ...prev,
      {
        id: uid(),
        x: rect.l + 24,
        y: rect.t + 24,
        axis: connectSpecOf(copy)?.axis ?? "x",
        items: [copy],
      },
    ]);
    setSelectedIds([copy.id]);
  }, [selected, selectedIds, itemRects, snapshot]);
'''
new_duplicate = '''  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const result = duplicateItemSelection(
      groupsRef.current,
      selectedIds,
      selected.id,
      widthsRef.current,
      uid,
    );
    if (!result) return;
    snapshot();
    setGroups(result.groups);
    setSelectedIds(result.selectedIds);
  }, [selected, selectedIds, snapshot]);
'''
if old_duplicate not in text:
    raise SystemExit("duplicateSelected block not found")
text = text.replace(old_duplicate, new_duplicate, 1)

path.write_text(text)
