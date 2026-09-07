# Visual navigation graph

## Status

The visual navigation graph is implemented as a **derived view of the existing document**, not a second navigation model.

The graph now supports five levels of interaction:

1. overview / diagnostics / screen focus / Preview;
2. editing an **existing** item, slot, or swipe route by changing its destination, transition, or removing it;
3. creating a **new** route by dragging from one screen to another and then choosing the underlying trigger;
4. searching screen names in larger graphs without mutating or re-laying out the document;
5. jumping from a selected route back to its source screen/item for normal editor work.

Graph edits and graph-created routes write back to the existing navigation fields and enter the normal Undo/Redo history. Search and source-location are presentation/navigation operations only. The graph itself is still never persisted.

## Source of truth

The document already contains all navigation data:

- `Frame` = one screen / graph node;
- `Item.action` = one item-level navigation edge;
- `Item.actions` = per-slot edges for tabs, navigation bars, rails, app-bar icons and similar components;
- `Frame.swipe` = swipe navigation edges between screens;
- `BACK_TARGET` = Preview stack behavior.

No backend, database, graph schema, or mobile-only navigation state was added.

## Implementation

```text
Doc
 ↓
lib/navigation-graph.ts
  ├─ derive nodes and edges
  ├─ classify item / slot / swipe routes
  ├─ calculate reachability and diagnostics
  └─ calculate deterministic left-to-right layout
 ↓
components/NavigationGraph.tsx
  ├─ full-screen graph UI
  ├─ screen-name search/highlighting
  ├─ screen selection/focus
  ├─ route selection/editing
  ├─ source-location action
  ├─ drag-to-connect creation
  ├─ trigger + transition chooser
  └─ per-screen Preview entry
 ↓
lib/navigation-graph-edit.ts
  ├─ edit existing Item.action / Item.actions / Frame.swipe
  ├─ enumerate unused trigger slots
  └─ create routes through those same document fields
 ↓
normal Doc state + Undo/Redo
```

The graph has no independently persisted nodes or edges.

## UI entry points

### Desktop

The main toolbar includes Screen flow / 画面フロー next to Preview.

Selecting a node returns to the editor and focuses the same `Frame`. Each node also has a Preview action that starts Preview from that screen.

### Mobile

The existing Screens sheet includes Screen flow / 画面フロー. The graph opens full-screen so the phone UI does not attempt to show the graph beside the canvas.

Desktop and mobile use the same derived graph adapter and the same document mutations.

## Screen search

The graph header includes a screen-name search field. Search does not filter the underlying graph model or recompute navigation semantics. Instead, matching nodes remain fully visible while non-matches are visually de-emphasized, preserving the deterministic layout and surrounding route context.

The UI shows the match count and an explicit empty-result message when no screen name matches. Search does not write to `Doc`, browser storage, or Undo/Redo history.

This is intentionally a lightweight large-project aid. Manual/pinned layouts remain unnecessary until real project sizes show that deterministic layout plus search is insufficient.

## Existing route editing

The UI distinguishes route sources without introducing new document semantics:

- solid route — item-level tap/action;
- dotted route — per-slot action;
- dashed route — screen swipe;
- back action — represented as Preview-stack behavior rather than a normal screen edge.

Selecting an existing route opens a compact route editor. It can:

- jump back to the route's source UI with **Edit source / 元の部品を編集**;
- change the target screen;
- change an item/slot route to `BACK_TARGET`;
- change the transition for item/slot routes;
- remove the route;
- update swipe destinations without allowing `BACK_TARGET` for swipe navigation.

The source-location action closes the graph and focuses the source `Frame`. For item/slot routes it also selects the underlying `Item` and opens the normal desktop inspector; for swipe routes it focuses the source screen without inventing a source item. Slot routes preserve the existing link identifier so normal action editing remains aligned with the selected slot.

Source location does not change `Doc`, does not write browser storage, and does not create an Undo/Redo entry.

Swipe transition semantics remain derived from the swipe direction rather than stored as a separate action transition.

## Creating a new route

Each screen node exposes a connector handle. Dragging that connector to another screen does **not** immediately invent behavior. It opens a trigger chooser for the source screen.

Available trigger choices are derived from unused document interaction slots:

1. an existing item that does not yet have `Item.action`;
2. an unused per-slot entry in `Item.actions`;
3. an unused `Frame.swipe` direction;
4. an explicitly created Button placed on the source screen.

For item, slot, and newly created Button routes, the user then chooses one of the existing `TRANSITIONS` values before the route is committed. Swipe routes use the transition implied by the swipe direction.

The new Button path reuses the existing shared part-placement rules instead of introducing graph-specific placement logic.

This keeps the graph semantically honest: drawing Screen A → Screen B still results in a concrete interaction represented in the source screen/document.

## Undo/Redo

`app/page.tsx` takes a normal document snapshot before applying graph mutations. Route creation, retargeting, transition changes, and removal therefore participate in the same history stack as canvas/mobile edits.

Browser E2E coverage verifies that a graph-created route with a chosen transition can be undone and redone through the normal editor controls. Presentation-only graph operations such as search and source-location are verified not to mutate the stored document.

## Diagnostics

The derived adapter reports:

- action targets that reference a missing `Frame`;
- screens unreachable from the chosen start screen;
- non-start screens with no incoming navigation;
- duplicate/parallel routes between the same pair of screens.

Diagnostics do not silently repair the document.

## Layout

The implementation deliberately avoids a graph-layout dependency. `lib/navigation-graph.ts` computes a deterministic left-to-right layout using shortest-path depth from the start screen. Disconnected screens are placed in a final column.

This keeps bundle and dependency cost low. A third-party graph/layout package should only be introduced if richer interaction requirements justify it.

## Why the graph is not the source of truth

Persisting another graph model alongside `Frame`, `Item.action`, `Item.actions`, and `Frame.swipe` would require synchronization in both directions and create failure modes such as:

- a button points to Screen B while the graph says Screen C;
- deleting a screen leaves stale graph edges;
- mobile and desktop edit different navigation representations;
- project migrations must reconcile two copies of the same relationship.

Keeping the graph derived avoids these classes of inconsistency.

## Automated coverage

- `lib/navigation-graph.test.ts` covers derivation, reachability, diagnostics and deterministic layout.
- `lib/navigation-graph-edit.test.ts` covers existing item, slot and swipe mutation, removal, transition editing, and back-stack restrictions.
- `lib/navigation-graph-create.test.ts` covers unused trigger discovery, item/swipe/new-button creation, and chosen transition persistence.
- Playwright covers desktop/mobile graph entry, screen selection, graph-to-Preview behavior, existing-route edits, drag-created routes, transition selection, persistence, Undo/Redo, screen search without document mutation, and route-source location without document mutation.

The navigation graph creation/transition/search/source-location implementation passed type checking, Vitest, the production static build and Playwright E2E before being committed to `main`.

## Next graph work

The current graph is functionally complete for small-to-medium screen flows and now has search plus a direct route-to-editor path. Future work should be driven by observed usability needs rather than by adding another graph model. Candidates include:

- making diagnostics directly actionable by selecting/focusing the affected screen or route;
- manual/pinned node layout stored only as presentation metadata if deterministic layout plus search becomes insufficient;
- richer diagnostics such as dead ends or conflicting interaction intent.

Any future graph feature must continue writing navigation semantics through the existing document model.