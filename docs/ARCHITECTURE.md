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
- `lib/run-radii.ts` — connected-run corner interpolation during drag/open-gap animation
- `lib/layer-selection.ts` — group-to-frame ownership and Layers-panel active-frame resolution
- `lib/measurement.ts` — measurement-item collection and width-change detection

### Project, preview and export

- `lib/preview-session.ts` — preview start resolution and camera calculation
- `lib/storage.ts` — safe browser persistence, restoration and failure classification
- `lib/project.ts` — versioned project serialization, parsing and migration
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
- `components/NavigationGraph.tsx` — full-screen, read-only screen-flow overview derived from the current document
- `components/Mobile.tsx` — mobile inspector/settings/action bar and bottom sheets
- `components/MobileScreens.tsx` — mobile screen management and graph entry
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
│ layer-selection              │ screen/layer ownership
│ measurement                  │ intrinsic width bookkeeping
└──────────────────────────────┘
            ↓
       groups / frames
```

`page.tsx` owns event attachment, refs, React state, undo timing and animation timing. Geometry, target resolution and document transformations remain independently testable.

## Persistence

Primary browser persistence is `localStorage`, accessed through `lib/storage.ts`. The storage boundary centralizes safe read/write/remove behavior, document/UI/draft storage, AI-settings storage, and unavailable/quota failure classification. The editor surfaces a JSON recovery path when autosave fails.

Project portability is implemented in `lib/project.ts`. Project JSON has an explicit format/version envelope and accepts legacy unversioned documents through a migration path. JSON export remains the recovery/portability mechanism even if cloud persistence is added later.

## History

Undo/redo snapshots contain both `groups` and `frames`, with document metadata included for full-document replacement operations. Desktop and mobile commands enter the same history path. Language translation also preserves snapshot metadata, so switching editor language does not weaken whole-document undo information.

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
```

The graph is not persisted. `components/NavigationGraph.tsx` is a read-only overview: selecting a screen returns to/focuses its existing `Frame`, and its Preview action reuses the existing Preview flow. Diagnostics include missing targets, unreachable/no-incoming screens and parallel routes. Desktop enters the graph from the toolbar; mobile enters it from the Screens sheet.

Direct graph editing is intentionally a future product decision. If added, it must mutate the same existing action fields rather than introduce graph-owned navigation data. See `docs/NAVIGATION_GRAPH.md`.

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

- Vitest for document commands, persistence, project migration, preview, export, seeds, navigation graph/link derivation and canvas calculations.
- Playwright for core browser flows including multi-screen editing, preview navigation, project export/import, mobile undo/redo, and desktop/mobile navigation-graph entry.

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

Mobile part creation uses the same frame-aware placement rules as desktop placement, Layers/Undo/Redo operate through the shared document paths, and the navigation graph reuses the same derived adapter as desktop in a full-screen phone presentation.

## Refactoring rule

Avoid a wholesale rewrite of `app/page.tsx`. Move one coherent responsibility at a time when it creates a reusable or independently testable boundary. New product work should use the extracted modules rather than rebuilding equivalent logic inside mobile or desktop components.

## Future backend boundary

GitHub Pages remains the default deployment model. A backend should be introduced only for a concrete need such as secure managed AI calls, authentication, cloud projects or multi-user collaboration. Cloudflare Workers are the preferred first server-side boundary when that becomes necessary.
