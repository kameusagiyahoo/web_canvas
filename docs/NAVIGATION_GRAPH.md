# Visual navigation graph evaluation

## Decision

A visual navigation graph is a good fit for `web_canvas`, but it should be a **derived view of the existing document**, not a second navigation model.

The current document already contains the information needed to build the graph:

- `Frame` = one screen / graph node.
- `Item.action` = one item-level navigation edge.
- `Item.actions` = per-slot edges for tabs, navigation bars, rails, app-bar icons and similar components.
- `Frame.swipe` = swipe navigation edges between screens.
- `BACK_TARGET` = preview stack behavior; it should be shown as a back action rather than treated as an edge to another `Frame`.

This means a graph can be added without a backend, database, schema fork, or duplicate mobile-only state.

## Recommended first version

The first graph should be deliberately small and read-only:

1. Render every `Frame` as a node.
2. Derive edges from the actions already stored in the document.
3. Distinguish item/slot actions from swipe actions visually.
4. Selecting a graph node should select/focus the same `Frame` in the editor.
5. Selecting an edge may identify its source item/slot and destination, but should not introduce a separate edge record.
6. Recompute the graph from the current document after edits and undo/redo.

This provides an architecture overview without creating new document semantics.

## Why not make the graph the source of truth?

If the graph stored its own nodes and edges in parallel with `Frame`, `Item.action`, `Item.actions`, and `Frame.swipe`, every edit would need synchronization in both directions. That would create failure modes such as:

- a button points to Screen B while the graph says Screen C;
- deleting a screen leaves stale graph edges;
- mobile and desktop edit different navigation representations;
- project migration must reconcile two copies of the same relationship.

Keeping the graph derived avoids these problems and preserves the existing shared `Doc` model.

## Derived graph model

A graph adapter can expose a view model similar to:

```ts
type NavigationNode = {
  frameId: string;
  label: string;
};

type NavigationEdge = {
  id: string;
  fromFrameId: string;
  toFrameId: string;
  source: "item" | "slot" | "swipe";
  itemId?: string;
  slot?: string;
  swipe?: "left" | "right" | "up" | "down";
  transition?: Transition;
};
```

These values should be calculated from `Doc`; they should not be persisted as another project format.

## Editing through the graph later

If graph editing is added after the read-only overview proves useful, graph gestures should call the same shared navigation operations used by the inspectors. Examples:

- connect Screen A to Screen B → patch an existing item/slot action;
- change transition → patch that existing action;
- remove an edge → clear that action;
- swipe edge edit → patch `Frame.swipe`.

The graph UI therefore remains a presentation/controller layer over the shared document commands.

## Mobile behavior

A phone screen does not have enough space for a permanently visible graph plus the canvas. A later mobile implementation should therefore use a full-screen or bottom-sheet graph mode, with node selection returning to/focusing the chosen screen.

The same derived graph data should serve desktop and mobile.

## Implementation boundary

A likely structure is:

```text
Doc
 ↓
lib/navigation-graph.ts       derive nodes / edges / validation
 ↓
components/NavigationGraph   presentation and selection
 ↓
existing frame/action commands
```

No external graph library is required for the first version. A simple deterministic layout is sufficient for an overview. A third-party graph package should only be introduced if interaction requirements later justify its dependency and bundle cost.

## Validation opportunities

The derived adapter can also flag document problems without changing the source data:

- action target references a missing `Frame`;
- unreachable screens from a chosen start screen;
- screens with no incoming navigation;
- duplicate/parallel edges between the same screens;
- back-only flows that depend on preview history.

These checks could become useful architecture diagnostics later.

## Status

Evaluation complete. The recommended next product step is a **derived, read-only navigation overview**. Actual graph UI implementation is intentionally deferred until it is chosen as the next feature; it is not required for the current editor or GitHub Pages deployment.
