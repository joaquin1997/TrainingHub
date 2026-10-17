---
id: 0026
title: Exercise images
status: in-progress
decided: 2026-10-16
roadmap: docs/roadmap/06-exercises-advanced.md
created: 2026-10-16
---

# Exercise images

> **No technology in this file.** See `../README.md`.

## Problem

Most exercises show a neutral tile instead of an image (owner, 2026-10-16).
Verified: the catalog comes from wger, and only a minority of its exercises
have an illustration.

## Why now

Images make the picker and the list scannable and help with unfamiliar
exercise names, most of which are in English.

## Users and scenarios

- **Picking fast.** Someone scrolls the picker and recognises "Bulgarian
  split squat" by its picture.
- **Own exercise.** Someone takes a photo of the machine at their gym for a
  custom exercise.

## Scope

### In scope
- More catalog exercises with an image, from a source chosen in the open
  decision.
- A photo for custom exercises, taken or picked by the person.

### Out of scope
- Videos or animated demonstrations.
- Translating exercise names (separate data problem).

## Functional requirements

- **FR-1.** Catalog exercises MUST show an image whenever the chosen source
  has one for them.
- **FR-2.** The person MUST be able to add a photo to a custom exercise.
- **FR-3.** Every image MUST respect its source's licence (attribution where
  required).
- **FR-4.** Without an image, the neutral tile stays.

## Behaviour when things go wrong

- **EF-1.** An image that fails to load shows the neutral tile, never a broken
  image.
- **EF-2.** Offline, images seen before still show where possible.

## Domain impact

**Exercise** image becomes populated for more exercises; custom exercises gain
a person-supplied image (stored with their owner's data).

## Acceptance criteria

- **AC-1.** Given the 50 most used exercises of the owner, at least 40 show an
  image after the import.
- **AC-2.** Given a custom exercise, when a photo is added, then it shows in
  the list, the picker and the workout.

## Assumptions

- **[ASSUMPTION: photos are stored on the home server with the rest of the
  data; no third-party storage.]**

## Open decisions

None. Decided by the owner 2026-10-16: **an open dataset with photos
(public-domain "free-exercise-db") matched to the catalog by name and reviewed
by hand, plus photos the person adds to custom exercises.** wger images stay
where they exist.

## Related

- 0007 (catalog), 0020 (custom exercises), 0015 (private custom exercises).
- Constitution articles engaged: 5, 7, 9.
