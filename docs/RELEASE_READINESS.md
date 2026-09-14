# Release readiness

web_canvas is now evaluated as a product flow, not only as a collection of isolated editor features.

## Current level

The current level is **personal daily-use candidate**:

- appropriate for the author to use on day-to-day prototype projects on one device while continuing development;
- local-first project storage, JSON export/import, Preview, Navigation, Architecture Flow, and Undo/Redo are available;
- practical desktop/mobile authoring, repeated larger-project persistence, recovery failures, destructive-action recovery, first-run onboarding, and critical keyboard/modal accessibility are protected by browser E2E gates;
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

## Destructive-action recovery gate

`e2e/destructive-recovery.e2e.ts` protects destructive actions according to whether they are recoverable document edits or irreversible library operations:

1. delete a routed Canvas Item and verify normal Undo restores the exact pre-delete document, including its Navigation action;
2. delete a Screen from the mobile Screen sheet and verify its owned content and inbound Navigation are removed together;
3. Undo that Screen deletion and verify the exact pre-delete document returns in one step;
4. attempt to delete an active managed Project, cancel the confirmation dialog, and verify the document, active Project ID, and Project Library remain byte-for-byte equivalent at the parsed-data level;
5. confirm the same Project deletion and verify the editor activates the surviving Project and restores its saved document;
6. verify the final remaining Project cannot be deleted.

This gate keeps the recovery policy explicit: Canvas/Screen edits use normal Undo/Redo history, while managed-Project deletion is outside document history and therefore requires confirmation plus a last-Project safety guard.

## First-run onboarding gate

`e2e/onboarding.e2e.ts` protects the editor's first-run discoverability without adding a second product model:

1. a browser with no existing web_canvas storage automatically receives a five-step Quick Start;
2. the guide explains the real authoring loop: create Screens, add parts, connect Screens, Preview, and save/manage Projects;
3. completing or closing the guide stores only the lightweight `m3e:quick-start:v1` preference, outside the Project/Doc payload;
4. normal reload does not interrupt returning work with the first-run guide again;
5. the guide remains manually reopenable from a visible `?` control on both desktop and mobile;
6. the instructions adapt to the current device UI and the current editor language.

Existing users are not opted into the automatic dialog: existing document, Project Library, or editor-UI storage suppresses first-run auto-open while keeping the manual help entry available.

## Accessibility and keyboard interaction gate

`e2e/accessibility-workflow.e2e.ts` protects critical interaction semantics that pointer-only tests do not cover:

1. a desktop user can focus and activate Add Screen with the keyboard's native Enter behavior;
2. Quick Start exposes a labelled dialog/heading, moves focus into the dialog, traps Tab/Shift+Tab inside it, closes with Escape, and restores focus to the help button;
3. Project Manager exposes a labelled full-screen dialog, starts focus on its Close control, keeps repeated Tab navigation inside the dialog, and closes with Escape;
4. the same mobile Screen, Layers, Add, Add Screen, and part-choice controls retain stable accessible names at a 390 × 844 viewport;
5. mobile Screen creation and part insertion can be activated through their native button keyboard behavior, complementing the touch-driven complete mobile golden path.

The modal behavior is implemented through one shared focus-management helper rather than separate Quick Start / Project Manager rules. Together with the existing mobile golden-path test, this gives browser-level coverage for the complete mobile authoring workflow plus the editor's critical keyboard/modal boundaries. It is **not** a claim of WCAG conformance or complete screen-reader validation; those still require assistive-technology and external-user testing.

## Promotion criteria

### Personal-use beta — achieved foundation

Required:

- practical golden-path E2E passes;
- recovery E2E passes for malformed import and local-storage quota failure;
- mobile golden-path E2E passes through authoring, Preview, save, and reload;
- persistence stress E2E passes through repeated 10/12/14-Screen save and reload cycles;
- destructive-action recovery E2E passes for Item, Screen, and managed-Project deletion;
- main typecheck, unit tests, production build, and Playwright E2E pass;
- GitHub Pages deployment succeeds;
- no silent mutation when inspecting diagnostics or Architecture trace state;
- project can be recovered through versioned JSON export/import.

### Personal daily-use candidate — current

The practical gates now cover the main single-device authoring and recovery risks expected during regular personal use. First-run guidance and critical keyboard/modal accessibility are also available, so the remaining release-readiness work is aimed at validation with people and assistive technology rather than adding backend infrastructure.

### General-user beta — later

Before handing the app to unrelated users without explanation, validate:

- first-run onboarding and discoverability — implemented; validate with external users rather than only browser automation;
- accessibility and keyboard/mobile interaction — critical browser gate implemented; continue with screen-reader/assistive-technology validation and fix issues found there;
- representative external-user usability sessions;
- documented recovery/backup guidance.

Backend, authentication, collaboration, and cloud sync are not release prerequisites for the current local-first product direction.
