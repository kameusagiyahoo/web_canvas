# Compare / Variant

## Purpose

Compare is a **view over existing Frames**, not a second screen model.

The editor can place up to three existing Screens side by side so visual alternatives can be reviewed without copying Canvas data into a separate comparison document.

```text
                  Project / Doc
                       │
            canonical Frame / Group / Item
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       Canvas       Preview       Compare
                                   A / B / C
                                       │
                                       └─ derived diff from A
```

## Source-of-truth rule

Compare selection and Compare diff output are view-only state.

They are deliberately **not** written into `Doc`, local Project snapshots, JSON export, or Navigation/Architecture metadata. Closing Compare therefore cannot create stale copies of a Screen or stale saved diff results.

The comparison surface derives everything from:

- `Frame`
- `Group`
- `Item`
- the existing measured-width map
- the active Material palette/theme

## Automatic structural differences

Slot A is the baseline. Slots B and C are compared against the current canonical data behind A every render.

`lib/compare-diff.ts` derives differences in these categories:

- Screen: dimensions and background role
- Added / Removed: parts present on only one side
- Content: labels, supporting text, icons, tabs, selected/checked/value state and image presence
- Style: Material variant, fill roles, icon fill, corner/toggle presentation and related visual flags
- Layout: screen-local x/y position and rendered width/height
- Navigation: tap targets, per-slot targets and Screen swipe targets

Variant duplication intentionally creates fresh Frame/Group/Item IDs, so diff matching does not rely only on IDs. It first uses canonical IDs when possible, then matches semantic identity and nearest screen-local position, and finally matches same-kind parts. This keeps a duplicated but otherwise unchanged Screen at zero differences even though all duplicated IDs and the Canvas world x-position changed.

The diff is explanatory design metadata only. It does not execute navigation, mutate either Screen, or become another source of truth.

## Creating a variant

`Create variant` is different from selecting a Screen for comparison.

It uses the existing `duplicateFrameInDocument()` command to create a real new Frame and duplicate the groups/items owned by the source Screen. The new variant is therefore a normal Screen:

- it appears on the Canvas and in Screens
- it is saved by normal Project persistence
- it participates in Preview and Navigation like any other Frame
- it is covered by normal Undo/Redo
- it can itself become the baseline or another comparison slot
- an untouched duplicate reports zero structural differences against its source

No `VariantScreen` or compare-only copy type is introduced.

## Desktop and mobile

Desktop opens Compare from the top Toolbar.

Mobile opens the same Compare workspace from the Screens sheet. The UI stacks comparison cards vertically on narrow screens but uses the same Frames, derived diff helper and commands.

## Current scope

Implemented:

- up to three comparison slots
- real static rendering of each selected Screen
- Screen dimensions and part count
- automatic A→B / A→C structural diff
- added/removed/content/style/layout/navigation categories
- jump back to the real Canvas Screen
- open Preview from a compared Screen
- create a real variant using the existing duplication command
- English/Japanese/Chinese/Korean launcher and core Compare/diff copy
- Vitest coverage for structural matching and difference categories
- Playwright coverage for comparison, derived diff, variant creation, persistence and Undo

Not persisted yet:

- named comparison sets
- reviewer comments
- approval state
- winner/preferred-variant metadata

If those become necessary, they should be lightweight metadata that references existing Frame IDs. They must not contain duplicate Screen/Canvas definitions or saved copies of a derived diff.