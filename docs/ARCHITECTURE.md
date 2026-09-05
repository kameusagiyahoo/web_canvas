# Architecture

## Overview

`web_canvas` is a client-side Next.js/React editor for composing Material 3-style screens. The current application is primarily implemented as a large client component in `app/page.tsx`, supported by presentation components in `components/` and domain/helper modules in `lib/`.

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

## Main application responsibilities

`app/page.tsx` currently coordinates many responsibilities:

- document state (`frames`, `groups`, theme, language, metadata)
- selection
- frame and item editing
- drag/drop and pointer gestures
- pan/zoom
- alignment/snapping
- undo/redo history
- local persistence
- project import/export orchestration
- AI actions/settings
- preview
- desktop panel state
- mobile sheet state

This concentration is the main maintainability risk. It should be reduced incrementally as new features require shared logic.

## Presentation layer

Important component areas include:

- `components/M3Node.tsx` — rendered Material elements
- `components/Inspector.tsx` — desktop editing UI
- `components/PartsPalette.tsx` — part creation/palette UI
- `components/Layers.tsx` — layer presentation
- `components/Preview.tsx` — interaction preview
- `components/Mobile.tsx` — mobile inspector/settings/action bar and bottom sheets
- `components/AiPanel.tsx` — AI-related UI
- theme/color panels — design-system controls

## Persistence

The current primary browser persistence is `localStorage`. `app/page.tsx` owns document persistence keys and restoration behavior.

Project-file portability is already implemented separately in `lib/project.ts`:

- `saveProject(doc)` exports the document as JSON.
- `readProject(file)` parses and validates a project JSON file.

Project JSON should remain the recovery/portability path even if cloud persistence is added later.

## History

Undo/redo snapshots contain both `groups` and `frames`, with document metadata included for full-document replacement operations. New frame/screen operations should enter this same history path rather than implementing mobile-specific history.

## AI layer

AI provider configuration and calls live primarily in `lib/ai.ts` with UI in `components/AiPanel.tsx`. Provider keys are currently supplied in the browser. This is acceptable for the current local/static architecture but should be reconsidered before offering server-managed/shared AI functionality.

## Mobile strategy

Mobile must not introduce a parallel document model. The same `Doc`, `Frame`, `Group`, and `Item` structures should be edited through mobile-specific presentation components.

Near-term target:

```text
Mobile Screens sheet
        ↓
shared frame operations
        ↓
frames / groups / history
        ↑
Desktop editor
```

## Refactoring boundaries

Extract behavior only when it creates a reusable or independently testable boundary. Current priority order:

1. frame/screen operations
2. shared selection/edit commands
3. document/history commands
4. persistence
5. large canvas interaction concerns

Avoid a wholesale rewrite of `app/page.tsx`; migrate one coherent responsibility at a time.

## Future backend boundary

GitHub Pages remains the default deployment model. A backend should be introduced only for a concrete need such as secure shared AI calls, authentication, cloud projects or multi-user collaboration. Cloudflare Workers are the preferred first server-side boundary when that becomes necessary.
