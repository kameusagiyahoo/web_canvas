# Roadmap

## Phase 1 — Stabilize the independent project

Status: complete for the current static/local architecture.

- Keep GitHub Pages deployment working from this repository.
- Preserve the original MIT license and NOTICE requirements.
- Keep JSON project import/export compatible with the existing `Doc` model.
- Use an explicit project format/version and migration path.
- Keep browser persistence recoverable through project JSON export.
- Maintain typecheck, Vitest, static build and Playwright E2E coverage.
- Avoid unnecessary backend infrastructure.

## Phase 2 — Mobile editor expansion

Status: core mobile editing flow complete.

### Phase 2A: screen management

Goal: make multi-screen editing usable on a phone without introducing a second document model.

- Add a mobile `Screens` bottom sheet.
- List existing `Frame` objects.
- Select/focus a screen from the list.
- Add a new screen.
- Rename a screen.
- Duplicate a screen.
- Delete a screen safely, including links and parts owned by that screen.
- Make the active screen visually clear.

### Phase 2B: mobile composition

- Focus the canvas on the active screen.
- Add parts to the active screen from mobile UI.
- Reuse the same part/item model as desktop.
- Reuse common edit operations instead of creating mobile-only state logic.
- Reuse shared Layers and Undo/Redo semantics.

### Phase 2C: navigation and preview

- Configure actions between screens on mobile.
- Support per-slot actions for navigation components.
- Enter Preview from the active/selected screen.
- Keep Preview navigation on the same `Frame`/action model as desktop.
- Open the same derived visual navigation overview from the mobile Screens sheet.

## Phase 3 — Architecture cleanup driven by features

Status: the major reusable boundaries are extracted. `app/page.tsx` is now treated as the UI/controller coordinator rather than the home for new domain logic.

Completed boundary areas include:

- frame/screen creation, deletion, duplication and resizing
- item/group/layer editing commands
- document/history operations
- browser persistence and project migrations
- preview and PNG-export calculations
- canvas selection/drag/snap/placement/viewport geometry
- navigation-link and navigation-graph derivation
- tidy session behavior
- document language/seed construction
- layer ownership and measurement bookkeeping
- AI result application

Continue the same incremental rule for future features: do not rewrite `app/page.tsx` wholesale and do not add a second mobile-only domain model.

## Phase 4 — Visual architecture overview

Status: first read-only navigation graph baseline complete. See `docs/NAVIGATION_GRAPH.md`.

Implemented baseline:

- derive nodes from `Frame` objects;
- derive item, per-slot and swipe routes from `Item.action`, `Item.actions`, and `Frame.swipe`;
- treat `BACK_TARGET` as stack behavior rather than a destination screen;
- use a deterministic layout without a third-party graph dependency;
- show missing targets, unreachable/no-incoming screens and parallel-route diagnostics;
- select/focus an existing screen from a node;
- enter Preview directly from a graph node;
- expose the graph from the desktop toolbar and mobile Screens sheet;
- keep desktop/mobile on the same derived graph adapter;
- never persist a second graph source of truth;
- cover desktop and mobile graph entry with browser E2E tests.

Potential next graph work is intentionally separate from this baseline. Editable graph gestures, graph-driven action creation/removal, richer layout controls or large-project navigation should only be added when their interaction semantics are intentionally chosen. Any editable graph must write through the existing navigation fields and shared commands.

## Phase 5 — Optional secure/cloud expansion

Only when a concrete use case requires it:

- Cloudflare Worker for server-side AI/API handling and secret storage
- cloud project persistence/sync
- authentication
- multi-user projects/collaboration
- database/API layer

The current AI provider keys still live in browser storage. Moving managed AI calls behind a secure server-side boundary is the next architecture change that requires external service configuration and secret handling.

GitHub Pages remains the default deployment model until one of these requirements is intentionally adopted.
