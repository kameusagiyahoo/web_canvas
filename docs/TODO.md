# TODO

## Priority S — Mobile editing

- [ ] Add a mobile Screens entry and bottom sheet.
- [ ] List all document `Frame` objects on mobile.
- [ ] Select/focus a frame from mobile.
- [ ] Add a frame from mobile.
- [ ] Rename, duplicate and safely delete frames from mobile.
- [ ] Add parts to the active frame from mobile.
- [ ] Keep desktop and mobile on the same `Doc`, `Frame`, `Group`, and `Item` data model.

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

- [ ] Update `package.json` repository metadata from the original repository to `kameusagiyahoo/web_canvas` when project identity work begins.
- [ ] Update homepage metadata to the new GitHub Pages URL once deployment is confirmed stable.
- [ ] Keep `LICENSE`, `NOTICE`, and required attribution intact.

## Priority B — Security / cloud

- [ ] Revisit browser-stored AI API keys before the app is used by untrusted/public users.
- [ ] If needed, move provider calls behind a Cloudflare Worker and use server-side secrets.
- [ ] Do not add a backend, authentication, or DB before a concrete use case requires it.

## Priority B — Product direction

- [ ] Improve screen-to-screen action editing on mobile.
- [ ] Evaluate a visual navigation graph after basic mobile screen management works.
- [ ] Consider cloud save/sync only after local/project-file workflows are stable.

## Already available — do not duplicate

- JSON project export via `saveProject()`.
- JSON project import via `readProject()`.
- Existing `Frame` model for screens.
- Existing undo/redo snapshots include frames and groups.
