---
id: 0030
title: Tracking type sweep of the catalog
status: in-progress  # self-approved under the delegated gates, 2026-10-17
roadmap: docs/roadmap/06-exercises-advanced.md
created: 2026-10-17
---

# Tracking type sweep of the catalog

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

Almost every catalog exercise still asks for weight × reps, even when it is a
plank, a run, a carry or a push-up. The person has to fight the set row (type
seconds into "reps", leave weight at 0) or create a custom copy of an
exercise that already exists. Spec 0021 gave exercises a **tracking type**
but only fixed a short hand-picked list (44 exercises); the rest of the
catalog of roughly 900 exercises was never classified, and nobody can fix one
afterwards: today there is no way to change the tracking type of an exercise
once it exists, catalog or custom.

Verified (2026-10-17):

- The five tracking types are: weight & reps, reps only, time, weight & time,
  distance & time. **Reps only already exists**, so bodyweight movements have
  a home; there is no "weight & distance" type.
- The catalog comes from wger, one language per exercise (mostly Spanish,
  some English, a few Italian or German); wger also provides the other
  languages' names for the same movement, plus a category (e.g. cardio) and
  equipment (e.g. "none (bodyweight exercise)").
- A saved workout is shown from the values it holds, not from the exercise's
  current type (0021 EF-1), and the active workout keeps the type each
  exercise had when it was added.
- The exercise detail screen lets anyone mark a catalog exercise (or their
  own custom one) as unilateral (0022). Nothing similar exists for the
  tracking type.

## Why now

Owner feedback after the device test (2026-10-17): *"Hay que hacer un barrido
para actualizar los ejercicios que deben ser de tiempo, distancia, distancia y
tiempo, peso etc."* Timed and distance sets (0021) are only useful if the
exercises people pick from the catalog actually use them. Every week of
logging under the wrong type adds sets that later count for nothing in
"last time" and records.

## Users and scenarios

- **Owner reviews before anything changes.** The owner wants to read the full
  proposed classification — every catalog exercise, its current type, the
  proposed type and why — correct the few that are wrong, and only then apply
  it on the server.
- **Plank from the catalog.** Someone adds "Plancha" to a routine and the set
  row asks for time, not weight × reps.
- **Rower finisher.** "Rowing Machine" asks for distance and time.
- **Push-ups.** "Flexiones" asks for reps only.
- **Weighted pull-ups.** "Dominadas" keeps weight & reps, because people add
  load to them; the weight stays optional.
- **One wrong call.** After the sweep, the owner finds "Mountain climbers" set
  to reps but logs them by time. On the exercise detail they change it to time
  once, and no later sweep puts it back.
- **Old planks.** The owner logged planks for weeks as "0 kg × 60". After the
  plank becomes timed, those old workouts still read exactly as they did.
- **Own exercise.** Someone's custom "Plank" made as weight & reps stays
  exactly as they created it.

## Scope

### In scope
- A classification of every catalog exercise into one of the five existing
  tracking types, using everything the catalog source says about it (its
  names in every language provided, category, equipment) and the hand-picked
  list of 0021.
- A review report the owner can read and correct before anything is changed.
- Applying the reviewed classification, safely and repeatably.
- Changing the tracking type of a single exercise by hand, from the exercise
  detail, afterwards.
- Remembering that a type was set by a person, so no sweep overrides it.

### Out of scope
- New tracking types — no "weight & distance" (carries stay weight & time, as
  in 0021), no "assisted" or "weighted bodyweight" type that counts body
  weight into volume. Follow-up spec if the owner wants them.
- Reclassifying **custom exercises** — they keep the type their creator chose.
- Rewriting, converting or deleting **already-logged sets** (e.g. turning
  "60 reps" of a plank into 60 seconds) — performed work is never rewritten
  (constitution Article 2).
- Converting routine targets of a reclassified exercise into the new type's
  targets.
- Marking exercises as unilateral in bulk — separate attribute (0022).
- Translating or renaming catalog exercises, merging duplicates, or fixing
  categories and muscle groups — separate data problems.
