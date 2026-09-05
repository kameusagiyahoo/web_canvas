from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()

old_import = 'import { deleteItemsFromGroups, duplicateItemSelection } from "@/lib/item-commands";'
new_import = 'import { deleteItemsFromGroups, duplicateItemSelection, patchItemInGroups } from "@/lib/item-commands";'
if old_import not in text:
    raise SystemExit("item command import not found")
text = text.replace(old_import, new_import, 1)

start = text.index('  /** Resizing a lone part keeps whatever it was lined up with on the frame:')
end = text.index('\n  const deleteSelected = useCallback(() => {', start)
new = '''  const patchSelected = (patch: Partial<Item>) => {
    if (!primaryId) return;
    const id = primaryId;
    snapshotFor(id + ":" + Object.keys(patch).join(","));
    setGroups((prev) => {
      const result = patchItemInGroups(
        prev,
        id,
        patch,
        framesRef.current,
        widthsRef.current,
        frameRef.current === "phone",
      );
      if (!result) return prev;
      for (const groupId of result.shiftedGroupIds) instantRef.current.add(groupId);
      return result.groups;
    });
    if (dragRef.current?.item.id === id) {
      dragRef.current.item = { ...dragRef.current.item, ...patch };
    }
  };
'''
text = text[:start] + new + text[end:]
path.write_text(text)
