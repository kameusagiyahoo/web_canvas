# Assistive-technology validation

Browser E2E tests protect keyboard behavior, dialog semantics, focus containment, and stable accessible names. This document covers the manual validation that browser automation cannot prove: real screen-reader output, reading order, discoverability, and usability with assistive technology.

This is a validation protocol, not a claim of WCAG conformance.

## Minimum validation matrix

Run at least these two practical passes before General-user beta:

1. **iPhone Safari + VoiceOver** — validates the mobile product surface with a real touch screen reader.
2. **Desktop keyboard-only** — validates the main desktop authoring flow without a pointer.

If available, add one desktop screen reader such as NVDA on Windows or VoiceOver on macOS. Record the exact browser and screen-reader combination used.

## Before each pass

Record:

- date;
- deployed commit SHA;
- device and OS;
- browser;
- assistive technology and version when available;
- clean first-run state or existing-user state;
- language used in the editor.

Use a disposable test Project. Do not run destructive tests on irreplaceable work.

## iPhone + VoiceOver pass

### 1. First launch / Quick Start

Verify that:

- the Quick Start dialog is announced as a dialog;
- its title is announced once and is understandable;
- the Close control has a meaningful name;
- swipe navigation moves through the guide in a sensible order;
- Back / Next / Start designing are distinguishable;
- closing the guide returns the user to a sensible editor location;
- the `?` help control can be found and reopens the same guide.

Record any control whose spoken name depends on an icon or visual position.

### 2. Mobile primary controls

Navigate through the editor and verify meaningful spoken labels for:

- Screen;
- Add / Parts;
- Layers;
- Preview;
- Edit / Inspector entry when an item is selected;
- Quick Start help.

A control should not be announced only as a generic “button” or by an icon glyph.

### 3. Screen management

From the Screen sheet:

- identify the active Screen;
- add a new Screen;
- select the original Screen again;
- find Projects;
- close the sheet without losing the current editing context.

Verify that screen names and action controls are not announced in an ambiguous order.

### 4. Add a Part

Open Parts and add a Button or another simple control.

Verify that:

- the sheet has an understandable purpose;
- part choices have meaningful names;
- activation provides enough feedback to understand that something was inserted;
- the inserted item can subsequently be found through Layers or the normal edit path.

### 5. Configure navigation

Select an item and use the mobile Inspector to create a route to another Screen.

Verify that:

- the selected item/context is understandable;
- Action destination controls are labelled;
- Screen choices are distinguishable;
- transition controls are understandable;
- saving the change does not depend on visual-only feedback.

### 6. Preview

Open Preview and activate the configured route.

Verify that:

- entering Preview is announced clearly enough to distinguish it from editing mode;
- the interactive source control can be located;
- the destination Screen change is detectable;
- Preview can be exited without trapping the user.

### 7. Projects and backup

Open Project Manager and verify that:

- it is announced as a dialog or equivalent modal surface;
- Close, New Project, Open file, Search projects, Save now, Rename, Duplicate, Export file, and Delete are understandable;
- the **Backup & recovery** disclosure has a concise accessible name;
- expanding it exposes the recovery guidance in a sensible reading order;
- the user can identify Export file as portable backup and Open file as the restore path.

### 8. Destructive operations

Using disposable content only, check whether confirmation and disabled states are understandable for Project deletion.

Do not validate destructive behavior merely by visual appearance; record what VoiceOver actually announces.

## Desktop keyboard-only pass

Do not use a mouse or trackpad during this pass.

Verify that the user can:

1. reach and activate Add Screen;
2. reach core toolbar controls;
3. open Quick Start and keep focus inside it while tabbing;
4. close Quick Start with Escape and receive focus back at the invoking control;
5. open Project Manager;
6. move among its controls without focus escaping behind the modal;
7. close Project Manager with Escape;
8. reach Preview and other core authoring controls that are expected to be keyboard-operable.

Record:

- unreachable controls;
- invisible/unclear focus states;
- unexpected focus jumps;
- focus loss after closing sheets/dialogs;
- keyboard operations that mutate data accidentally.

## Optional desktop screen-reader pass

If NVDA or desktop VoiceOver is available, repeat the core authoring loop:

`Screen → Part → Action → Preview → Project → backup`

Focus on information quality rather than duplicating every keyboard-only check. Record the exact spoken label/role for any ambiguous control.

## Severity

Classify findings as:

- **Blocker** — core task cannot be completed with the assistive technology;
- **High** — task is technically possible but the user is likely to choose the wrong control, lose context, or misunderstand persistence/destructive behavior;
- **Medium** — repeated friction, unclear announcement, or avoidable navigation burden;
- **Low** — cosmetic wording/order issue with a clear workaround.

Data-loss or destructive-action misunderstandings should be treated as at least High even if the operation itself technically works.

## Evidence record

For every issue record:

- surface and task;
- device/browser/assistive technology;
- exact control or step;
- expected announcement/behavior;
- actual announcement/behavior;
- severity;
- reproducibility;
- screenshot/video if useful and privacy-safe;
- linked GitHub issue/PR after triage.

## Completion rule

The manual accessibility milestone is complete only when:

- the minimum validation matrix has actually been run on a deployed commit;
- Blocker findings are fixed and retested;
- High findings are fixed, explicitly accepted with rationale, or scoped out of the intended General-user beta workflow;
- the remaining limitations are documented in `docs/RELEASE_READINESS.md`.

Creating this checklist does not itself satisfy the milestone.
