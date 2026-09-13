import { describe, expect, it } from "vitest";
import type { ArchitectureActionNode } from "./tokens";
import { getArchitectureCanvasBindingState } from "./architecture-binding";

const actions: ArchitectureActionNode[] = [
  { id: "first", kind: "action", name: "First", sourceItemId: "button" },
  { id: "second", kind: "action", name: "Second" },
];

describe("architecture Canvas binding state", () => {
  it("reports an unbound Canvas item", () => {
    expect(getArchitectureCanvasBindingState(actions, "other")).toEqual({
      boundActions: [],
      selectedActionId: "",
      conflicted: false,
    });
  });

  it("selects the single Action bound to a Canvas item", () => {
    expect(getArchitectureCanvasBindingState(actions, "button")).toEqual({
      boundActions: [actions[0]],
      selectedActionId: "first",
      conflicted: false,
    });
  });

  it("does not silently choose one Action when imported data contains duplicate bindings", () => {
    const duplicated: ArchitectureActionNode[] = [
      actions[0],
      { id: "second", kind: "action", name: "Second", sourceItemId: "button" },
    ];

    expect(getArchitectureCanvasBindingState(duplicated, "button")).toEqual({
      boundActions: duplicated,
      selectedActionId: "",
      conflicted: true,
    });
  });
});
