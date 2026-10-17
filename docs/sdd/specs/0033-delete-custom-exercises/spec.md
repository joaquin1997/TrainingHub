---
id: 0033
title: Delete custom exercises
status: ready
roadmap: docs/roadmap/06-exercises-advanced.md
created: 2026-10-17
---

# Delete custom exercises

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

The owner asked (2026-10-17): *"Más adelante que haya opción de borrar mis
ejercicios propios"* — later on, let me delete my own exercises. Today a
custom exercise, once created, stays in the catalog and every picker forever:
a typo, a duplicate or a machine from a gym no longer visited cannot be got
rid of. Spec 0020 made creating exercises easy and explicitly left deleting
as a follow-up.

Verified against the current behaviour (2026-10-17):

- An exercise is referenced by routine slots and by the exercises of saved
  workouts. Both refuse to lose their exercise, so a custom exercise that has
  ever been used **cannot be removed at all** without first destroying
  routines or history.
- A saved workout shows each exercise's name by looking at the exercise
  itself; it keeps no copy of the name. Removing the exercise outright would
  leave history with nameless entries.
- A workout being saved that mentions an exercise the server no longer knows
  is rejected permanently (spec 0014). An exercise removed outright while it
  sits in the active workout would make that workout unsaveable.
- Favourites and the custom photo (spec 0026) belong to the exercise and
  would go with it.
- Custom exercises become private with spec 0015 (owner decision
  2026-10-17), which this spec depends on: only the creator sees and uses a
  custom exercise. The only other people who can still have it are those who
  already held it in their routines or saved workouts before 0015 (a **held
  exercise**, readable there and never pickable).

## Why now

It does not block anything — the owner marked it as *later*. It is written
now so the decision about history is recorded while spec 0020 and 0026 are
fresh. It is planned after spec 0015, which sets the ownership rules it
relies on. Each new custom exercise created by mistake makes the
catalog a little noisier until this ships.

## Users and scenarios

- **Typo.** Someone created "Press Landmie" by mistake, never used it, and
  wants it gone.
- **Old gym.** Someone created "Hammer row (gym Centro)", used it in 30
  workouts and one routine, changed gym, and no longer wants it in the
  pickers — but their history of those 30 workouts must still read correctly.
- **Duplicate.** Someone has two custom exercises for the same movement and
  wants to keep only one. (Merging the history of both is out of scope.)
- **Mid-workout.** Someone deletes a custom exercise from the Exercises tab
  while the active workout still contains it.

## Scope

### In scope
- Deleting a custom exercise, by its creator, from the exercise's detail.
- A confirmation that names the impact before anything happens.
- Keeping every saved workout readable, with the exercise's name, after the
  deletion.
- What happens to routines and to the active workout that contain it.
- Removing the exercise's photo and favourites.

### Out of scope
- Deleting or hiding **catalog (system) exercises** — they are shared by
  everyone.
- **Editing** a custom exercise (rename, change muscles or tracking type) —
  separate follow-up.
- **Restoring** a deleted exercise, or an undo after confirming — the
  confirmation is the safety net. Could be added later because history keeps
  the exercise (see Assumptions).
- **Merging** two exercises and their history into one.
- **Erasing history**: deleting the saved workouts or sets that used the
  exercise. Workouts are deleted one by one where that already exists.
- Bulk deletion of several exercises at once.
- Who can see custom exercises — spec 0015.

## Functional requirements

- **FR-1.** The creator of a custom exercise MUST be able to delete it from
  the exercise's detail.
- **FR-2.** The system MUST NOT offer deletion of a catalog exercise, nor of a
  held exercise (spec 0015), and MUST refuse such a deletion if it is
  attempted anyway. For anyone but its creator a custom exercise does not
  exist (0015 FR-2), so their deletion attempt is answered as not found.
