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
- [ ] Improve mobile preview/navigation workflow.
- [ ] Add practical mobile layer/reordering controls.

## Priority S — Maintainability

- [ ] Stop adding unrelated responsibilities directly to `app/page.tsx`.
- [ ] Extract frame/screen commands when implementing mobile screen management.
- [ ] Keep undo/redo behavior consistent for desktop and mobile commands.
- [ ] Avoid parallel mobile-only business logic when an existing desktop operation can be shared.

## Priority A — Reliability

- [ ] Add focused tests for extracted frame/screen operations.
- [ ] Add E2E coverage for core project flows: edit, save/export, import, multi-screen management and preview.
- [ ] Add project format/version migration strategy before the `Doc` schema changes substantially.
- [ ] Review localStorage failure/size behavior and recovery UX.

## Priority A — Project metadata

- [x] Update `package.json` repository metadata from the original repository to `kameusagiyahoo/web_canvas`.
- [x] Update homepage metadata to `https://kameusagiyahoo.github.io/web_canvas/`.
- [x] Keep `LICENSE`, `NOTICE`, and required attribution intact.

## Priority B — Security / cloud

- [ ] Revisit browser-stored AI API keys before the app is used by untrusted/public users.
- [ ] If needed, move provider calls behind a Cloudflare Worker and use server-side secrets.
- [ ] Do not add a backend, authentication, or DB before a concrete use case requires it.

## Priority B — Product direction

- [ ] Evaluate a visual navigation graph after basic mobile screen management works.
- [ ] Consider cloud save/sync only after local/project-file workflows are stable.

## Already available — do not duplicate

- JSON project export via `saveProject()`.
- JSON project import via `readProject()`.
- Existing `Frame` model for screens.
- Existing undo/redo snapshots include frames and groups.
