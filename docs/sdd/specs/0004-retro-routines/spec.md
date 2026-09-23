---
id: 0004
title: "Retro: routines"
status: retro
roadmap: docs/roadmap/05-routines-advanced.md
created: 2026-09-23
---

# Retro: routines

> **Retro-spec.** Written after the fact to record what exists, so a future
> change has something to build on. It describes behaviour, not intent — the
> intent was never written down. Thin on purpose.

## What a routine is

A **Routine** is a reusable template describing *intended* training. It is
never a record of anything performed — that separation is constitution
Article 2, and it is the invariant that makes progress tracking possible.

A routine holds an ordered list of **RoutineExercise** slots. Each slot names
an exercise from the catalog and carries the intended sets, target values and
rest time, and may belong to a superset group.

## Behaviour today

- A user can create, view, edit, list and delete their own routines.
- Exercises are added to a routine from the catalog, and reordered within it
  (up/down; drag and drop was deliberately not built — it needs a gesture
  library).
- A routine can be duplicated.
- Routines can be organised into folders, and the list is grouped by folder.
- Rest time is configurable per exercise slot.
- Exercises can be grouped into supersets, shown as a badge in the routine
  detail and during an active workout.
- In the builder, an unedited set field shows the previous set's values as a
  ghosted placeholder and **saves that inherited value** if left untouched.
  This mirrors how the active workout behaves, so the two feel the same.
- While a workout started from a routine is active, that routine cannot be
  edited. The lock lifts when the workout is finished or discarded.

## Invariants worth protecting

- **A routine edit never changes history.** Performed workouts keep the values
  they were logged with. This is why the edit-lock exists and why template and
  performed data never share a model.
- **Target values are intentions, not records.** They seed an active workout's
  placeholders; they are not what the user lifted.
- **Weights are kilograms** everywhere they are stored; `kg`/`lb` is display
  only (Article 4).
- **Inherited placeholders must save their value.** A field showing `60` that
  saves nothing would silently lose sets — the behaviour is load-bearing, not
  cosmetic.

## Known gaps

All remaining items live in
[docs/roadmap/05-routines-advanced.md](../../../roadmap/05-routines-advanced.md);
the checklist there is complete, so the area has no open sub-points at the time
of writing.

`TODO(sdd): unverified in this pass — whether deleting a routine that has`
`performed workouts attached is blocked, soft-deleted, or leaves those workouts`
`orphaned. This is exactly the kind of question a real spec would have`
`answered, and it needs reading the delete path in the API to settle.`

## Related

- Glossary: Routine, RoutineExercise, superset, routine folder
- Constitution articles engaged: 2, 3, 4