- **FR-3.** Before deleting, the system MUST ask for confirmation, naming the
  exercise and its impact on the person's own data: the number of their
  routines that contain it and the number of their saved workouts that
  contain it (e.g. "Used in 1 routine and 30 workouts. Your history will keep
  it."). When it is in neither, the confirmation MUST say so.
- **FR-4.** When the exercise appears in the person's active workout, the
  confirmation MUST say so as well.
- **FR-5.** After deletion, the exercise MUST NOT appear in the Exercises tab,
  in any exercise picker, in the favourites filter or in search.
- **FR-6.** After deletion, every saved workout that contained the exercise
  MUST still show it, under its name, with all its sets, in history, in the
  workout detail, in sharing (spec 0028) and in progress and records for that
  exercise.
- **FR-7.** A routine that contains the exercise MUST keep it, with its sets,
  targets, rest and superset, shown as deleted; the routine MUST still start
  and its workout MUST still save. The person MAY replace it (spec 0020) or
  remove it from the routine as with any other exercise.
- **FR-8.** An active workout that contains the exercise MUST keep it, with
  every set already typed or done, and MUST save normally when finished.
- **FR-9.** Deletion MUST remove the exercise's photo; wherever a photo would
  show, the neutral tile shows instead.
- **FR-10.** Deletion MUST remove the exercise from every favourites list.
- **FR-11.** After deletion, creating a custom exercise with the same name
  MUST create a new exercise, never bring back the deleted one.
- **FR-12.** A deleted exercise MUST NOT be addable to a routine or a workout
  from any picker; it stays only where it already was.

## Behaviour when things go wrong

- **EF-1.** Without a connection, deletion MUST fail with a clear message and
  change nothing; it is not queued for later.
- **EF-2.** When the exercise was already deleted (e.g. from another device),
  the system MUST treat the deletion as done and refresh the lists, not show
  an error.
- **EF-3.** When someone who is not the creator attempts a deletion, the
  system MUST answer as for an exercise that does not exist (spec 0015) and
  change nothing.
- **EF-4.** When the photo cannot be removed but the exercise can, the
  deletion still succeeds and the photo is never shown again.
- **EF-5.** A workout whose save was waiting (offline or retrying) when one of
  its exercises was deleted MUST still save with that exercise.
- **EF-6.** When the counts in the confirmation cannot be fetched, the system
  MUST NOT delete without them; it says the impact could not be checked and
  lets the person retry.

## Domain impact

- **Exercise** gains a lifecycle: a custom exercise can become a **deleted
  exercise** (new glossary term). It leaves the catalog and the pickers but
  keeps existing for the **WorkoutSessions**, **WorkoutExercises** and
  **RoutineExercises** that already point at it.
- **WorkoutSession / WorkoutSet**: unchanged and never rewritten — Article 2.
  Deleting a template-side thing must not change performed work.
- **Routine / RoutineExercise**: unchanged; a slot may now point at a deleted
  exercise.
- **Active workout**: unchanged; may contain a deleted exercise until saved.
- **Personal records, session points, training volume** keep counting the
  deleted exercise's sets — they are derived from performed work, which
  stays.
- Catalog exercises are unaffected.

## Acceptance criteria

- **AC-1.** Given my custom exercise never used, when I delete it and
  confirm, then the confirmation said it is not used anywhere, and it is gone
  from the Exercises tab, the pickers and search.
- **AC-2.** Given my custom exercise used in 1 routine and 30 saved workouts,
  when I open delete, then the confirmation says "1 routine" and "30
  workouts"; when I cancel, nothing changes.
- **AC-3.** Given AC-2 confirmed, when I open any of those 30 workouts in
  history, then the exercise shows under its name with every set; and its
  progress and records are still shown.
- **AC-4.** Given AC-2 confirmed, when I open the routine, then the exercise is
  still there with its targets, marked as deleted; when I start the routine
  and finish the workout, then it saves.
- **AC-5.** Given an active workout containing my custom exercise with 2 done
  sets, when I delete the exercise from the Exercises tab, then the
  confirmation mentions the active workout; back in the workout the 2 sets
  are still there, and finishing saves them.
- **AC-6.** Given a deleted exercise that had a photo, when I view a workout
  that used it, then the neutral tile shows instead of the photo.
- **AC-7.** Given a catalog exercise, or a held exercise in my history, when
  I view it, then there is no delete option.
- **AC-8.** Given I deleted "Hammer row", when I create a new custom exercise
  named "Hammer row", then a new, empty exercise is created and the old
  history stays with the deleted one.
- **AC-9.** Given no connection, when I confirm a deletion, then I see an error
  and the exercise is still in the catalog.

## Non-functional requirements

- Same behaviour on iOS, Android and web.
- **Retention.** A deleted exercise's name and settings are kept for as long
  as any saved workout or routine points at it. A deleted exercise that
  nothing points at may be removed for good.

## Assumptions

- **[ASSUMPTION: delete = archive, never block.]** A used custom exercise is
  hidden from the catalog and pickers but kept for history (FR-5, FR-6); one
  never used may be removed entirely. Blocking deletion of any exercise that
  is used was rejected: the "Old gym" scenario — the main reason to delete —
  would then be impossible without wiping history, and history is protected
  by Article 2 and spec 0013. Cheap to reverse: an archived exercise can be
  restored later.
- **[ASSUMPTION: routines keep the deleted exercise (FR-7) instead of losing
  the slot.]** Removing it silently would destroy targets and could leave a
  routine empty; the confirmation tells the person how many routines to tidy,
  and replace (spec 0020) already exists.
- **[ASSUMPTION: the active workout is never altered by a deletion (FR-8).]**
  Sets already logged are performed work; losing them would contradict spec
  0013 and 0020 EF-1.
- **[ASSUMPTION: the photo is removed at deletion (FR-9), even though history
  still shows the exercise.]** The person is asking to get rid of it; the name
  is what keeps history readable, the photo is not.
- **[ASSUMPTION: counts cover only the creator's own routines and workouts.]**
  With spec 0015 nobody else can pick the exercise. The only others who may
  have it are those holding it from before 0015; their counts are not shown
  (that would leak their data), and archive guarantees nothing of theirs
  breaks — the exercise stays a held exercise for them, readable exactly as
  in the creator's history.
- **[ASSUMPTION: this spec depends on 0015 and ships after it.]** Decided by
  the owner's privacy rule of 2026-10-17 (spec 0015), which closes the
  question of other people using a deleted exercise. A deleted exercise
  remains private like any other custom exercise.
- **[ASSUMPTION: a custom exercise whose creator no longer exists cannot be
  deleted by anyone.]** Rare, and no one has the right to decide for it.
- **[ASSUMPTION: no undo after confirming.]** Kept out of scope to keep the
  slice small; archive makes a restore feature possible later.
- **[ASSUMPTION: favourites are removed for everyone (FR-10).]** A favourite
  of an exercise that can no longer be picked has no use.

## Open decisions

None. Questions the owner may want to revisit (each recorded above as an
assumption, cheap to reverse):

- Should a routine lose the deleted exercise instead of keeping it marked as
  deleted?
- Should deleted exercises be restorable from somewhere (a "deleted
  exercises" list)?

## Related

- Builds on: 0007 (exercise catalog), 0020 (create and replace; deletion was
  its follow-up), 0026 (custom photo, creator-only).
- Depends on: 0015 (custom exercises are private; held exercises).
- Related: 0013 (performed work), 0014 (workout save integrity), 0028
  (share).
- Roadmap: docs/roadmap/06-exercises-advanced.md
- Constitution articles engaged: 1, 2, 3, 5.
