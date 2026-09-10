# App Architecture Flow

## Purpose

The Architecture Flow is a semantic layer for describing what the app does between screens. It is intentionally separate from the existing Screen Flow navigation graph.

- Screen nodes are always derived from `Doc.frames`; they are never duplicated in architecture state.
- Existing UI navigation remains derived from `Item.action`, `Item.actions`, and `Frame.swipe`.
- `Doc.architecture` stores only semantic architecture nodes/links that cannot be inferred from the visual editor.
- The first persisted semantic node kind is `action`.
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
Screen / Action
```

`ArchitectureFlow` is additive and versioned independently inside the document:

- `version: 1`
- `nodes`: Action nodes
- `edges`: semantic links whose endpoints reference either a Frame or Action

No manual graph coordinates are persisted. Layout remains a UI concern until real projects demonstrate a need for pinned positions.

## Visual graph

The editor now renders the combined Screen + Action model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action nodes remain the only persisted semantic nodes. The graph supports direct node-to-node connection mode and edge selection/deletion, while the detailed forms remain available for labeled links and Action management. Graph coordinates are still UI-only and are recalculated from the current topology.

The same derived graph now exposes Action diagnostics for disconnected Actions, missing incoming flow, missing outgoing flow, and directed cycles. It also detects preserved semantic links whose source or target Screen/Action endpoint no longer exists. Action issues focus the affected node; broken-link issues select the preserved edge in the editor so the user can inspect or explicitly delete it. Merely selecting diagnostics never mutates project data.

## Editing and persistence

The editor exposes **App architecture** on desktop and from the mobile Screens sheet. Action/link mutations:

- enter normal document Undo/Redo;
- autosave into the active local project;
- travel with JSON project export/import;
- require no backend or cloud service.

Deleting an Action also deletes architecture links incident to that Action. Deleting a Screen does not rewrite semantic links automatically; missing Screen/Action endpoints remain preserved as explicit architecture information and are surfaced as broken-link diagnostics rather than being silently guessed or removed.

## Next safe extension

Use the visual Action flow and diagnostics in real projects first. Broken semantic endpoints are now detected without silently rewriting project data. The next model extension remains an `api` node, and execution semantics should still wait for a concrete use case. Do not make Architecture Flow a second source of truth for Screen navigation.
