# Architecture

## Overview

`web_canvas` is a client-side Next.js/React editor for composing Material 3-style screens. `app/page.tsx` remains the main React coordinator, while document mutations, persistence, preview calculations and an increasing share of canvas geometry now live in independently testable modules under `lib/`.

## Runtime and deployment

- Next.js static export
- React client-side editor
- TypeScript
- Tailwind/PostCSS toolchain
- GitHub Pages deployment target
- No required application backend for the current editor

## Core document model

The editor uses one document model shared by desktop and mobile UI.

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

The type/model definitions and layout constants are centered in `lib/tokens.ts`.

## Main application responsibility

`app/page.tsx` is primarily the UI/controller boundary. It still coordinates React state, event lifecycles, animation and component composition, but domain calculations should no longer be added there when they can be expressed as reusable pure operations.

The main extracted boundaries are now:

- `lib/frame-commands.ts` — screen/frame document mutations
- `lib/layer-commands.ts` — layer ordering
- `lib/item-commands.ts` — item delete/duplicate/patch operations
- `lib/group-commands.ts` — group/ungroup and nudge operations
- `lib/history.ts` — bounded undo/redo stack behavior
- `lib/canvas-selection.ts` — item rectangles and marquee selection
- `lib/canvas-drag.ts` — frame/group drag coordinate updates
- `lib/canvas-magnet.ts` — magnetic snap and alignment-guide geometry
- `lib/part-drag.ts` — detach/reinsert mutations during part dragging
- `lib/canvas-viewport.ts` — client/world transforms, fit/focus, pan, wheel and pinch camera calculations
- `lib/part-placement.ts` — shared frame-aware sizing plus mobile picker positioning, collision avoidance and no-frame centering
- `lib/drop-placement.ts` — free-drop viewport validation, target-frame resolution and finalized group placement
- `lib/preview-session.ts` — preview start resolution and camera calculation
- `lib/storage.ts` — safe browser persistence, restoration and failure classification
- `lib/project.ts` — versioned project serialization, parsing and migration

This keeps desktop and mobile presentation different where useful while preserving one set of editing semantics.

## Presentation layer

Important component areas include:

- `components/M3Node.tsx` — rendered Material elements
- `components/Inspector.tsx` — desktop editing UI
- `components/PartsPalette.tsx` — part creation/palette UI
- `components/Layers.tsx` — layer presentation
- `components/Preview.tsx` — interaction preview
- `components/Mobile.tsx` — mobile inspector/settings/action bar and bottom sheets
- `components/MobileScreens.tsx` — mobile screen management
- `components/MobileParts.tsx` — mobile part selection
- `components/AiPanel.tsx` — AI-related UI
- theme/color panels — design-system controls

## Canvas interaction boundary

Canvas interaction is intentionally split between React orchestration and pure calculations.

```text
pointer / wheel / touch events       mobile Parts picker
            ↓                              ↓
       app/page.tsx  ──────────────────────┘
            ↓
┌──────────────────────────────┐
│ canvas-viewport              │  coordinate transforms / camera
│ canvas-selection             │  marquee geometry
│ canvas-drag                  │  frame/group movement
│ canvas-magnet                │  snap / guides
│ part-drag                    │  detach / snap insertion
│ part-placement               │  shared sizing / picker placement
│ drop-placement               │  final free-drop validation / placement
└──────────────────────────────┘
            ↓
       groups / frames
```

`page.tsx` owns event attachment, refs, React state, undo timing and animation timing; geometry, target-frame selection, picker positioning and document transformations are kept outside React so they can be unit tested.

## Persistence

The current primary browser persistence is `localStorage`, accessed through `lib/storage.ts`. That module centralizes safe read/write/remove behavior, document/UI/draft storage, and unavailable/quota failure classification. The editor surfaces a recovery path when autosave fails.

Project-file portability is implemented in `lib/project.ts`. Project JSON uses an explicit format/version envelope and accepts legacy unversioned documents through the migration path. JSON export remains the recovery/portability mechanism even if cloud persistence is added later.

## History

Undo/redo snapshots contain both `groups` and `frames`, with document metadata included for full-document replacement operations. Desktop and mobile commands enter this same history path rather than maintaining separate mobile history semantics.

## Testing

The project has two complementary levels of automated coverage:

- Vitest for pure command, persistence, project, preview and canvas calculations.
- Playwright for core browser flows including multi-screen editing, preview navigation, project export/import and mobile undo/redo.

CI runs type checking, Vitest, the static build and Playwright coverage.

## AI layer

AI provider configuration and calls live primarily in `lib/ai.ts` with UI in `components/AiPanel.tsx`. Provider keys are currently supplied in the browser. This should be reconsidered before the editor is offered as an untrusted/public shared service; a server-side boundary such as Cloudflare Workers is the likely next step when secure managed AI calls become a concrete requirement.

## Mobile strategy

Mobile does not introduce a parallel document model. The same `Doc`, `Frame`, `Group`, and `Item` structures and shared commands are edited through mobile-specific presentation components. Mobile part creation uses `lib/part-placement.ts`, so frame sizing and placement semantics are not reimplemented inside the mobile UI.

```text
Mobile UI ─┐
           ├─→ shared commands / geometry ─→ Doc / history
Desktop UI ┘
```

## Refactoring rule

Avoid a wholesale rewrite of `app/page.tsx`. Move one coherent responsibility at a time when it creates a reusable or independently testable boundary. New product work should prefer the extracted modules instead of rebuilding equivalent logic inside mobile or desktop components.

## Future backend boundary

GitHub Pages remains the default deployment model. A backend should be introduced only for a concrete need such as secure shared AI calls, authentication, cloud projects or multi-user collaboration. Cloudflare Workers are the preferred first server-side boundary when that becomes necessary.