- Per-person tracking types for the same catalog exercise (one person's plank
  timed, another's weighted) — the type stays a property of the exercise.

## Functional requirements

### Classification and report

- **FR-1.** The system MUST propose a tracking type for every catalog exercise,
  and the report MUST list each catalog exercise exactly once with: its name
  as stored, its name in the other languages the source provides (English at
  least, when available), category, equipment, current type, proposed type,
  the reason (which rule or list decided it) and whether the call is
  **certain** or **uncertain**.
- **FR-2.** The report MUST give totals per proposed type and the number of
  exercises that would change, and MUST list first the exercises that would
  change and are already used in a routine or a saved workout, with how many.
- **FR-3.** Exercises the classification cannot decide with confidence MUST be
  proposed as weight & reps (today's default) and marked uncertain, never
  guessed into another type.
- **FR-4.** The owner MUST be able to correct any proposal (choose a different
  type for named exercises) before applying, and the corrections MUST survive
  later runs, so a reviewed call is not lost when the sweep is run again.
- **FR-5.** Producing the report MUST NOT change anything. Changes happen only
  in a separate, explicit apply step.

### Applying

- **FR-6.** Applying MUST change only catalog exercises whose type was set by
  the system (the default or an earlier sweep); it MUST NOT change an exercise
  whose type a person set, and MUST NOT touch custom exercises at all.
- **FR-7.** Applying the same reviewed classification twice MUST change
  nothing the second time, and MUST say so.
- **FR-8.** Applying MUST report what it changed (exercise, old type, new
  type) and what it skipped and why (set by a person, not found in this
  database).
- **FR-9.** Applying SHOULD keep what it changed so the owner can undo a run;
  an undo MUST NOT revert an exercise whose type was changed by a person
  since that run.
- **FR-10.** The sweep MUST supersede 0021's hand-picked list: those 44
  exercises are part of the classification and the report like any other.
- **FR-11.** Catalog exercises added after the sweep (a new catalog import)
  arrive as weight & reps and MUST be picked up by running the sweep again.

### Fixing one exercise by hand

- **FR-12.** The exercise detail MUST let the person change the tracking type
  of a catalog exercise and of a custom exercise they created, with the same
  five choices offered when creating a custom exercise.
- **FR-13.** A type changed by hand MUST be remembered as set by a person, and
  every later sweep MUST leave it as it is (FR-6).
- **FR-14.** Before confirming a change on an exercise that already has saved
  workouts, the person MUST be told that past workouts keep what was logged
  and that "last time" and records only use sets of the new type.

### Effect on what is already logged

- **FR-15.** Saved workouts of a reclassified exercise MUST keep showing every
  set exactly as it was logged (in History, the workout detail, the
  exercise's recent sessions and the shared text of 0028).
- **FR-16.** Training volume of saved workouts MUST NOT change because an
  exercise was reclassified.
- **FR-17.** "Last time" and records for a reclassified exercise MUST use only
  the values of its new type; older sets without those values MUST NOT show
  as a misleading previous value (e.g. "0:00").
- **FR-18.** A routine that uses a reclassified exercise MUST keep its sets,
  order, rest and superset; it shows the new type's fields with empty
  targets, and its old targets are kept, not deleted.

## Behaviour when things go wrong

- **EF-1.** An exercise in the reviewed classification that does not exist in
  the database being updated MUST be reported and skipped; the rest is still
  applied.
- **EF-2.** A correction naming a tracking type that does not exist MUST stop
  the apply step before changing anything, and say which entry is wrong.
- **EF-3.** If applying stops halfway (lost connection, server restart), every
  exercise MUST be left either with its old type or its new type, never in
  between, and running apply again MUST finish the job (FR-7).
- **EF-4.** A workout in progress while the sweep is applied MUST keep the
  types its exercises had when they were added; the change is seen in the next
  workout.
- **EF-5.** A device that loaded the catalog before the sweep MUST show the new
  types the next time it loads the catalog; nothing logged with the old type
  in between is lost or reinterpreted.
- **EF-6.** A person trying to change the type of someone else's custom
  exercise MUST be refused.
- **EF-7.** An exercise marked unilateral that moves to a type without reps
  MUST keep the mark but MUST be flagged in the report, since left/right only
  applies to reps.

## Domain impact

- **Tracking type** (0021) keeps its meaning. It gains a notion of **who set
  it**: the system (default or sweep) or a person (at creation or by hand).
  Only system-set types can be changed by a sweep.
- New glossary term **tracking type sweep**.
- **Exercise**: catalog exercises change type in bulk; custom exercises do
  not. **WorkoutSet**, **WorkoutSession**, **training volume** and saved data
  are read, never changed. **RoutineExercise** targets are kept as they are.
- Records and "last time" (0013, 0023) already follow the exercise's type;
  they now see more exercises with time or distance.
- Same permission rule as the unilateral mark (0022): any signed-in person can
  change a catalog exercise's type; only the creator can change a custom one.

## Acceptance criteria

- **AC-1.** Given the catalog, when the report is produced, then every catalog
  exercise appears exactly once with current type, proposed type, reason and
  certainty, the totals add up to the catalog size, and no exercise's type
  has changed.
- **AC-2.** Given the reviewed classification, when it is applied, then planks,
  holds and hangs are time; running, walking, rowing, cycling and elliptical
  are distance & time; carries are weight & time; push-ups, sit-ups and
  similar bodyweight-only moves are reps only; pull-ups, dips and every
  uncertain exercise stay weight & reps.
- **AC-3.** Given the classification was just applied, when it is applied
  again, then nothing changes and the run says 0 changed.
- **AC-4.** Given a custom exercise "Plank" with weight & reps, when the sweep
  is applied, then it is still weight & reps.
- **AC-5.** Given the owner changed "Mountain climbers" to time by hand, when
  the sweep proposes reps and is applied, then it stays time and the run lists
  it as skipped, set by a person.
- **AC-6.** Given a saved workout with "Plancha" logged as 0 kg × 60, when
  "Plancha" becomes time, then History and the workout detail still show
  0 kg × 60 and that workout's volume is unchanged; the next workout's
  plank row shows no previous value until a time is logged.
- **AC-7.** Given a routine with "Plancha" 3 × 8–10 reps, when "Plancha"
  becomes time, then the routine still has 3 sets with the same rest, showing
  empty time targets.
- **AC-8.** Given the owner corrected "Burpees" to time in the review, when
  the report is produced again, then "Burpees" is proposed as time with the
  reason "owner correction".
- **AC-9.** Given a run applied by mistake, when it is undone, then every
  exercise it changed is back to its previous type, except those a person has
  changed since.

## Non-functional requirements

- **Run with the owner.** The sweep runs against the owner's server once, after
  the owner has reviewed the report; it is not part of a normal deploy or of
  database setup, because it is data, not schema (constitution Article 5).
- **Platform reach.** Changing the type by hand works on iOS, Android and web.
- **Older apps.** An app version from before this spec keeps working against
  the swept catalog (it already knows the five types from 0021).

## Assumptions

- **[ASSUMPTION: no new tracking type is needed. "Reps only" already covers
  bodyweight movements; carries stay weight & time; "assisted" or "weighted
  bodyweight" with body weight counted into volume is left for a follow-up
  spec.]**
- **[ASSUMPTION: bodyweight movements that people commonly load (pull-ups,
  chin-ups, dips, lunges, step-ups, hip thrusts, back extensions) stay weight &
  reps, with the weight read as added load and left empty when there is none.
  Only movements rarely loaded (push-up variants, sit-ups, crunches, burpees,
  jumping jacks, air squats, leg raises, box jumps) become reps only.]**
- **[ASSUMPTION: rule of thumb per type — time: planks, isometric holds,
  L-sits, wall-sits, hangs, stretches and mobility holds, jump rope;
  distance & time: running, walking, rowing machine, cycling, elliptical,
  swimming, ski machine; weight & time: carries, sled pushes and pulls; reps
  only: as above; everything else weight & reps. Ambiguous moves (mountain
  climbers, battle ropes, stair climber) take the type most people log them
  with, marked uncertain, and the owner corrects them in the review.]**
- **[ASSUMPTION: classification reads the names in every language the
  catalog source provides for the movement, not only the stored one, so a
  Spanish-named exercise is classified by its English name too.]**
- **[ASSUMPTION: catalog types are shared by everyone on the server, like the
  unilateral mark (0022), and any signed-in person may change them. Fine for
  today's single-household server; revisit with private custom exercises
  (0015) and before distribution.]**
- **[ASSUMPTION: every catalog type today counts as set by the system (nobody
  can change one yet), and every custom exercise's type counts as set by a
  person (chosen at creation). So the first sweep may change any catalog
  exercise, including the 44 of 0021.]**
- **[ASSUMPTION: old sets are never converted, even when the intent is
  obvious (a plank's "60 reps" meaning 60 seconds). The person keeps the
  record as logged; a manual edit of a past workout is the way out if one
  exists.]**
- **[ASSUMPTION: the review and corrections happen on the report and a list
  of corrections the owner edits, not in an in-app screen; one person reviews
  ~900 rows once.]**

## Open decisions

None. Gates delegated by the owner (2026-10-16); calls above recorded as
assumptions. The ones most worth the owner's glance before the sweep is
applied: which bodyweight moves stay weight & reps (second assumption), and
whether any signed-in person should be able to change a catalog exercise's
type (fifth assumption).

## Related

- Builds on: 0021 (tracking types; supersedes its hand-picked list), 0022
  (unilateral mark, same permission rule), 0023 (records by type), 0013
  ("last time" and performed sets), 0026 (same review-then-apply pattern for
  catalog data), 0020 (custom exercises), 0015 (private custom exercises).
- Roadmap: docs/roadmap/06-exercises-advanced.md
- Constitution articles engaged: 1, 2, 3, 5.
