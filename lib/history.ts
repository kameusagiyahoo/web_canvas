export type HistoryState<T> = {
  past: T[];
  future: T[];
};

/**
 * Push a snapshot onto the undo stack and clear redo history.
 * The input arrays are never mutated.
 */
export function pushHistory<T>(
  state: HistoryState<T>,
  snapshot: T,
  maxEntries = 100,
): HistoryState<T> {
  const limit = Math.max(1, Math.floor(maxEntries));
  const past = [...state.past, snapshot];
  return {
    past: past.length > limit ? past.slice(past.length - limit) : past,
    future: [],
  };
}

export type HistoryStep<T> = {
  state: HistoryState<T>;
  value: T | null;
};

/**
 * Pop one undo snapshot and move the caller's current value to redo history.
 */
export function undoHistory<T>(state: HistoryState<T>, current: T): HistoryStep<T> {
  if (state.past.length === 0) return { state, value: null };
  const value = state.past[state.past.length - 1];
  return {
    value,
    state: {
      past: state.past.slice(0, -1),
      future: [...state.future, current],
    },
  };
}

/**
 * Pop one redo snapshot and move the caller's current value back to undo history.
 */
export function redoHistory<T>(state: HistoryState<T>, current: T): HistoryStep<T> {
  if (state.future.length === 0) return { state, value: null };
  const value = state.future[state.future.length - 1];
  return {
    value,
    state: {
      past: [...state.past, current],
      future: state.future.slice(0, -1),
    },
  };
}
