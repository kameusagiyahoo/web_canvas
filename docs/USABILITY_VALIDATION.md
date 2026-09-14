# External usability validation

This protocol is for validating whether web_canvas can be handed to people who did not build it without live coaching. It is evidence for General-user beta readiness; it is not a substitute for browser E2E coverage.

## Goal

Validate whether a new user can discover and complete the real product loop:

`Screens → Parts → Action/Navigation → Preview → Project save → backup`

The session should reveal where terminology, hierarchy, controls, or recovery guidance are unclear. Do not teach the UI before the participant has had a chance to discover it.

## Participants

Target 3–5 people who did not implement web_canvas. Prefer a mix of:

- someone comfortable with design/prototyping tools;
- someone technical but unfamiliar with this editor;
- someone with no specialist knowledge of the project.

Do not count the author/developer as an external participant.

## Test setup

Use the deployed GitHub Pages build unless the session is specifically validating an unreleased branch.

For first-run sessions, use a clean browser profile or clear only web_canvas storage before the session. Do not clear unrelated participant data.

Record:

- date and deployed commit SHA;
- desktop or mobile device;
- browser;
- viewport/device class;
- participant experience level;
- whether the browser already contained web_canvas state.

Do not record unnecessary personal information.

## Moderator rules

1. Read each task as a goal, not as UI instructions.
2. Do not name the control the participant should press unless the task has already failed.
3. Ask the participant to think aloud when practical.
4. If the participant is blocked for about two minutes, record the blockage before giving the smallest possible hint.
5. Record what actually happened. Do not infer success from intent.
6. Do not change the product during a session.

## Core task sequence

### Task 1 — First orientation

Prompt:

> You have opened this tool for the first time. Tell me what you think it is for and what you would do first.

Observe:

- whether Quick Start is noticed;
- whether the participant understands Screen, Parts, Preview, and Project terminology;
- whether they can close/reopen help if needed.

### Task 2 — Create a second screen

Prompt:

> Add another screen to this prototype.

Success means a second `Frame` exists. Record whether the participant finds the correct desktop or mobile Screen entry without coaching.

### Task 3 — Add a control

Prompt:

> Add a button or similar control to the first screen.

Success means a new Canvas part is inserted on the intended screen.

### Task 4 — Connect the screens

Prompt:

> Make the control on the first screen open the second screen.

Success means a real `Item.action` / Navigation route is configured. Do not tell the participant whether to use Inspector or Navigation graph.

### Task 5 — Test the result

Prompt:

> Check whether the flow you just made actually works.

Success means the participant reaches Preview and triggers the route.

### Task 6 — Save and find the project again

Prompt:

> Make sure this project is saved, then show me where you would manage or reopen projects.

Observe whether autosave vs **Save now** is understood well enough for the user to trust the state.

### Task 7 — Protect the work

Prompt:

> Imagine this browser is going to be reset tomorrow. Protect this project so you can recover it later.

Success means the participant discovers Project JSON export, either directly or through **Backup & recovery** guidance.

Then ask:

> If you had that backup file later, where would you restore it?

The participant should identify **Open file** in Project Manager and understand that it imports a separate managed Project.

## Optional advanced tasks

Run these only if they match the intended user population:

- inspect Navigation graph and identify the route just created;
- create or inspect an Architecture Flow;
- bind a semantic Action to a Canvas part;
- duplicate/rename Projects;
- recover from an intentionally malformed import using a disposable test file.

Advanced tasks are not required to judge the basic zero-guidance authoring loop.

## What to record per task

Use one of these outcomes:

- **Success** — completed without moderator help;
- **Success with hint** — completed after a small hint;
- **Partial** — meaningful progress but task not completed;
- **Fail** — could not complete or took an incorrect destructive path.

Also record:

- first control/area attempted;
- hesitation or backtracking;
- terminology that caused confusion;
- any accidental destructive action;
- whether the participant noticed system feedback;
- direct participant comments worth preserving;
- moderator hint, if any.

Exact task timing may be recorded, but task completion and observed confusion are more important than optimizing for speed.

## Session close-out questions

Ask these after the tasks, not before:

1. What did you think a **Screen** was?
2. What did you expect **Preview** to do?
3. What is the difference between saving a Project and exporting Project JSON, in your words?
4. If you came back next week, where would you look for your Projects?
5. What was the most confusing part?
6. What felt unnecessary or duplicated?
7. What would you expect the `?` help control to contain?

## Synthesis

After each session, copy `docs/USABILITY_SESSION_TEMPLATE.md` and fill it with actual observations.

After 3–5 sessions, group findings by root cause instead of by participant. Useful categories:

- discoverability;
- terminology;
- visual hierarchy;
- navigation/flow construction;
- Preview mental model;
- Project persistence/backup mental model;
- mobile ergonomics;
- accessibility.

Prioritize findings that:

1. block a core task;
2. cause data-loss risk or a destructive misunderstanding;
3. recur across multiple participants;
4. require moderator hints;
5. make the user form the wrong persistence model.

Do not mark General-user beta as achieved until real session evidence exists. A protocol alone is not validation.
