---
id: 0007
title: "Retro: exercises"
status: retro
roadmap: docs/roadmap/06-exercises-advanced.md
created: 2026-09-23
---

# Retro: exercises

> **Retro-spec.** Records what exists so a future change has something to build
> on.

## What an exercise is

An **Exercise** is a movement in the catalog. Exercises are either
system-defined — seeded from the wger database — or created by a user. The
catalog is what the routine builder picks from.

## Behaviour today

- Browse the catalog, paginated, and search it.
- Filter by category and equipment, via chips derived from the loaded catalog.
- View an exercise's detail, including an image sourced from wger.
- Mark exercises as favorites (persisted server-side) and filter to favorites.
- Create a custom exercise, used like any other.

## Invariants worth protecting

- **System and user exercises are the same concept**, not two parallel models.
  A routine slot points at an exercise without caring which it is.
- **Facets are derived from data, not hardcoded.** Categories and equipment
  come from the loaded catalog (`buildExerciseFacets`), with filtering as a
  pure, unit-tested function (`filterExercises`).
- **Category and equipment were chosen over muscle group deliberately.** wger's
  `primaryMuscleGroups` comes back sparse; category and equipment are well
  populated. Anything that wants to filter or group by muscle has to solve the
  data problem first — this is the same blocker as the muscle-group
  distribution gap in spec 0006.

## Known gaps

From [docs/roadmap/06-exercises-advanced.md](../../../roadmap/06-exercises-advanced.md):

- **Per-exercise history (past sets)** — the only unchecked item in the area.
  Note that the data already exists: the active workout's "last time" feature
  reads the most recent logged sets for an exercise, so this is largely a
  presentation gap rather than new plumbing.

**Custom exercises are not private** (verified 2026-09-24). The catalog lists
every exercise of every user, and creating a custom exercise whose name
matches an existing one (case-insensitive) returns that existing exercise —
possibly another user's. Decided 2026-09-24 that each user sees system
exercises plus their own — spec 0015.

## Related

- Glossary: Exercise
- Constitution articles engaged: 2, 3
