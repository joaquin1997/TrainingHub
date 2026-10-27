---
id: 0049
title: Correct a saved workout
status: draft
amends: 0005
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-10-27
---

# Correct a saved workout

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

A saved workout cannot be changed. A mistake made at the gym — 100 typed
instead of 10, a set never ticked so it does not count, the wrong exercise
picked — stays in History for good, and because progress, records and "last
time" are derived from saved workouts, the mistake keeps feeding every figure
and every hint the person trusts. There is not even a way to delete a workout
that should not be there.

The owner's list says only *"editar erratas"*. This spec reads it as **correcting
mistakes in saved workouts**; the other reading (fixing typos in the app's own
texts) is raised in the open decisions.

## Why now

0013 made progress count only what was performed, which made a forgotten tick
costly: a set not ticked in the gym never counts. Since the app derives
everything from saved workouts, one wrong number is permanent. The retro-spec
(0005) lists "a saved workout is immutable history" as an invariant; this spec
changes it on purpose, so it needs its own decision rather than a quiet edit.

## Users and scenarios

- **Typed 100 instead of 10.** The person notices in History the next day and
  corrects the set. Progress, records and "last time" follow.
- **Forgot to tick.** A set was done but never ticked, so it does not count. The
  person marks it done afterwards.
- **Wrong exercise.** They logged "Leg press" for what was the hack squat and
  swap the exercise, keeping the sets.
- **Workout that should not exist.** A test workout, or one saved twice; the
  person deletes it.

## Scope

### In scope
- Changing the values of a saved workout's sets: weight, reps (including per side),
  time, distance, set type, done or not done.
- Changing a saved workout's notes.
- Open, see *Open decisions*: adding and removing sets, changing the exercise of a
  set group, changing the date or the duration, and deleting the whole workout.
- Everything derived (progress, records, volume, "last time", the week strip,
  streak, the home widget) reflecting the correction.

### Out of scope
- Editing routines — they are separate templates and already editable (Article 2).
- Editing someone else's workout — workouts belong to one person.
- A history of edits or an undo of a correction — a follow-up if corrections turn
  out to be frequent.
- Changing a workout that was written to the person's health app — the health
  record is left as it was (see Assumptions).
- Editing while the workout is still active — the active workout is already
  editable.
- Anything else the owner may have meant by "erratas" — see the open decisions.

## Functional requirements

- **FR-1.** From a saved workout's detail, the person MUST be able to correct the
  values of its sets and its notes, and to mark a set done or not done.
- **FR-2.** A correction MUST be saved only when the person confirms it, and
  MUST show the previous values until then. Backing out MUST change nothing.
- **FR-3.** After a correction, progress per exercise, personal records,
  estimated 1RM, training volume, weekly volume, "last time", streak and the
  widget MUST all read the corrected workout, as the next time they are derived
  (0006, 0013).
- **FR-4.** A corrected workout MUST keep its date, its position in History and
  its routine link unless the person changes them (see open decisions).
- **FR-5.** A saved workout MUST keep following the rules for saved workouts:
  at least one performed set (0005), the warm-up and record rules (0013), a
  weight in kilograms in storage (Article 4).
- **FR-6.** A correction MUST be possible only by the person who owns the
  workout.
- **FR-7.** A correction MUST NOT touch the routine the workout came from, nor any
  other workout (Article 2).
