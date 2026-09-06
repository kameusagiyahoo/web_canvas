# Visual navigation graph

## Status

The first visual navigation graph is implemented.

It is intentionally a **derived, read-only view of the existing document**, not a second navigation model. The graph recomputes from the current `Doc`, so edits, imports and undo/redo remain governed by the same source of truth used by the canvas and Preview.

## Source of truth

The current document already contains the navigation data:

- `Frame` = one screen / graph node.
- `Item.action` = one item-level navigation edge.
- `Item.actions` = per-slot edges for tabs, navigation bars, rails, app-bar icons and similar components.
- `Frame.swipe` = swipe navigation edges between screens.
- `BACK_TARGET` = preview stack behavior; it is counted/shown as a back action rather than stored as an edge to another `Frame`.

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
  ├─ screen selection/focus
  ├─ edge detail inspection
  └─ per-screen Preview entry
 ↓
existing Frame / action / Preview behavior
```

The graph has no independently persisted nodes or edges.

## UI entry points

### Desktop

The main toolbar includes a Screen flow / 画面フロー action next to Preview.

Opening it replaces the working area with a full-screen overview. Selecting a node returns to the editor and focuses the same `Frame`. Each node also has a Preview action that starts Preview from that screen.

### Mobile

The existing Screens sheet includes a full-width Screen flow / 画面フロー action. The graph opens full-screen so the phone UI does not attempt to show the graph beside the canvas.

Node selection returns to and focuses the selected screen. The same derived graph adapter is used by desktop and mobile.

## Edge presentation

The UI distinguishes route sources without introducing new document semantics:

- solid route — item-level tap/action;
- dotted route — per-slot action;
- dashed route — screen swipe;
- back action — shown as a node count because `BACK_TARGET` depends on Preview history rather than a destination `Frame`.

Selecting a route exposes its source/destination, source item or slot where applicable, and transition.

## Diagnostics

The derived adapter currently reports:

- action targets that reference a missing `Frame`;
- screens unreachable from the chosen start screen;
- non-start screens with no incoming navigation;
- duplicate/parallel routes between the same pair of screens.

Diagnostics do not mutate or repair the document automatically; they are architecture checks over the current source data.

## Layout

The first implementation deliberately avoids a graph-layout dependency. `lib/navigation-graph.ts` computes a deterministic left-to-right layout using shortest-path depth from the start screen. Disconnected screens are placed in a final column.

This is sufficient for an overview and keeps bundle/dependency cost low. A third-party graph/layout package should only be introduced if future interaction requirements justify it.

## Why the graph is not the source of truth

Persisting a second graph model alongside `Frame`, `Item.action`, `Item.actions`, and `Frame.swipe` would require two-way synchronization and create failure modes such as:

- a button points to Screen B while a graph edge says Screen C;
- deleting a screen leaves stale graph edges;
- mobile and desktop edit different navigation representations;
- project migrations must reconcile two copies of the same relationship.

Keeping the graph derived avoids these classes of inconsistency.

## Editing through the graph later

Direct graph editing is intentionally not part of this first version. If it is added later, gestures must call the same shared navigation mutations used by the existing inspectors rather than creating graph-owned data. For example:

- connect Screen A to Screen B → patch an existing item/slot action;
- change transition → patch that existing action;
- remove a route → clear that existing action;
- edit a swipe route → patch `Frame.swipe`.

That is a separate product interaction decision. The current implementation establishes the read-only overview and diagnostic boundary without committing to a graph-editing UX.

## Automated coverage

`lib/navigation-graph.test.ts` covers derivation, back actions, missing targets, reachability, parallel routes, preferred starts and deterministic layout.

Playwright coverage verifies both desktop and mobile graph entry, screen selection, and graph-to-Preview behavior. The implementation workflow passed type checking, all Vitest tests, the production static build and all browser E2E tests before committing the integration.
