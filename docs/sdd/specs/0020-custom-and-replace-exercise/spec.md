---
id: 0020
title: Create and replace exercises where they are needed
status: ready
roadmap: docs/roadmap/06-exercises-advanced.md
created: 2026-10-16
---

# Create and replace exercises where they are needed

> **No technology in this file.** See `../README.md`.

## Problem

- The owner reported "we lost the custom exercise option" (2026-10-16).
  Verified: it was not removed, but it is reachable from one place only — the
  routine editor, and only after a search with no results. The Exercises tab
  and the exercise picker of the active workout cannot create one.
- An exercise cannot be replaced (machine taken, injury): in the workout or
  the routine it has to be removed and another added, losing its sets and
  targets.

## Why now

Both happen at the gym, mid-workout, where removing and re-adding is slowest.

## Users and scenarios

- **Machine taken.** Leg press is busy; someone replaces it with hack squat in
  the active workout and keeps the three planned sets.
- **Exercise not in the catalog.** Someone searches "Press Landmine", finds
  nothing, and creates it from the same picker.
- **Building the library.** Someone adds their own exercises from the
  Exercises tab before writing routines.

## Scope

### In scope
- Create a custom exercise from the Exercises tab and from every exercise
  picker (routine editor and active workout), at any time — not only on an
  empty search.
- Replace an exercise in the active workout and in the routine editor.

### Out of scope
- Editing or deleting custom exercises — follow-up.
- Who can see custom exercises — spec 0015.

## Functional requirements

- **FR-1.** The Exercises tab MUST offer creating a custom exercise.
- **FR-2.** Every exercise picker MUST offer creating a custom exercise,
  prefilled with the text searched; the new exercise is then chosen.
- **FR-3.** In the active workout, an exercise MUST be replaceable by another;
  the replacement keeps the number of sets and their types, clears the typed
  values, and uses its own "last time" values.
- **FR-4.** In the routine editor, an exercise MUST be replaceable; its sets,
  targets, rest and superset are kept.
- **FR-5.** Replacing MUST keep the exercise's position (and superset).

## Behaviour when things go wrong

- **EF-1.** Replacing an exercise with sets already done MUST ask first: done
  sets of the old exercise are kept as their own exercise, or dropped.

## Domain impact

Touches **Exercise** (creation entry points), **RoutineExercise** and the
**active workout**'s exercises. Replacing in a routine changes the template
only; already-saved **WorkoutSessions** are untouched (Article 2).

## Acceptance criteria

- **AC-1.** Given the Exercises tab, when "new" is used, then a custom exercise
  can be created and appears in the list.
- **AC-2.** Given the active workout picker searching "Landmine", when
  "create" is used, then the exercise is created and added to the workout.
- **AC-3.** Given leg press with 3 empty sets in the active workout, when it is
  replaced by hack squat, then hack squat has 3 sets in the same position.
- **AC-4.** Given a routine, when an exercise is replaced, then targets and
  rest are unchanged.

## Assumptions

- **[ASSUMPTION: EF-1 defaults to keeping the done sets as their own
  exercise.]** Losing logged work silently would contradict 0013.

## Open decisions

None.

## Related

- 0007 (exercise catalog), 0015 (private custom exercises).
- Constitution articles engaged: 2, 3.
