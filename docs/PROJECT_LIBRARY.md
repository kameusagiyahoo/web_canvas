# Local project library

Web Canvas now supports multiple projects on the same device without requiring a backend or account.

## Behavior

- The current project is still autosaved locally.
- A project library stores independent `Doc` snapshots in browser `localStorage`.
- The active project ID is stored separately so reopening the app restores the same project.
- Existing single-document users are migrated into the project library automatically.
- Switching projects clears Undo/Redo history so history never crosses project boundaries.
- Project operations include create, open, rename, duplicate, delete, and JSON export.
- Existing JSON import/export remains available alongside the project library.

## Storage model

```text
m3e:doc
  └─ current editor document (compatibility/recovery)

m3e:projects:v1
  ├─ project A { metadata + Doc }
  ├─ project B { metadata + Doc }
  └─ ...

m3e:project:active
  └─ active project id
```

The project library is local to the current browser/device. It does not sync across devices.

## UI

Desktop:

`Project` menu → `Projects`

Mobile:

`Screens` sheet → `Projects`

The manager is full-screen and shows the current project, last update time, screen count, and project actions.

## Architecture

`lib/project-library.ts` owns the pure project-library operations and persistence format. `components/ProjectManager.tsx` owns the project-list UI. `app/page.tsx` coordinates switching the active document and keeps the active project snapshot synchronized with normal document autosave.

This keeps project-library semantics separate from canvas editing and keeps the existing versioned JSON project-file format intact.

## Scope

This is intentionally local-first. Cloud/account sync should only be added once there is a concrete cross-device requirement. The local library remains useful even if cloud sync is introduced later because it provides fast local switching and an offline fallback.
