---
id: 0044
title: A curated exercise catalog
status: draft        # gate 1 waits on the owner's answers (Open decisions)
roadmap: docs/roadmap/06-exercises-advanced.md
created: 2026-10-21
---

# A curated exercise catalog

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

The owner, 2026-10-21: *"parece que la mayoría no están bien"*. The catalog is
a crowd-sourced import, and it shows: the person cannot find the usual gym
exercises under the names they know, and the data behind each one (what it
records, its equipment, its muscles, its picture) is often missing or wrong.
Every feature that reads the catalog — the picker, records, progress, the
warm-up ramp (0043), images (0026) — inherits the mess.

## Why now

The owner's own history shows the cost: of the 34 exercises in their saved
workouts, 13 are custom exercises they created because they did not find the
catalog one — "Bench Press", "Backsquat", "Dumbell bench press", "Remo con
pecho apoyado", "Gemelos sentado"… Their progress for those lifts is tied to
private copies the catalog knows nothing about. 0043 (warm-ups by loading kind
and muscle) is only as good as this data.

## What exists today (verified 2026-10-21, server catalog, read only)

- 847 catalog exercises plus 15 custom ones. Each catalog exercise carries one
  name: Spanish when the source had one (264), otherwise English (583) — so a
  Spanish-speaking person sees a mix, and an English one sees Spanish names.
  Some "English" ones are French ("Talons fesses") or misspelt ("Snach").
- Basic lifts are missing or hard to recognise (no plain "Bench press" or
  "Back squat" was found by the owner), while there are dozens of stretches,
  foam-rolling and mobility drills (about 78 by name alone) and odd variants
  ("Sentadilla búlgara derecha" and "… izquierda" as two exercises).
- Equipment: none recorded for 318; machines and cables never recorded; some
  wrong (a cable curl as bodyweight, pendulum squat as bodyweight).
- Muscles: no primary muscle for 194; some wrong (hyperextensions → trapezius,
  L-sit → chest).
- What a set records: 663 are left as weight & reps, including planks,
  stretches and jumps; the tracking type sweep (0030) is written but not run.
- Pictures: 319 of 847.
- Exact duplicate names: 7 groups; the same movement under different names is
  far more common.

## Users and scenarios

- **Finding the bench press.** Someone types "banca" (or "bench") in the
  picker and gets "Press de banca" with barbell, chest, and a picture — first,
  not after twenty variants.
- **Language.** With the app in Spanish every exercise reads in Spanish; with
  it in English, in English. Searching works in either.
- **History kept.** The owner's earlier workouts with their own "Bench Press"
  still show and still count toward the progress of the bench press.
- **Nothing to clean up.** Someone browsing by muscle or equipment sees only
  exercises that are really trained in a gym, each with what it records set
  right (a plank records time, a run distance and time).

## Scope

### In scope
- A reviewed catalog of the common gym exercises, each with: a name in
  Spanish and in English (plus other names people search for), category,
  primary and secondary muscles, equipment and loading kind (0043), tracking
  type (0021), whether it is unilateral (0022), and a picture where a
  licensed one exists (0026).
- Showing and searching each exercise in the app's language.
- What happens to the catalog exercises that are not in the reviewed catalog
  (see Open decisions).
- Keeping every saved workout and routine readable and correct after the
  change, and records and progress continuous for the exercises that are
  carried over.
- A way to grow and correct the catalog later the same reviewed way.

### Out of scope
- Instructions, videos or animations per exercise — names, data and a picture
  only.
- Letting people suggest or edit catalog entries in the app.
- Languages other than Spanish and English.
- A custom exercise's own data (its owner keeps it as is), unless merged
  (Open decision 2).
- Muscle-group distribution or filters built on the new data — they read it,
  but changing them is their own spec.

## Functional requirements

- **FR-1.** The catalog MUST contain the common gym exercises (barbell,
  dumbbell, machine, cable, bodyweight and the usual cardio), each one
  movement once — no left/right copies, no duplicates under other names.
- **FR-2.** Each catalog exercise MUST have a Spanish and an English name, and
  MUST be shown in the app's language.
- **FR-3.** Search MUST match the name in either language and the other names
  people use ("banca", "bench", "press plano"), and SHOULD rank the plain
  exercise before its variants.
