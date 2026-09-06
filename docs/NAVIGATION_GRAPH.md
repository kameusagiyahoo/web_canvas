# Visual navigation graph

## Status

The visual navigation graph is implemented and remains a **derived view of the existing document**, not a second navigation model.

The graph now supports two levels of interaction:

1. overview / diagnostics / screen focus / Preview;
2. editing an **existing** item, slot, or swipe route by changing its destination or removing it.

Graph edits write back to the existing navigation fields and enter the normal Undo/Redo history. The graph itself is still never persisted.

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
  ├─ screen selection/focus
  ├─ route selection
  ├─ route destination/remove controls
  └─ per-screen Preview entry
 ↓
lib/navigation-graph-edit.ts
  └─ write edits back to existing Item.action / Item.actions / Frame.swipe
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

## Edge presentation and editing

The UI distinguishes route sources without introducing new document semantics:

- solid route — item-level tap/action;
- dotted route — per-slot action;
- dashed route — screen swipe;
- back action — represented as Preview-stack behavior rather than a normal screen edge.

Selecting an existing route opens a compact route editor. It can:

- change the target screen;
- change an item/slot route to `BACK_TARGET`;
- remove the route;
- update swipe destinations without allowing `BACK_TARGET` for swipe navigation.

All edits are performed through `lib/navigation-graph-edit.ts`, which mutates the same navigation fields used by the existing inspectors and Preview. `app/page.tsx` only coordinates snapshot timing and React state updates.

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

## Remaining product decision: creating new connections

Editing an **existing** route is now unambiguous because the route already identifies its underlying source item, slot, or swipe direction.

Creating a brand-new line by dragging Screen A to Screen B is different: a screen-to-screen line alone does not say which interaction should cause that transition.

A new connection therefore needs one of these semantics:

1. assign the route to an existing item/slot selected by the user;
2. assign it to a swipe direction;
3. create a new explicit navigation control in the source screen;
4. present a chooser after the line is drawn.

That decision should be made before drag-to-connect creation is implemented. It prevents the graph from inventing navigation behavior that is not represented in the screen UI.

## Automated coverage

- `lib/navigation-graph.test.ts` covers derivation, reachability, diagnostics and deterministic layout.
- `lib/navigation-graph-edit.test.ts` covers item, slot and swipe mutation, removal, and back-stack restrictions.
- Playwright covers desktop/mobile graph entry, screen selection, graph-to-Preview behavior, route retargeting, persistence, and Undo restoration.

The navigation graph route-editing implementation passed type checking, all Vitest tests, the production static build and Playwright E2E before being committed to `main`.
