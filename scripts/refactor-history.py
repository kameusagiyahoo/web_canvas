from pathlib import Path

page = Path("app/page.tsx")
text = page.read_text()

anchor = 'import { barSlotOf, carryFrame, pullInto, tidyFrame } from "@/lib/tidy";\n'
addition = 'import { pushHistory as pushUndoHistory, redoHistory, undoHistory } from "@/lib/history";\n'
if addition not in text:
    if anchor not in text:
        raise SystemExit("history import anchor not found")
    text = text.replace(anchor, anchor + addition, 1)

old_snapshot = '''  const snapshot = useCallback((withMeta = false) => {
    setQuickUndo(false);
    pastRef.current.push(current(withMeta));
    if (pastRef.current.length > HISTORY_MAX) pastRef.current.shift();
    futureRef.current = [];
    bumpHistory((v) => v + 1);
  }, []);
'''
new_snapshot = '''  const snapshot = useCallback((withMeta = false) => {
    setQuickUndo(false);
    const next = pushUndoHistory(
      { past: pastRef.current, future: futureRef.current },
      current(withMeta),
      HISTORY_MAX,
    );
    pastRef.current = next.past;
    futureRef.current = next.future;
    bumpHistory((v) => v + 1);
  }, []);
'''
if old_snapshot not in text:
    raise SystemExit("snapshot block not found")
text = text.replace(old_snapshot, new_snapshot, 1)

old_undo = '''  const undo = useCallback(() => {
    setQuickUndo(false);
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(current(!!prev.meta));
    restore(prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(current(!!next.meta));
    restore(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
'''
new_undo = '''  const undo = useCallback(() => {
    setQuickUndo(false);
    const prev = pastRef.current[pastRef.current.length - 1];
    if (!prev) return;
    const step = undoHistory(
      { past: pastRef.current, future: futureRef.current },
      current(!!prev.meta),
    );
    if (!step.value) return;
    pastRef.current = step.state.past;
    futureRef.current = step.state.future;
    restore(step.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current[futureRef.current.length - 1];
    if (!next) return;
    const step = redoHistory(
      { past: pastRef.current, future: futureRef.current },
      current(!!next.meta),
    );
    if (!step.value) return;
    pastRef.current = step.state.past;
    futureRef.current = step.state.future;
    restore(step.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
'''
if old_undo not in text:
    raise SystemExit("undo/redo block not found")
text = text.replace(old_undo, new_undo, 1)

page.write_text(text)
