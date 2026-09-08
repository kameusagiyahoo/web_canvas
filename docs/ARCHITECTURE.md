# Architecture

## Overview

`web_canvas` is a client-side Next.js/React editor for composing Material 3-style screens. `app/page.tsx` is the main React coordinator: it owns component composition, event lifecycles, refs, state transitions and animation timing. Reusable document mutations, persistence rules, geometry, derived views and export calculations live outside the page in independently testable modules.

## Runtime and deployment

- Next.js static export
- React client-side editor
- TypeScript
- Tailwind/PostCSS toolchain
- GitHub Pages deployment target
- No required application backend for the current editor

## Core document model

Desktop and mobile edit the same document model.

```text
Doc
├── frames[]   screen definitions
├── groups[]   positioned collections of items
├── theme / palette
├── title / brief
├── prompt-related metadata
└── platform/editor metadata

Frame
└── one editable screen

Group
└── one or more Items with layout/position information

Item
└── an individual Material component
```

The shared model, component specifications and layout constants are centered in `lib/tokens.ts`.

## `app/page.tsx` responsibility

`app/page.tsx` is the UI/controller boundary. New domain calculations should not be added there when they can be expressed as reusable commands, adapters or pure calculations.

The extracted boundaries now include:

### Document editing

- `lib/frame-commands.ts` — frame creation, duplication/deletion and preset resizing
- `lib/layer-commands.ts` — layer ordering
- `lib/item-commands.ts` — item delete/duplicate/patch operations
- `lib/group-commands.ts` — group/ungroup and nudge operations
- `lib/history.ts` — bounded undo/redo stack behavior
- `lib/tidy-session.ts` — tidy state and one-step tidy toggle semantics
- `lib/ai-commands.ts` — application of AI-written frame/item text to the document
- `lib/document-migrations.ts` — runtime compatibility for legacy editor documents
- `lib/document-language.ts` — translation of editor-provided default copy while preserving snapshot metadata
- `lib/editor-seed.ts` — deterministic desktop and mobile first-run seed construction

### Canvas and navigation

- `lib/canvas-selection.ts` — item rectangles and marquee selection
- `lib/canvas-drag.ts` — frame/group drag coordinate updates
- `lib/canvas-magnet.ts` — magnetic snap and alignment-guide geometry
- `lib/canvas-viewport.ts` — client/world transforms, visible-world bounds, fit/focus, pan, wheel and pinch calculations
- `lib/part-drag.ts` — detach/reinsert mutations during part dragging
- `lib/part-placement.ts` — shared frame-aware sizing, mobile picker positioning and collision avoidance
- `lib/drop-placement.ts` — free-drop viewport validation, target-frame resolution and finalized placement
- `lib/navigation-links.ts` — derived screen-action link geometry and link mutation
- `lib/navigation-graph.ts` — derived navigation nodes/edges, validation diagnostics, reachability and deterministic graph layout
- `lib/navigation-graph-edit.ts` — existing-route editing, trigger discovery, graph-created routes, and transition persistence through existing document fields
- `lib/run-radii.ts` — connected-run corner interpolation during drag/open-gap animation
- `lib/layer-selection.ts` — group-to-frame ownership and Layers-panel active-frame resolution
- `lib/measurement.ts` — measurement-item collection and width-change detection

### Project, preview and export

- `lib/preview-session.ts` — preview start resolution and camera calculation
- `lib/storage.ts` — safe current-document/UI/draft persistence and failure classification
- `lib/project.ts` — versioned project-file serialization, parsing and migration
- `lib/project-library.ts` — local multi-project records, active-project persistence and project CRUD/snapshot operations
- `lib/frame-export.ts` — PNG export readiness, dimensions, encoding and browser download
- `components/FrameExportLayer.tsx` — isolated offscreen 1:1 frame rendering for PNG export

This keeps presentation-specific React code in the page/components while placing reusable behavior behind testable boundaries.

## Presentation layer

Important component areas include:

