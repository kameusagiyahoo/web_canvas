# Data Model / ER Graph

## Purpose

The Data Model is the next view in the editor's **single source, multiple views** direction.

It describes application data once and lets later UI/architecture views reference that same definition instead of drawing a second, disconnected ER diagram.

The first implementation is intentionally domain-only and reusable. It does not create a backend, execute database queries, or choose a database product.

## Foundation in this change

`lib/data-model.ts` introduces a versioned `DataModel` with three kinds of information:

```text
DataModel
├─ entities[]
│  └─ fields[]
├─ relations[]
└─ bindings[]
```

### Entity

An Entity is a conceptual application object such as `User`, `Order`, or `Product`.

A field stores only design metadata:

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

A Binding is the bridge that will let other editor views say which data they use.

Supported subject kinds are already named for the existing product model:

- `frame`
- `item`
- `action`
- `api`

A binding references exactly one Entity and records one or more conceptual access modes:

- read
- create
- update
- delete

Bindings are descriptive design metadata. They do not execute requests or mutate application data.

## Editing rules

The domain commands are immutable and return the original model for rejected operations. This matches the existing command-oriented editor architecture and makes it safe to place Data Model changes into the normal Undo/Redo path when it is wired into `Doc`.

Implemented commands cover:

- add/update/delete Entity
- add/update/delete Field
- add/update/delete Relation
- add/update/delete Binding
- cascaded cleanup when an Entity is intentionally deleted
- clearing field references when a referenced Field is intentionally deleted

Imported malformed references are not silently guessed by diagnostics. `diagnoseDataModel()` can surface missing relation/binding targets explicitly, following the same principle used by Architecture Flow.

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

`components/DataModelView.tsx` is a reusable first ER editor surface. It renders Entity cards, fields, cardinality edges, an Entity inspector, relation creation, deletion, and diagnostics. It accepts the model and an `onChange` callback so the host editor can later connect it to the normal document/history/persistence path without putting domain logic in the component.

## Required integration before release

This foundation is not yet a new source of truth in `Doc`. The safe integration sequence is:

1. Add optional `dataModel` to `Doc` and a runtime migration/default.
2. Keep old project JSON valid by defaulting missing `dataModel` to an empty v1 model.
3. Add `dataModel` to the existing full-document state/snapshot path so project switching, autosave, import/export, Undo and Redo preserve it.
4. Open `DataModelView` from desktop and mobile using the same model.
5. Localize the Data Model UI labels.
6. Add Screen/Canvas ↔ Entity bindings using existing Frame/Item IDs.
7. Add Architecture Action/API ↔ Entity bindings using existing Architecture node IDs.
8. Add cross-view focus: Canvas → Architecture → Data and Data → related Screen/Action/API.
9. Add browser E2E coverage before marking the feature complete.

Do **not** create a second screen, navigation, Action, or API model inside the Data Model. Those objects already have canonical identities elsewhere in the document; bindings should reference them.

## Longer-term view

Once integrated, one project can be viewed as:

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
