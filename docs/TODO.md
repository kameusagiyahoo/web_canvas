# TODO

## Priority S — Mobile editing

- [x] Add a mobile Screens entry and bottom sheet.
- [x] List all document `Frame` objects on mobile.
- [x] Select/focus a frame from mobile.
- [x] Add a frame from mobile.
- [x] Rename, duplicate and safely delete frames from mobile.
- [x] Add parts to the active frame from mobile.
- [x] Add mobile part size preset editing.
- [x] Add mobile part screen-to-screen action editing and transition selection.
- [x] Keep desktop and mobile on the same `Doc`, `Frame`, `Group`, and `Item` data model.
- [x] Add per-slot actions for tabs, navigation bars and app-bar icons on mobile.
- [x] Improve mobile preview/navigation workflow with per-screen preview entry and active-screen start.
- [x] Add practical mobile layer/reordering controls.

## Priority S — Maintainability

- [x] Establish `app/page.tsx` as the UI/controller boundary and keep reusable domain logic outside it.
- [x] Extract frame/screen document commands into testable helpers.
- [x] Extract frame preset resizing, dependent screen shifts and part re-layout into the shared frame command boundary.
- [x] Extract initial/next frame creation and new-frame camera centering into testable helpers.
- [x] Extract layer/reordering document commands into testable helpers.
- [x] Extract item delete/duplicate document commands into testable helpers.
- [x] Extract item patch/resize-alignment document commands into testable helpers.
- [x] Extract group/ungroup and nudge document commands into testable helpers.
- [x] Extract canvas item-rectangle and marquee-selection geometry into testable helpers.
- [x] Extract frame/group drag coordinate updates into testable helpers.
- [x] Extract canvas coordinate transforms, visible-world bounds, fit/focus, pan, wheel and pinch calculations into testable helpers.
- [x] Extract free-drop viewport rejection, target-frame selection and finalized group placement into testable helpers.
- [x] Extract mobile picker placement, occupied-row avoidance and no-frame centering into shared part-placement helpers.
- [x] Extract part-drag detach/snap mutations and magnetic snap/alignment-guide geometry into testable helpers.
- [x] Extract derived navigation-link geometry and action mutation into shared helpers.
- [x] Extract derived navigation-graph nodes, routes, diagnostics and deterministic layout.
- [x] Extract connected-run corner interpolation used during drag/open-gap animation.
- [x] Extract Layers-panel frame ownership/selection logic and measurement bookkeeping.
- [x] Extract tidy state/toggle behavior into a testable session helper.
- [x] Extract AI response application into document commands that preserve note history.
- [x] Extract PNG export readiness/encoding and isolate export-only rendering in `FrameExportLayer`.
- [x] Extract runtime legacy document migration from the page component.
- [x] Extract deterministic editor seed construction and document-language translation.
- [x] Extract reusable bounded undo/redo stack helpers with unit tests.
- [x] Wire the existing `app/page.tsx` frame/layer callers to the extracted command helpers incrementally.
- [x] Wire `app/page.tsx` frame creation and new-frame centering to shared frame/viewport helpers.
- [x] Wire `app/page.tsx` frame preset changes to the shared resize command while keeping history/animation/platform state in the UI layer.
- [x] Wire `app/page.tsx` item delete/duplicate callers to the extracted command helpers.
- [x] Wire `app/page.tsx` item patch/resize-alignment callers to the extracted command helper.
- [x] Wire `app/page.tsx` group/ungroup and item/frame nudge callers to the extracted command helpers.
- [x] Wire `app/page.tsx` marquee selection to the extracted canvas-selection helpers.
- [x] Wire `app/page.tsx` frame/group drag updates to the extracted canvas-drag helpers.
- [x] Wire `app/page.tsx` coordinate transforms, fit/focus and pan/zoom gestures to the extracted canvas-viewport helpers.
- [x] Wire `app/page.tsx` free-drop finalization to the extracted drop-placement helper.
- [x] Wire mobile `addPart()` to shared part-placement rules instead of mobile-only positioning logic.
- [x] Wire `app/page.tsx` part drag detach/snap and guide calculations to the extracted helpers.
- [x] Wire `app/page.tsx` history refs to the extracted history helpers without changing undo semantics.
- [x] Separate project JSON serialization/parsing from browser download/file APIs.
- [x] Extract preview start resolution and camera calculations into testable helpers.
- [x] Extract document/UI/draft/AI-settings localStorage access into tested storage helpers.
- [x] Centralize safe browser storage access and quota/unavailable failure classification.
- [x] Keep undo/redo behavior consistent for desktop and mobile commands.
- [x] Avoid parallel mobile-only business logic when an existing desktop operation can be shared.