- `components/M3Node.tsx` — rendered Material elements
- `components/Inspector.tsx` — desktop editing UI
- `components/PartsPalette.tsx` — desktop part creation/palette UI
- `components/Layers.tsx` — shared layer presentation
- `components/Preview.tsx` — interaction preview
- `components/NavigationGraph.tsx` — full-screen derived screen-flow UI with route editing and drag-to-connect creation
- `components/ProjectManager.tsx` — local project creation, switching, naming, duplication, import/export and deletion UI
- `components/Mobile.tsx` — mobile inspector/settings/action bar and bottom sheets
- `components/MobileScreens.tsx` — mobile screen management plus graph/project-library entry
- `components/MobileParts.tsx` — mobile part selection
- `components/AiPanel.tsx` — AI-related UI
- `components/FrameExportLayer.tsx` — export-only static frame renderer
- theme/color panels — design-system controls

## Canvas interaction boundary

Canvas interaction is intentionally split between React orchestration and pure calculations.

```text
pointer / wheel / touch events       mobile Parts picker
            ↓                              ↓
       app/page.tsx  ──────────────────────┘
            ↓
┌──────────────────────────────┐
│ canvas-viewport              │ coordinate transforms / camera
│ canvas-selection             │ marquee geometry
│ canvas-drag                  │ frame/group movement
│ canvas-magnet                │ snap / guides
│ part-drag                    │ detach / snap insertion
│ part-placement               │ shared sizing / picker placement
│ drop-placement               │ final free-drop validation / placement
│ navigation-links             │ derived navigation link geometry
│ navigation-graph             │ derived flow graph / diagnostics
│ navigation-graph-edit        │ route edit/create semantics
│ layer-selection              │ screen/layer ownership
│ measurement                  │ intrinsic width bookkeeping
└──────────────────────────────┘
            ↓
       groups / frames
```

`page.tsx` owns event attachment, refs, React state, undo timing and animation timing. Geometry, target resolution and document transformations remain independently testable.

## Persistence

The editor is local-first and currently requires no backend.

`lib/storage.ts` owns the compatibility/current-document layer in `localStorage`: the current `m3e:doc`, editor UI, draft-recovery data and AI settings, including safe read/write/remove behavior and quota/unavailable failure classification. Keeping `m3e:doc` means existing users and the JSON recovery path continue to work.

The multi-project layer is separate in `lib/project-library.ts`:

```text
localStorage
├─ m3e:doc                 current/compatibility document
├─ m3e:projects:v1         local project library
└─ m3e:project:active      active project id
```

Each managed project stores its own full `Doc`, name and created/updated timestamps. Editing autosaves the current `Doc` to both the compatibility current-document key and the active project snapshot. An explicit **Save now** action is also available for the active project.

Project switching snapshots the currently active `docRef` synchronously before activating another project. This closes the small timing window where a user could edit and immediately switch before the React autosave effect ran. Activating another project clears document-specific Undo/Redo/selection state, restores that project's desktop frame mode, then fits the canvas.

An existing pre-library `m3e:doc` is migrated into the local project library automatically. The local library remains device/browser-local; it is not account sync.

Project portability remains implemented by `lib/project.ts`. Project JSON has an explicit format/version envelope and accepts legacy unversioned documents through a migration path. Two file-open intents are deliberately distinct:

- **Project Manager → Open file** imports the JSON as a new managed project and preserves the project that was previously active.
- **Toolbar → Open project** retains the older replace-current workflow and asks for confirmation before replacing the current document.

JSON export remains the recovery/portability mechanism even if cloud persistence is added later.

## History

Undo/redo snapshots contain both `groups` and `frames`, with document metadata included for full-document replacement operations. Desktop, mobile, and navigation-graph commands enter the same history path. Language translation also preserves snapshot metadata, so switching editor language does not weaken whole-document undo information.

History is intentionally project-local in practice: switching managed projects clears the editor's current undo/redo stacks rather than allowing an Undo command to cross project boundaries.

