# Release readiness

web_canvas is now evaluated as a product flow, not only as a collection of isolated editor features.

## Current level

The current target is **personal-use beta**:

- appropriate for the author to use on real prototype projects while continuing development;
- local-first project storage, JSON export/import, Preview, Navigation, Architecture Flow, and Undo/Redo are available;
- CI protects unit/build behavior and browser-level editor behavior;
- it is not yet positioned as a zero-guidance tool for unrelated users or as a system for irreplaceable production data.

## Practical golden-path gate

`e2e/practical-journey.e2e.ts` exercises one continuous user journey through the real UI:

1. start the editor and create a new managed project;
2. use the seeded Canvas UI and add a second Screen;
3. create a Navigation route from the `Favorite` button to that Screen;
4. execute that route in Preview;
5. describe the same flow in Architecture with `Screen → Action → API → Screen` and bind the Canvas source;
6. rename and explicitly save the managed project;
7. reload the browser and verify Navigation + Architecture survive;
8. export the saved project as a versioned JSON file;
9. import that file as a separate managed project and verify the same design survives.

This test is intentionally cross-feature. Its purpose is to catch failures at feature boundaries that isolated tests do not expose.

## Recovery gate

`e2e/recovery.e2e.ts` protects the two failure paths most likely to lose confidence in a local-first editor:

- a malformed managed-project import must not replace the active document, active Project ID, or Project Library; the Projects screen remains available and shows the import error so the author can immediately try another file;
- a local-storage quota failure must surface a persistent warning with a Project JSON backup action, and that export must contain the latest in-memory design even though browser persistence is still on the older snapshot.

The recovery tests intentionally compare persisted state before and after failure so error handling cannot silently mutate or partially replace the working project.

## Promotion criteria

### Personal-use beta — current target

Required:

- practical golden-path E2E passes;
- recovery E2E passes for malformed import and local-storage quota failure;
- main typecheck, unit tests, production build, and Playwright E2E pass;
- GitHub Pages deployment succeeds;
- no silent mutation when inspecting diagnostics or Architecture trace state;
- project can be recovered through versioned JSON export/import.

### Personal daily-use candidate — next

Before treating the editor as a dependable daily tool, add practical gates for:

- mobile end-to-end authoring rather than isolated mobile controls;
- larger multi-screen projects and repeated save/reload cycles;
- destructive-action recovery and clearer user-facing error states.

### General-user beta — later

Before handing the app to unrelated users without explanation, validate:

- first-run onboarding and discoverability;
- accessibility and keyboard/mobile interaction across the complete workflow;
- representative external-user usability sessions;
- documented recovery/backup guidance.

Backend, authentication, collaboration, and cloud sync are not release prerequisites for the current local-first product direction.