## Priority A — Reliability / security hygiene

- [x] Add focused tests for extracted frame/screen and layer operations.
- [x] Add focused tests for frame preset resize no-op and dependent screen/group shifting.
- [x] Add focused tests for initial/next frame placement and frame-centering camera behavior.
- [x] Add focused tests for extracted item delete/duplicate operations.
- [x] Add focused tests for extracted item patch/resize-alignment operations.
- [x] Add focused tests for extracted group/ungroup and nudge operations.
- [x] Add focused tests for extracted canvas selection geometry.
- [x] Add focused tests for extracted canvas frame/group drag coordinates.
- [x] Add focused tests for extracted canvas viewport coordinate, fit and gesture calculations.
- [x] Add focused tests for free-drop viewport, target-frame and finalized placement behavior.
- [x] Add focused tests for mobile picked-part frame adaptation, collision avoidance and no-frame centering.
- [x] Add focused tests for extracted part drag and snap/alignment-guide behavior.
- [x] Add focused tests for navigation links, run radii, layer selection and measurement helpers.
- [x] Add focused tests for navigation graph derivation, reachability, diagnostics and layout.
- [x] Add focused tests for tidy-session, AI document commands, frame export, runtime migration, language translation and editor seeds.
- [x] Add focused tests for the extracted history stack operations.
- [x] Add focused tests for project serialization/parsing and preview session helpers.
- [x] Add focused tests for editor storage parsing, draft recovery and failure classification.
- [x] Add E2E coverage for core project flows: edit, save/export, import, multi-screen management and preview.
- [x] Add E2E coverage for desktop/mobile navigation-graph entry, frame selection and graph-to-Preview behavior.
- [x] Add project format/version migration strategy before the `Doc` schema changes substantially.
- [x] Surface storage write failures/recovery guidance in the editor UX.
- [x] Audit npm dependencies and remediate the identified high-severity Playwright browser-download certificate advisory.

## Priority A — Project metadata

- [x] Update `package.json` repository metadata from the original repository to `kameusagiyahoo/web_canvas`.
- [x] Update homepage metadata to `https://kameusagiyahoo.github.io/web_canvas/`.
- [x] Keep `LICENSE`, `NOTICE`, and required attribution intact.

## Priority B — Security / cloud

- [ ] Revisit browser-stored AI API keys before the app is used by untrusted/public users.
- [ ] If managed/public AI calls are needed, move provider calls behind a Cloudflare Worker and use server-side secrets.
- [ ] Do not add a backend, authentication, or DB before a concrete use case requires it.

## Priority B — Product direction

- [x] Evaluate a visual navigation graph after basic mobile screen management works; use a derived graph rather than a second source of truth. See `docs/NAVIGATION_GRAPH.md`.
- [x] Implement a derived read-only navigation overview without a second persisted graph model.
- [x] Add navigation diagnostics for missing targets, unreachable/no-incoming screens, and parallel routes.
- [x] Add desktop and mobile graph entry points plus per-screen Preview entry.
- [ ] Decide whether the graph should become editable; any graph edit must write through existing navigation fields/shared commands.
- [ ] Consider cloud save/sync only after there is a concrete cross-device/account requirement.

## Already available — do not duplicate

- JSON project export via `saveProject()`.
- JSON project import via `readProject()`.
- Existing `Frame` model for screens.
- Existing undo/redo snapshots include frames and groups.
- Navigation source of truth is already `Frame` + `Item.action` / `Item.actions` + `Frame.swipe`.
