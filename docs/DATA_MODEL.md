# Data Model / ER Graph

## Purpose

The Data Model is the next view in the editor's **single source, multiple views** direction.

It describes application data once and lets UI and architecture views reference that same definition instead of drawing a second, disconnected ER diagram.

The implementation is intentionally design-time only. It does not create a backend, execute database queries, or choose a database product.

## Model

`lib/data-model.ts` defines a versioned `DataModel` with three kinds of information:

```text
DataModel
├─ entities[]
│  └─ fields[]
├─ relations[]
└─ bindings[]
```

### Entity

An Entity is a conceptual application object such as `User`, `Order`, or `Product`.

A field stores design metadata:

- name
- scalar/reference type
- primary-key flag
- required flag
- unique flag
- optional note

The model deliberately avoids SQL-specific column definitions, indexes, migrations, credentials, or runtime database behavior.

### Relation

A Relation connects two Entity definitions and has one explicit cardinality:

- one-to-one
- one-to-many
- many-to-one
- many-to-many

A relation can optionally reference concrete fields on either side. Self-relations remain valid because models such as `User.managerId → User.id` need them.

### Binding

A Binding is the bridge that lets the other editor views say which data they use.

Supported subject kinds reference canonical objects already owned elsewhere in the project:

- `frame` — Screen / `Frame`
- `item` — Canvas `Item`
- `action` — Architecture Action
- `api` — Architecture API

A binding references exactly one Entity and records one or more conceptual access modes:

- read
- create
- update
- delete

Bindings are descriptive design metadata. They do not execute requests, mutate application data, or change Preview navigation.

## Editing rules

The domain commands are immutable and return the original model for rejected operations. This matches the existing command-oriented editor architecture and lets Data Model edits use the same whole-document Undo/Redo path as other semantic metadata.

Implemented commands cover:

- add/update/delete Entity
- add/update/delete Field
- add/update/delete Relation
- add/update/delete Binding
- cascaded cleanup when an Entity is intentionally deleted
- clearing field references when a referenced Field is intentionally deleted

Imported malformed references are not silently guessed by diagnostics. `diagnoseDataModel()` surfaces missing relation/binding targets explicitly, following the same principle used by Architecture Flow.

`lib/data-model-document.ts` validates the persisted boundary before a stored or imported Data Model reaches editor state. Existing documents with no `dataModel` remain valid and open with an empty version-1 model.

## Derived ER layout

`layoutDataModel()` produces a deterministic layout from the model topology.

No x/y graph coordinates are stored in `DataModel`.

```text
DataModel
   │
   ├─ entities / relations
   │
   └─ layoutDataModel()
          │
          └─ derived ER nodes + edges
```

Acyclic dependencies are arranged left-to-right. Cyclic groups remain renderable and are placed in a deterministic fallback column rather than making the project invalid.

## Editor integration

Status: implemented on the Data Model foundation branch.

- The active editor document carries an optional version-1 `dataModel` payload.
- Legacy projects without it open with an empty Data Model.
- Local autosave, managed-project snapshots, JSON export/import, whole-document Undo/Redo and project switching carry the same payload.
- `components/DataModelView.tsx` provides one responsive ER editor for desktop and mobile.
- `components/DataModelWorkspace.tsx` exposes that same model from the Canvas without creating a second mobile or graph-only store.
- Entity cards, fields and cardinality edges are rendered from the model; graph coordinates stay derived.
- Screen, Canvas part, Architecture Action and Architecture API options are derived from their existing canonical IDs.
- A `DataBinding` can describe `read`, `create`, `update`, and/or `delete` access to an Entity.
- Selecting a binding can hand the user back to the real Canvas Screen/part or the real Architecture Action/API.

This completes the first **Single Source, Multiple Views** loop:

```text
Canvas Screen / Part ─┐
Architecture Action ──┼─ DataBinding ─ Entity ─ Relation ─ Entity
Architecture API ─────┘
```

Do **not** create a second screen, navigation, Action, or API model inside the Data Model. Those objects already have canonical identities elsewhere in the document; bindings reference them.

## Validation before merge

The branch keeps the existing CI gates and adds evidence for the new persisted state:

1. TypeScript/typecheck and static build cover the integrated editor.
2. Unit tests cover Data Model commands, persisted-shape validation and project JSON round-trip/rejection.
3. Existing Playwright coverage remains part of the release gate.
4. `e2e/data-model.e2e.ts` covers the user journey: open Data Model → create Entity/Field → bind an Architecture Action → verify local persistence → Undo → recreate → reload → jump back to the bound Architecture object.
5. Detailed Data Model editor-copy localization remains follow-up work; the launcher already follows the editor language.

## Longer-term view

One project can now move toward:

```text
                         Project / Doc
                              │
       ┌──────────────┬───────┼───────────┬──────────────┐
       ↓              ↓       ↓           ↓              ↓
   UI Canvas       UI Flow   App Flow   Data Model     Compare
   Frame/Item     Navigation Architecture Entity/ER   UI variants
       │              │       │           │              │
       └──────────────┴───────┴───────────┴──────────────┘
                         shared identities
```

The target is not five independently maintained diagrams. It is one application definition with multiple derived and editable views.
