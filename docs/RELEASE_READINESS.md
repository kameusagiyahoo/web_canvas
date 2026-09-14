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

## Mobile golden-path gate

`e2e/mobile-practical-journey.e2e.ts` verifies a complete authoring loop at a 390 × 844 phone viewport using the mobile UI rather than desktop-only controls:

1. create and activate a managed Project from the mobile Screen sheet;
2. add a Canvas part from the mobile Parts sheet;
3. add a second Screen and return to Home;
4. expand the grouped button run in Layers and select `Favorite`;
5. use the mobile Inspector to route `Favorite` to the second Screen with a Fade transition;
6. execute that route in Preview;
7. explicitly save the managed Project;
8. reload at phone size and verify the active Project, Screens, and Navigation route survive;
9. execute the same Preview route again after reload.

The mobile controls used in this journey expose stable accessible names for part choices, Screen choices, and Add Screen, so visible labels such as `Button`, `Home`, and `Add screen` can also be targeted consistently by assistive technology and browser automation.

## Persistence stress gate

`e2e/persistence-stress.e2e.ts` exercises one managed Project as it grows beyond the small two-Screen golden path:

1. establish a real `Favorite → Screen 2` Navigation route and matching `Screen → Action → API → Screen` Architecture flow;
2. grow the same Project to 10 Screens;
3. explicitly save the Project Library snapshot and reload the browser;
4. compare the complete working document with the saved Project snapshot after reload;
5. repeat the same process after growing to 12 Screens and again at 14 Screens;
6. verify the active Project ID and Project Library count never drift across cycles;
7. verify Navigation and Architecture semantics remain unchanged through every cycle;
8. execute the preserved Preview route after the third save/reload cycle.

The persistence gate deliberately uses exact document equality between the working `m3e:doc` and the active Project Library snapshot after each explicit save. This catches stale snapshots, partial writes, accidental project duplication, or cross-project state leakage that frame-count-only checks would miss.

## Promotion criteria

### Personal-use beta — current target

Required:

- practical golden-path E2E passes;
- recovery E2E passes for malformed import and local-storage quota failure;
- mobile golden-path E2E passes through authoring, Preview, save, and reload;
- persistence stress E2E passes through repeated 10/12/14-Screen save and reload cycles;
- main typecheck, unit tests, production build, and Playwright E2E pass;
- GitHub Pages deployment succeeds;
- no silent mutation when inspecting diagnostics or Architecture trace state;
- project can be recovered through versioned JSON export/import.

### Personal daily-use candidate — next

Before treating the editor as a dependable daily tool, add practical gates for:

- destructive-action recovery and clearer user-facing error states.

### General-user beta — later

Before handing the app to unrelated users without explanation, validate:

- first-run onboarding and discoverability;
- accessibility and keyboard/mobile interaction across the complete workflow;
- representative external-user usability sessions;
- documented recovery/backup guidance.

Backend, authentication, collaboration, and cloud sync are not release prerequisites for the current local-first product direction.