## Navigation model

Navigation remains part of the existing document rather than a parallel graph structure:

- `Item.action` — item-level navigation
- `Item.actions` — per-slot navigation
- `Frame.swipe` — screen swipe navigation
- `BACK_TARGET` — preview stack behavior

Two derived presentations consume those same fields:

```text
Doc navigation fields
        │
        ├─→ lib/navigation-links.ts → editor arrows / action editing
        │
        └─→ lib/navigation-graph.ts → nodes / routes / diagnostics / layout
                                      ↓
                              NavigationGraph UI
                                      ↓
                           lib/navigation-graph-edit.ts
                                      ↓
                         same Item/Frame navigation fields
```

The graph is not persisted. `components/NavigationGraph.tsx` can select/focus screens, launch Preview, edit existing routes, and create new routes by dragging from a source screen to a target screen.

New graph connections do not create graph-owned semantics. After a drag, the user explicitly chooses an unused existing item, unused slot, unused swipe direction, or a newly created Button. Item/slot/button routes then choose one of the existing transition values. Swipe behavior remains tied to swipe direction.

The new-Button path reuses shared part placement. All graph mutations are snapshotted through the same Undo/Redo mechanism used by canvas and mobile edits. See `docs/NAVIGATION_GRAPH.md`.

## PNG export

PNG export has two responsibilities:

```text
app/page.tsx
  └─ chooses frame / toggles export state
       ↓
FrameExportLayer
  └─ renders clean static 1:1 frame offscreen
       ↓
lib/frame-export.ts
  └─ waits for render/fonts → encodes PNG → browser download
```

This prevents canvas zoom, selection outlines, drag state and in-flight animations from leaking into exported images.

## Testing

The project has two complementary levels of automated coverage:

- Vitest for document commands, storage, local project-library operations, project-file migration, preview, export, seeds, navigation graph/link derivation and canvas calculations.
- Playwright for core browser flows including multi-screen editing, preview navigation, project export/import, independent managed-project switching, safe project-manager import, mobile undo/redo, graph entry/editing, drag-to-connect creation, transition selection, and graph Undo/Redo.

CI runs type checking, Vitest, the static build and Playwright coverage. Dependency security was also audited; the Playwright version is pinned to a non-vulnerable release for the identified browser-download certificate advisory.

## AI layer

Provider configuration/request code lives primarily in `lib/ai.ts`; document mutation after a model response is isolated in `lib/ai-commands.ts`; UI lives in `components/AiPanel.tsx`.

Provider keys are still supplied and stored in the browser. That is acceptable for the current local/static workflow only when the user understands the exposure. It should be replaced by a server-side secret boundary before the app is offered as a managed public/shared AI service. Cloudflare Workers remain the preferred first server-side boundary when that becomes a concrete requirement.

## Mobile strategy

Mobile does not introduce a parallel document model. The same `Doc`, `Frame`, `Group`, and `Item` structures and shared commands are edited through mobile-specific presentation components.

```text
Mobile UI ─┐
           ├─→ shared commands / geometry ─→ Doc / history
Desktop UI ┘
```

Mobile part creation uses the same frame-aware placement rules as desktop placement, Layers/Undo/Redo operate through the shared document paths, and the navigation graph reuses the same derived adapter and mutation commands as desktop in a full-screen phone presentation. The mobile Screens sheet also links into the same `ProjectManager`; it does not maintain a mobile-only project store.

## Refactoring rule

Avoid a wholesale rewrite of `app/page.tsx`. Move one coherent responsibility at a time when it creates a reusable or independently testable boundary. New product work should use the extracted modules rather than rebuilding equivalent logic inside mobile, desktop, or graph components.

## Future backend boundary

GitHub Pages remains the default deployment model. A backend should be introduced only for a concrete need such as secure managed AI calls, authentication, cloud projects or multi-user collaboration. Cloudflare Workers are the preferred first server-side boundary when that becomes necessary.