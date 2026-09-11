# App Architecture Flow

## Purpose

The Architecture Flow is a semantic layer for describing what the app does between screens. It is intentionally separate from the existing Screen Flow navigation graph.

- Screen nodes are always derived from `Doc.frames`; they are never duplicated in architecture state.
- Existing UI navigation remains derived from `Item.action`, `Item.actions`, and `Frame.swipe`.
- `Doc.architecture` stores only semantic architecture nodes/links that cannot be inferred from the visual editor.
- Persisted semantic node kinds are `action` and design-only `api`.
- Architecture links are descriptive today; they do **not** change Preview navigation or invent hidden UI behavior.

This keeps one source of truth for screens/navigation while creating a safe extension point for later `api`, `agent`, or `database` nodes.

## Current model

```text
Screen (derived from Frame)
       |
       v
Action (persisted semantic node)
       |
       v
API (design-only semantic node)
       |
       v
Screen / Action / API
```

`ArchitectureFlow` is additive and versioned independently inside the document:

- `version: 1`
- `nodes`: Action and API nodes
- `edges`: semantic links whose endpoints reference a Frame, Action, or API
- API nodes store a display name, HTTP method, and path only; they never execute network requests

No manual graph coordinates are persisted. Layout remains a UI concern until real projects demonstrate a need for pinned positions.

## Visual graph

The editor now renders the combined Screen + Action + API model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action and API nodes are persisted semantic nodes. The graph supports direct node-to-node connection mode and edge selection/deletion, while the detailed forms remain available for labeled links and Action management. Graph coordinates are still UI-only and are recalculated from the current topology. Node-name search and Screen/Action/API kind filtering dim non-matching nodes without changing the deterministic layout or persisted document; clicking a node outside connect mode provides a transient focus highlight. View-only zoom controls support incremental zoom and Fit to view; clicking or diagnostically focusing a node centers it in the graph viewport without persisting viewport state.

The same derived graph exposes Action diagnostics for disconnected Actions, missing incoming flow, missing outgoing flow, and directed cycles. API nodes are also diagnosed when they are completely disconnected, when duplicate API nodes describe the same HTTP method + path, or when they participate in a directed cycle. It also detects preserved semantic links whose source or target Screen/Action/API endpoint no longer exists. Node issues focus the affected node; broken-link issues select the preserved edge in the editor so the user can inspect or explicitly delete it. Merely selecting diagnostics never mutates project data.

## Editing and persistence

The editor exposes **App architecture** on desktop and from the mobile Screens sheet. Action/link mutations:

- enter normal document Undo/Redo;
- autosave into the active local project;
- travel with JSON project export/import;
- require no backend or cloud service.

Deleting an Action also deletes architecture links incident to that Action. Deleting a Screen does not rewrite semantic links automatically; missing Screen/Action endpoints remain preserved as explicit architecture information and are surfaced as broken-link diagnostics rather than being silently guessed or removed.

## Next safe extension

Use the Screen → Action → API model in real projects before adding more node types. API nodes are intentionally descriptive only: no fetch, credentials, request body, response schema, or execution state is attached yet. A later `agent` or `database` node should only be added after a concrete design need appears. Do not make Architecture Flow a second source of truth for Screen navigation.