- **FR-8.** When a correction changes which records a workout beat, the workout's
  summary and History MUST show the records it beats now, without comment (0032
  FR-23's approach: the derived result is authoritative).

## Behaviour when things go wrong

- **EF-1.** When the correction would leave the workout with no performed set,
  the system MUST refuse it and say so (0005: no empty workouts).
- **EF-2.** When saving the correction fails (no connection, server error), the
  person's edits MUST stay on screen so they can try again, and nothing is
  half-saved.
- **EF-3.** When the workout was changed from another device since the person
  opened it, the system MUST say so and show the newer values rather than
  overwrite them. `[ASSUMPTION: last-writer-wins is not acceptable; the app has a
  handful of users so a simple "changed since you opened it" notice is enough.]`
- **EF-4.** When a corrected workout is the one a share image or text was made
  from, nothing already shared changes.
- **EF-5.** When the workout is the one the active workout was started from
  (the same routine), the active workout MUST be unaffected.

## Domain impact

Changes the meaning of **WorkoutSession**: it was an immutable record, it becomes
an editable one. Retro-spec 0005's invariant "a saved workout is immutable
history" is amended: it holds against **Routine** edits (Article 2), no longer
against the owner's own corrections. **Performed set**, **personal record**,
**estimated 1RM** and **training volume** keep their meaning; they are derived and
never stored, so a correction needs no recomputation step and no migration of
derived data. New glossary term **correction**. Needs a way to update a saved
workout on the server (plan).

## Acceptance criteria

- **AC-1.** Given a saved workout with a set typed as 100 kg × 5, when the weight
  is corrected to 10 kg and confirmed, then the detail shows 10 kg, the exercise's
  progress no longer shows 100 kg and its heaviest-weight record is the true best.
- **AC-2.** Given a set not ticked in a saved workout, when it is marked done and
  saved, then it counts in volume, progress and "last time".
- **AC-3.** Given a correction started and then abandoned, then the workout is as
  it was.
- **AC-4.** Given a correction that would leave no performed set, then it is
  refused with a message and nothing changes.
- **AC-5.** Given a correction saved offline, then the edits stay on screen and
  can be saved when the connection returns.
- **AC-6.** Given workouts saved before this feature, then they can be corrected
  like any other.
- **AC-7.** Given the corrected workout, when the week strip, the streak and the
  widget are next refreshed, then they reflect it.

## Non-functional requirements

- Needs an API change and a redeploy before the app build that uses it.
- No migration of stored data is expected (derived figures are recomputed on
  every view, 0013).
- Corrections to a very old workout MUST work as for a recent one.
- iOS, Android and web.

## Assumptions

- **[ASSUMPTION: the first slice is what the owner's examples need — set values,
  done / not done, set type and notes. The rest of the "in scope" list is open.]**
- **[ASSUMPTION: a correction does not rewrite the workout in the health app
  (0025 FR-5). A workout in Health is a measurement of the session; a typo in a
  weight is not.]**
- **[ASSUMPTION: no "edited" mark is shown on a corrected workout.]**

## Open decisions

- **[NEEDS DECISION: what did "editar erratas" mean? (a) Correct mistakes in
  saved workouts — this spec; (b) fix typos in the app's own texts (Spanish /
  English wording); (c) edit the names or details of exercises (typos in custom
  exercise names). (b) and (c) are small and not specs of this size.]**
- **[NEEDS DECISION: how far can a correction go? Minimum — set values, done,
  type, notes. Further: add or remove sets; add, remove or swap exercises; change
  the date; change the duration; delete the whole workout. Each added power also
  adds risk to records and streaks. Recommended: the minimum plus deleting a
  workout, then the rest only when the owner hits a case.]**
- **[NEEDS DECISION: is deleting a whole saved workout in scope here, or its own
  spec? There is no way to delete one today.]**

## Verified against the code (2026-10-27)

- The server offers: list workouts, read one, "last time" for an exercise, and
  save a new one. There is no update and no delete for a saved workout, and the
  app has no screen to edit one.
- A saved workout's detail shows each set with done / not done; nothing in it is
  editable.
- Progress, records, volume, "last time" and the frequency tiles are all derived
  from saved workouts on every view; none is stored, so a correction is picked up
  on the next derivation (0013, 0006).
- 0013 and 0019 both put editing a saved workout out of scope; nothing has
  specified it yet.

## Related

- Amends: 0005 (retro: "a saved workout is immutable history").
- Builds on: 0013 (derived, performed sets), 0014 (identity of a saved workout),
  0023 (records), 0032 FR-23.
- Roadmap: docs/roadmap/01-live-workout-logging.md
- Constitution articles engaged: 2, 3, 4, 8
