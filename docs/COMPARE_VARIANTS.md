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
```

## Source-of-truth rule

Compare selection is view-only state.

It is deliberately **not** written into `Doc`, local Project snapshots, JSON export, or Navigation/Architecture metadata. Closing Compare therefore cannot create stale copies of a Screen.

The current comparison surface derives everything from:

- `Frame`
- `Group`
- `Item`
- the existing measured-width map
- the active Material palette/theme

## Creating a variant

`Create variant` is different from selecting a Screen for comparison.

It uses the existing `duplicateFrameInDocument()` command to create a real new Frame and duplicate the groups/items owned by the source Screen. The new variant is therefore a normal Screen:

- it appears on the Canvas and in Screens
- it is saved by normal Project persistence
- it participates in Preview and Navigation like any other Frame
- it is covered by normal Undo/Redo
- it can itself become the baseline or another comparison slot

No `VariantScreen` or compare-only copy type is introduced.

## Desktop and mobile

Desktop opens Compare from the top Toolbar.

Mobile opens the same Compare workspace from the Screens sheet. The UI stacks comparison cards vertically on narrow screens but uses the same Frames and commands.

## Current scope

Implemented:

- up to three comparison slots
- real static rendering of each selected Screen
- Screen dimensions and part count
- jump back to the real Canvas Screen
- open Preview from a compared Screen
- create a real variant using the existing duplication command
- English/Japanese/Chinese/Korean launcher and core Compare copy
- Playwright coverage for comparison, variant creation, persistence and Undo

Not persisted yet:

- named comparison sets
- reviewer comments
- approval state
- winner/preferred-variant metadata

If those become necessary, they should be lightweight metadata that references existing Frame IDs. They must not contain duplicate Screen/Canvas definitions.
