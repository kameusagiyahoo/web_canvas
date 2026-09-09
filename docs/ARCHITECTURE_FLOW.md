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

## Editing and persistence

The editor exposes **App architecture** on desktop and from the mobile Screens sheet. Action/link mutations:

- enter normal document Undo/Redo;
- autosave into the active local project;
- travel with JSON project export/import;
- require no backend or cloud service.

Deleting an Action also deletes architecture links incident to that Action. Deleting a Screen does not currently rewrite semantic links automatically; missing Screen endpoints are preserved as explicit architecture information for a later diagnostics pass rather than silently guessing intent.

## Next safe extension

After Action nodes have real usage, extend the semantic node union one kind at a time (`api`, then optionally `agent`/`database`) and add diagnostics before adding execution semantics. Do not make Architecture Flow a second source of truth for Screen navigation.