- **FR-4.** Each catalog exercise MUST have a category, a primary muscle,
  equipment, a loading kind when it records weight, a tracking type and
  whether it is unilateral, all reviewed.
- **FR-5.** Every saved workout and routine MUST keep showing every exercise
  it contains, under a name, after the change; no set, record or routine may
  be lost.
- **FR-6.** An old exercise carried over to a reviewed one MUST keep its
  history: its sets count toward the reviewed exercise's records and progress.
- **FR-7.** Choices a person made on an exercise (favourite, tracking type or
  loading kind set by hand, own photo) MUST survive the change for the
  exercises carried over.
- **FR-8.** Applying the catalog MUST be repeatable and reversible, with a
  report reviewed before it is applied, like the tracking type sweep (0030).

## Behaviour when things go wrong

- **EF-1.** A device with an older app version MUST keep working against the
  new catalog: it may show one language only, but never a blank name or an
  error.
- **EF-2.** An active workout in progress during the change MUST still save,
  with every exercise it holds.
- **EF-3.** An old exercise that cannot be matched with confidence MUST NOT be
  carried over by guess; it is listed for review.

## Domain impact

- **Exercise** gains names per language and reviewed data; the catalog stops
  being "seeded from wger" (glossary to update).
- Possibly a new relationship: an old exercise *carried over* to a reviewed
  one, so history and progress join (Open decision 1).
- Reads and may re-point **WorkoutExercise** and **RoutineExercise** — data
  changes are a script, never a migration (Article 5). Schema change for names
  per language: a migration.

## Acceptance criteria

- **AC-1.** With the app in Spanish, searching "banca" lists "Press de banca"
  first, with barbell, chest, a picture, weight & reps; in English "bench"
  lists "Bench press" first.
- **AC-2.** No catalog exercise has a name only in the other language, and no
  two catalog exercises are the same movement.
- **AC-3.** A plank records time and a treadmill run distance and time; no
  stretch or foam-rolling drill appears unless the owner decided to keep them
  (Open decision 3).
- **AC-4.** The owner's saved workouts all open with every exercise and set,
  and the progress of the bench press includes the sets logged under their
  custom "Bench Press" (if Open decision 2 is yes).
- **AC-5.** The apply report lists every change; applying twice changes
  nothing the second time; undo restores the catalog as it was.

## Non-functional requirements

- The catalog data is reviewed by a person before it is applied; nothing is
  changed on the server without that review.
- Pictures only with a licence that allows them (as 0026).
- The owner's data is backed up before applying.

## Assumptions

- **[ASSUMPTION: about 250–350 exercises cover what a gym-goer logs; more can
  be added later the same reviewed way.]**
- **[ASSUMPTION: the reviewed catalog is drafted by the assistant from common
  gym practice and reviewed by the owner in a list, not typed by hand.]**
- **[ASSUMPTION: the tracking type sweep of 0030 is not run on the old
  catalog; this spec replaces that step.]**

## Open decisions

- **[NEEDS DECISION 1: replace or clean? (a) a new reviewed catalog; the old
  imported exercises disappear from the catalog and pickers, are kept by name
  where workouts and routines use them, and those that match a reviewed one
  are carried over to it (recommended — the old data is wrong too often to
  fix one by one); or (b) keep the imported catalog and fix it in place:
  translate, remove junk, correct data.]**
- **[NEEDS DECISION 2: should custom exercises that are the same as a
  reviewed one (the owner's "Bench Press", "Backsquat"…) be merged into it,
  so their history joins the catalog exercise? Recommended: yes, from a list
  the owner confirms once, not automatically.]**
- **[NEEDS DECISION 3: stretches, mobility and foam rolling — keep a small
  reviewed set (they can live in the routine's warm-up block, 0024), or leave
  them out of the catalog entirely?]**

## Related

- Builds on: 0015 (private custom exercises), 0021 (tracking types), 0022
  (unilateral), 0026 (images), 0030 (reviewed, reversible sweep), 0033
  (deleted exercises kept by name), 0043 (loading kind)
- Supersedes: 0030's pending server sweep (Assumptions)
- Roadmap: docs/roadmap/06-exercises-advanced.md
- Constitution articles engaged: 2, 3, 5
