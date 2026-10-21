---
id: 0014
title: Workout save integrity
status: done
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-10-16
decided: 2026-10-16
---

# Workout save integrity

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

Saving a finished workout is fragile in four ways, each of which costs the
person either their workout or the trust in their history:

- **Duplicates on retry.** If the save reaches the server but the answer never
  reaches the phone (bad gym signal, app closed mid-request), the person sees
  an error, taps Finish again, and the same workout is saved twice. History,
  volume and frequency all double-count it.
- **A deleted routine makes the workout unsaveable.** Deleting the routine of
  the active workout is allowed, and afterwards the save is refused because the
  workout points at a routine that no longer exists. The sets were lifted; the
  record is lost.
- **Foreign references are accepted.** A save may point at another person's
  routine or routine slot, and the server links it.
- **Bad dates crash instead of being refused.** An unreadable start or end time
  makes the server fail with a generic error instead of a clear refusal, and an
  end before the start is accepted.

## Why now

Spec 0010 keeps the active workout on the device across restarts. From then on,
retrying a save after reopening the app becomes the normal recovery path, so a
retry must never create a duplicate, and a stored workout must never become
unsaveable because its routine changed in the meantime. 0010's persistence
task must not ship before this one.

## Users and scenarios

- **Bad signal at the gym.** Someone taps Finish, the request goes through, but
  the answer is lost. They see an error and tap Finish again. They expect one
  workout in history.
- **Cleaning up routines mid-workout.** Someone with a workout in progress
  opens the routines list and tries to delete or edit that workout's routine.
  The app must not let them break the workout they are doing.
- **Routine removed elsewhere.** The routine disappears by another path (a
  second device, an old app version) while the workout is in progress. When the
  person finishes, the workout is saved anyway.
- **Accidental tap.** Someone taps Delete on a routine's detail screen by
  mistake. They expect to be asked first, as in the routines list.

## Scope

### In scope
- A finished workout carries an identity chosen on the device when the workout
  starts; saving the same identity again never creates a second workout.
- The link from a saved workout to its routine and routine slots is optional
  provenance: kept when it points at the person's own existing records, dropped
  otherwise. The workout is saved either way.
- Exercises referenced by a saved workout must exist; otherwise the save is
  refused with a clear reason.
- Start and end times are validated: both readable, end not before start.
- The routine of the active workout cannot be edited or deleted from any entry
  point in the app.
- Deleting a routine asks for confirmation from every entry point.

### Out of scope
- Saving a finished workout without a connection — roadmap area 8 (offline
  support); this spec only makes retries safe.
- Custom exercises being private to their creator — spec 0015, which will
  narrow "the exercise exists" to "the exercise is visible to this person".
- Blocking the deletion of a custom exercise that the active workout uses —
  rare, and the refusal is clear; spec 0010's EF-5 lets the person discard.
  Revisit if it happens in practice.
- Editing or deleting a saved workout — no such feature exists.
- Rejecting workouts dated in the future — phone clocks drift; nothing in the
  product depends on it today.
- Cleaning up duplicates already in history — none are known; if any exist,
  that is a one-off script (constitution Article 5), not this spec.

## Functional requirements

- **FR-1.** Every workout MUST receive, when it starts, an identity that stays
  the same for as long as it is the active workout, including every retry of
  its save.
- **FR-2.** When a workout is saved with an identity that the same person has
  already saved, the system MUST NOT create a second workout, and MUST answer
  as a success with the workout that was saved the first time.
- **FR-3.** Two different people MUST be able to save workouts whose identities
  happen to be equal without affecting each other.
- **FR-4.** When a saved workout refers to a routine or a routine slot that does
  not exist or belongs to someone else, the system MUST save the workout
  without that link, and MUST NOT link to another person's records.
- **FR-5.** When a saved workout refers to an exercise that does not exist, the
  system MUST refuse the save and say that an exercise is unknown.
- **FR-6.** The system MUST refuse a save whose start time or end time cannot
  be read, or whose end time is before its start time, and say why.
- **FR-7.** The app MUST NOT offer editing or deleting the routine of the
  active workout from any screen or menu, and MUST say why when the option is
  withheld.
- **FR-8.** The app MUST ask for confirmation before deleting a routine, from
  every entry point.
- **FR-9.** A save made by an app version that does not send an identity MUST
  keep working as today (no protection against duplicates for that save).

## Behaviour when things go wrong

