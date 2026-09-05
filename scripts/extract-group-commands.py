from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()

old_import = 'import { deleteItemsFromGroups, duplicateItemSelection } from "@/lib/item-commands";'
new_import = old_import + '\nimport { groupItemSelection, nudgeFrameWithGroups, nudgeItemGroups, ungroupFreeGroup } from "@/lib/group-commands";'
if old_import not in text:
    raise SystemExit("item command import not found")
text = text.replace(old_import, new_import, 1)

start = text.index('  /** Pull the selected parts out of their runs into one free group that keeps')
end = text.index('\n  const clearAll = () => {', start)
old = text[start:end]
new = '''  /** Pull the selected parts out of their runs into one free group that keeps
   *  their positions. It takes the layer slot of the topmost run involved. */
  const groupSelected = useCallback(() => {
    const result = groupItemSelection(
      groupsRef.current,
      selectedIds,
      widthsRef.current,
      uid,
    );
    if (!result) return;
    snapshot();
    for (const id of result.shiftedGroupIds) instantRef.current.add(id);
    setGroups(result.groups);
    setSelectedIds(result.selectedIds);
  }, [selectedIds, snapshot]);

  /** Split a free group back into single runs at their current positions, in the same layer slot. */
  const ungroupSelected = useCallback(() => {
    const g = selectedGroup;
    if (!g) return;
    const result = ungroupFreeGroup(
      groupsRef.current,
      g.id,
      widthsRef.current,
      uid,
    );
    if (!result) return;
    snapshot();
    for (const id of result.newGroupIds) instantRef.current.add(id);
    setGroups(result.groups);
  }, [selectedGroup, snapshot]);

  const nudge = useCallback(
    (dx: number, dy: number) => {
      if (selectedIds.length === 0 && selectedFrameId) {
        const result = nudgeFrameWithGroups(
          framesRef.current,
          groupsRef.current,
          selectedFrameId,
          widthsRef.current,
          dx,
          dy,
        );
        if (!result) return;
        snapshotFor("nudge:frame:" + selectedFrameId);
        for (const id of result.movedGroupIds) instantRef.current.add(id);
        setFrames(result.frames);
        setGroups(result.groups);
        return;
      }
      if (selectedIds.length === 0) return;
      snapshotFor("nudge:" + selectedIds.join(","));
      setGroups((prev) => nudgeItemGroups(prev, selectedIds, dx, dy));
    },
    [selectedIds, selectedFrameId, snapshotFor],
  );
'''
text = text[:start] + new + text[end:]
path.write_text(text)
