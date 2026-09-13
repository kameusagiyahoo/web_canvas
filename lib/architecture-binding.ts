import type { ArchitectureActionNode } from "./tokens";

export type ArchitectureCanvasBindingState = {
  boundActions: ArchitectureActionNode[];
  selectedActionId: string;
  conflicted: boolean;
};

/**
 * Derive the Inspector-facing state for one Canvas Item without normalizing legacy or
 * imported duplicate bindings. A conflict deliberately has no selected Action so the
 * Inspector cannot silently hide which Action should own the Item.
 */
export function getArchitectureCanvasBindingState(
  actions: readonly ArchitectureActionNode[],
  itemId: string,
): ArchitectureCanvasBindingState {
  const boundActions = itemId
    ? actions.filter((action) => action.sourceItemId === itemId)
    : [];

  return {
    boundActions,
    selectedActionId: boundActions.length === 1 ? boundActions[0].id : "",
    conflicted: boundActions.length > 1,
  };
}
