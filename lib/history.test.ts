import { describe, expect, it } from "vitest";
import { pushHistory, redoHistory, undoHistory } from "./history";

describe("history helpers", () => {
  it("pushes a snapshot, clears redo, and respects the maximum length", () => {
    const state = pushHistory({ past: [1, 2], future: [9] }, 3, 2);
    expect(state).toEqual({ past: [2, 3], future: [] });
  });

  it("undo moves the current value to redo without mutating the input", () => {
    const original = { past: ["a", "b"], future: [] as string[] };
    const result = undoHistory(original, "current");
    expect(result.value).toBe("b");
    expect(result.state).toEqual({ past: ["a"], future: ["current"] });
    expect(original).toEqual({ past: ["a", "b"], future: [] });
  });

  it("redo moves the current value back to undo", () => {
    const result = redoHistory({ past: ["a"], future: ["b", "c"] }, "current");
    expect(result.value).toBe("c");
    expect(result.state).toEqual({ past: ["a", "current"], future: ["b"] });
  });

  it("returns null when there is nothing to undo or redo", () => {
    const state = { past: [] as number[], future: [] as number[] };
    expect(undoHistory(state, 1)).toEqual({ state, value: null });
    expect(redoHistory(state, 1)).toEqual({ state, value: null });
  });
});