- **EF-1.** When the first save succeeded but its answer was lost, the retry
  MUST end in the person seeing the workout as saved, exactly once in history.
- **EF-2.** When two saves of the same workout arrive at the same time, exactly
  one workout MUST be stored and both MUST be answered as a success.
- **EF-3.** When the routine of the active workout was deleted by any means
  before Finish, the workout MUST still be saved, with its sets, and appear in
  history and progress.
- **EF-4.** When a retry carries different contents than the first save (e.g.
  the person edited a set between attempts), the first saved version MUST be
  kept. [ASSUMPTION: first save wins]

## Domain impact

Adds one concept to **WorkoutSession**: a **workout identity** chosen on the
device, unique per person, used only to recognise a repeated save. Changes the
meaning of a session's link to its **Routine** and **RoutineExercise**: from a
required, unchecked reference to **optional provenance** that is kept only when
it is the person's own. Extends the **active workout** invariant: its routine is
locked from editing *and deletion*. Templates and performed work stay separate
(Article 2): nothing here writes to a routine.

## Acceptance criteria

- **AC-1.** Given a workout whose save reached the server, when the same save
  is sent again, then history shows that workout once and the second attempt
  is answered as a success.
- **AC-2.** Given a workout in progress whose routine was deleted, when the
  person finishes it, then it is saved and appears in history.
- **AC-3.** Given a save pointing at another person's routine, when it is
  stored, then it has no routine link, and the other person's routine is
  untouched.
- **AC-4.** Given a save with an end time before its start time, or an
  unreadable time, when it is sent, then it is refused with a reason and
  nothing is stored.
- **AC-5.** Given a save referring to an exercise that does not exist, when it
  is sent, then it is refused with a reason and nothing is stored.
- **AC-6.** Given a workout in progress, when the person opens its routine's
  menu in the routines list or its detail screen, then neither edit nor delete
  is available, and the screen says the routine is locked while the workout is
  in progress.
- **AC-7.** Given no workout in progress, when the person taps Delete on a
  routine's detail screen, then they are asked to confirm, and cancelling keeps
  the routine.

## Non-functional requirements

- **Migration of existing data:** existing workouts have no identity and keep
  none; the uniqueness applies only to workouts that carry one. No rows are
  rewritten.
- Platform reach: iOS, Android and web.

## Assumptions

- **[ASSUMPTION: first save wins]** (EF-4). A retry is the same workout; if its
  contents differ, the stored version is the one the server accepted first.
  The alternative — overwrite on retry — would turn a save into an edit, which
  no part of the product supports.
- **[ASSUMPTION: dropping a foreign or missing routine link is silent]** (FR-4).
  The person cannot act on it and the workout itself is intact; refusing would
  lose real training data for a cosmetic link.
- **[ASSUMPTION: an unknown exercise is refused, not dropped]** (FR-5). Dropping
  the exercise would silently lose sets; refusing keeps the workout on the
  device, and spec 0010 EF-5 gives the person a way out.

## Open decisions

None. Decided 2026-09-24 by the owner: block deletion of the active workout's
routine in the app, and treat the routine link as optional provenance when
saving. The rest was decided 2026-10-16 under the owner's standing delegation
and is recorded above as assumptions, each reversible on its own.

## Related

- Prerequisite for spec 0010 task 7 (persisting the active workout).
- Closes the gap recorded in retro 0004 (deleting the active workout's routine)
  and, for workouts, spec 0001 FR-7 (writes referring to another user's
  records).
- Spec 0015 tightens FR-5 once custom exercises are private.
- Roadmap: `docs/roadmap/01-live-workout-logging.md`
- Constitution articles engaged: 1, 2, 3, 5, 8

## Verified against the code (2026-10-16)

- The save connects the routine, routine slots and exercises by their public
  id with no ownership filter. An unknown reference makes the whole save fail
  and the server answers "unknown exercise or routine".
- Start and end times are only checked to be non-empty strings; an unreadable
  value reaches the database layer and fails as a server error. End before
  start is accepted.
- There is no identity on a saved workout, and the device-side workout id is
  derived from the routine id, so two workouts of the same routine share it —
  it cannot serve as the identity.
- The routine detail screen hides Edit while its workout is in progress, but
  shows Delete, and Delete acts without confirmation. The routines list's menu
  offers Edit and Delete for every routine, active or not, with confirmation
  only on Delete.
- The finish flow already shows the server's refusal reason to the person.
