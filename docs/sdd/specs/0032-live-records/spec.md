---
id: 0032
title: Live record badges while logging
status: in-progress
roadmap: docs/roadmap/04-progress-and-prs.md
created: 2026-10-17
decided: 2026-10-17
---

# Live record badges while logging

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

During a workout the person only learns that they beat a record after the
workout is saved, on the summary. While lifting, the moment it matters, nothing
says "that set was a record". The owner, after a device test (2026-10-17):
records should be marked as sets are marked and unmarked done, using weight and
reps (volume), but records must not change until the workout is saved — only
announced.

## Why now

Records by type (0023) are now derived and named after saving, so the rules
already exist; this slice brings them forward into the moment of logging. It is
motivation at the point of effort, and it is the owner's direct feedback from
using the app.

## Users and scenarios

- **More reps at the same weight.** Last month 100 kg × 6 was the best at
  100 kg. Today the person marks 100 kg × 8 done: the set shows a record badge
  straight away.
- **Mistap.** They mark a set done by accident and unmark it: the badge goes
  with it.
- **Typo fixed.** They logged 10 reps, mark it done (record), then correct it
  to 7 (no longer a record): the badge disappears.
- **Two records in a row.** 100 kg × 8 (beats the old 6), then 100 kg × 9: both
  sets beat the record the person walked in with, and both show it.
- **Big day.** The bench sets add up to more volume than any earlier bench
  session: the exercise shows a session-volume record once the running total
  passes it.
- **Basement gym.** No signal in the gym. The records were loaded when the
  workout started, so badges still work; they also survive closing and
  reopening the app mid-workout.
- **Heavy warm-up.** A warm-up set heavier than any working set ever: no badge.

## Scope

### In scope
- A **record badge** on a performed working set, in the active workout, when
  that set beats one or more of the exercise's **starting records**.
- An exercise-level record badge when the exercise's running session volume in
  this workout beats its best session volume.
- A short, non-blocking notice at the moment a set marked done earns a badge.
- Badges appear, change and disappear as sets are marked done, unmarked, edited,
  retyped (warm-up ↔ working), deleted, or as exercises are replaced or removed.
- Loading the starting records when the workout starts (and when an exercise is
  added), and keeping them with the active workout so they survive closing the
  app and need no connection afterwards.
- Every tracking type (0021) and unilateral exercises (0022), using the record
  types those specs already define.

### Out of scope
- Storing or changing any record before the workout is saved — records stay
  derived from saved workouts (0006, 0023); the badge is only a notice.
- Changing which record types exist or how they are judged — 0023, 0021 and
  0022 own that; this spec only applies them earlier.
- Sound, vibration or full-screen celebrations — a badge and a short notice
  only; follow-up if the owner wants more.
- Record badges on the watch (0025) or the live workout status outside the app
  (0012) — the phone screen only.
- Badges for the target values shown on sets not yet done ("you would beat your
  record with 9 reps") — a different feature (suggested targets).
- Reconciling the badges with the saved result after saving — the summary shows
  the saved result, nothing is compared or explained.
- Saving a workout without a connection — roadmap area 8, unchanged (0014).
- Pace, speed or any new record for distance & time exercises.

## Functional requirements

### Starting records

- **FR-1.** When a workout starts, the system MUST load, for every exercise in
  it, the **starting records**: the exercise's current best of each record type
  (0023, 0021) as derived from saved workouts at that moment, including the
  most reps at *every* weight ever performed (not only the top weights shown on
  the progress screen), so that "most reps at a weight" can be judged for any
  weight.
- **FR-2.** When an exercise is added to, or replaced in, the active workout
  (0020), the system MUST load that exercise's starting records at that point.
- **FR-3.** Starting records MUST be kept with the active workout, so that after
  the app is closed and reopened (0010) badges work without a connection.
- **FR-4.** Starting records MUST NOT change during the workout. Sets done in
  this workout never raise them; only saving the workout does (via the saved
  result, next workout).

### When a set earns a badge

- **FR-5.** A set MUST be evaluated only while it is a **performed set** (marked
  done) of a working type. Warm-up sets MUST NEVER earn a badge (0013). Drop and
  failure sets are working sets and are evaluated.
- **FR-6.** A set MUST be evaluated on the values that would be saved for it,
  including values taken from an unedited ghosted placeholder (0013 FR-6).
- **FR-7.** A set MUST earn a badge for a record type when its value for that
  type is strictly greater than the starting record of that type. Equal is not a
  record.
- **FR-8.** An exercise with no starting value for a record type (never
  performed, or never with that kind of set) MUST NOT earn a badge for that type
  — there was nothing to beat (0023 EF-1).
- **FR-9.** The per-set record types, by tracking type, MUST be the ones 0023 and
  0021 already define:

  | Tracking type | Per-set record types |
  |---|---|
  | Weight & reps | heaviest weight; most reps; most reps at that weight or heavier; best set volume; best estimated 1RM |
  | Reps only | most reps |
  | Time | longest time |
  | Weight & time | longest time (the weight is never a weight record) |
  | Distance & time | longest distance; longest time |

- **FR-10.** "Most reps at a weight" MUST follow 0023: the set beats it when its
  reps exceed the most reps any saved set did at that weight or heavier. A
  weight never reached before is a heaviest-weight record, not a reps-at-weight
  one.
- **FR-11.** For a **unilateral exercise** (0022), reps, reps at a weight and
  estimated 1RM MUST read the better side; set volume MUST read both sides
  together.
- **FR-12.** A set's badge MUST depend only on that set's own values and the
  starting records. Marking, unmarking or editing *another* set MUST NOT add or
  remove a per-set badge on this one. Two sets in the same workout that both beat
  the same starting record therefore both show the badge.
- **FR-13.** The badge MUST say which record type(s) the set beat, in the
  person's language and display unit (Article 4). When a set beats several types
  it MUST show the most significant one and how many more, in the display order
  0023 uses.

### Session volume

- **FR-14.** For weight & reps exercises, the exercise MUST show a session-volume
  badge while the summed volume of its performed working sets in this workout
  (both entries if the exercise appears twice; both sides if unilateral) is
  strictly greater than its starting best session volume. Warm-ups never count
  toward it (0023 derives records from working sets).
- **FR-15.** The session-volume badge MUST belong to the exercise, not to a set,
  and MUST appear and disappear as the running total crosses the starting best in
  either direction.

### Changing a set

- **FR-16.** Unmarking a done set MUST remove its badge immediately.
- **FR-17.** Editing a value of a done set MUST re-evaluate it immediately: it
  may gain, keep, change or lose its badge.
- **FR-18.** Changing a done set's type to warm-up MUST remove its badge;
  changing it from warm-up to a working type MUST evaluate it.
- **FR-19.** Deleting a set, removing an exercise, or replacing an exercise MUST
  remove the badges that depended on it and re-evaluate the session volume.

### The notice

- **FR-20.** When marking a set done earns it a badge, the system SHOULD show a
  short notice that does not block logging and does not need dismissing (e.g.
  "Record: most reps at 100 kg"). Editing a set into a record SHOULD NOT repeat
  the notice; the badge is enough.
- **FR-21.** The notice MUST NOT start, stop or change the rest timer (0018) or
  any other part of the workout.

### Saving

- **FR-22.** No record, progress figure, "last time" value or record history MUST
  change because of a badge. Those change only when the workout is saved, as
  today.
- **FR-23.** The summary and History MUST keep showing the records the saved
  workout beat, as derived after saving (0023). That saved result is
  authoritative; when it differs from the badges shown during the workout, the
  saved result is what is shown, without comment.
- **FR-24.** Discarding the workout MUST leave no trace of its badges.

## Behaviour when things go wrong

- **EF-1.** When the starting records of an exercise cannot be loaded (no
  connection when the workout starts or the exercise is added, or the server
  fails), that exercise MUST show no badges at all — never a badge judged
  against missing data — and the rest of the workout MUST work normally.
- **EF-2.** When loading failed and a connection becomes available later during
  the workout, the system SHOULD retry loading the missing starting records and,
  once loaded, evaluate that exercise's done sets without a notice.
- **EF-3.** When the server is older and cannot provide starting records, the
  workout MUST behave as before this spec (no badges, no errors).
- **EF-4.** When the active workout was started before this feature existed (it
  has no starting records kept with it), the system MUST load them when the
  workout is reopened if it can, and otherwise show no badges (EF-1).
- **EF-5.** When another workout of the same person is saved elsewhere during
  this one, the starting records are stale; badges MAY be wrong, and the saved
  result after saving corrects it (FR-23).
- **EF-6.** A set with missing values (no weight, no reps, no time) MUST be
  evaluated only on the types it has values for; nothing is invented (0013
  EF-3).
- **EF-7.** When the display unit is pounds, the comparison MUST use the exact
  weight logged, not the rounded figure displayed, so a value that only looks
  higher after rounding is not a record (Article 4).
- **EF-8.** When the person changes an exercise's tracking type or unilateral
  setting mid-workout, the system MUST re-evaluate its done sets against the
  record types of the new setting; types that no longer apply lose their badges.

## Domain impact

Reads **personal records** by **record type** (0023) and the **performed set** /
**warm-up set** rules (0013); does not change their meaning. Records remain
derived from saved workouts and never stored.

Introduces two terms (added to the glossary):

- **Starting records** — an exercise's bests of each record type as they stood
  when it entered the active workout. Kept with the active workout; never
  changed by it.
- **Record badge** — a mark on a performed working set (or, for session volume,
  on an exercise) of the active workout, saying it beats a starting record. A
  notice only: never a record, never stored as one.

**WorkoutSessionDraft** gains the starting records of its exercises (so they
survive the app being closed). **Routine** templates are untouched (Article 2).

## Acceptance criteria

- **AC-1.** Given a saved best of 100 kg × 6 at 100 kg, when 100 kg × 8 is marked
  done, then that set shows a "most reps at 100 kg" badge and a short notice.
- **AC-2.** Given AC-1, when the set is unmarked, then the badge disappears and
  no notice is shown.
- **AC-3.** Given AC-1, when the done set's reps are edited from 8 to 6, then the
  badge disappears; edited back to 8, it returns without a notice.
- **AC-4.** Given AC-1, when a second set of 100 kg × 9 is marked done, then both
  sets show the badge; unmarking the second leaves the first's badge in place.
- **AC-5.** Given a warm-up set marked done heavier than any saved working set,
  then it shows no badge; changing its type to working shows a heaviest-weight
  badge.
- **AC-6.** Given a best session volume of 5,000 kg for bench press, when the done
  working sets of bench in this workout first total more than 5,000 kg, then the
  exercise shows a session-volume badge; unmarking a set so the total drops to
  5,000 kg or less removes it.
- **AC-7.** Given an exercise never performed before, when any set is marked
  done, then no badge appears.
- **AC-8.** Given a workout started online, when the connection is lost and the
  app is closed and reopened, then marking a record-beating set done still shows
  its badge.
- **AC-9.** Given a workout started without a connection, then no badges appear
  and logging, rest timer and saving behave as before.
- **AC-10.** Given sets that showed badges, when the workout is discarded, then
  the exercise progress screen shows the same records as before the workout.
- **AC-11.** Given a workout with badges, before it is saved the exercise
  progress screen and "last time" are unchanged; after it is saved the summary
  names the records the saved workout beat.
- **AC-12.** Given a plank tracked by time with a saved best of 60 s, when a set
  of 75 s is marked done, then it shows a "longest time" badge.
- **AC-13.** Given a unilateral split squat with a saved best of 10 reps at 20 kg,
  when 11 left / 8 right at 20 kg is marked done, then it shows a "most reps at
  20 kg" badge.
- **AC-14.** Given a set whose reps were left as the ghosted placeholder, when it
  is marked done and the placeholder beats the record, then it shows the badge.

## Non-functional requirements

- **Offline:** after the starting records are loaded, every requirement here
  works with no connection, including after the app is closed and reopened.
- **Responsiveness:** a badge appears or disappears within the same moment the
  set is marked, unmarked or edited — no waiting on the network.
- **Migration of existing data:** none. Nothing saved changes.
- Platform reach: iOS, Android and web.

## Assumptions

Gate delegated by the owner; these calls were made without confirmation and are
cheap to reverse.

- **[ASSUMPTION: all record types 0023/0021 announce on the summary are also
  shown live, including estimated 1RM and overall most reps.]** The owner
  mentioned weight, reps and volume; showing a subset would make the summary
  announce records the workout never flagged. Estimated 1RM is the most likely
  to feel noisy — first type to drop if it does.
- **[ASSUMPTION: each set is judged against the starting records only, not
  against earlier sets of the same workout (FR-12).]** So a badge never vanishes
  because a *different* set was done, and two record-beating sets both keep it.
  The summary (FR-23) still names one record per type, as 0023 does. The
  alternative — only the workout's best set holds each badge — makes badges jump
  between sets.
- **[ASSUMPTION: session volume is an exercise-level badge, not a set badge]**
  because no single set "owns" a total.
- **[ASSUMPTION: the notice is visual only, short and self-dismissing; no sound
  or vibration.]**
- **[ASSUMPTION: starting records are taken once per exercise and not refreshed
  mid-workout]** (except to fill a failed load, EF-2), since nothing the person
  does in this workout can change them before it is saved.
- **[ASSUMPTION: distance & time keeps "longest time" as a record]** because
  0021/0023 derive it today; changing that is a separate decision.

## Open decisions

None. Gate 1 self-approved under owner delegation (2026-10-17); the calls above
are recorded as assumptions.

## Related

- Builds on: [0023 — records by type](../0023-records-by-type/spec.md),
  [0013 — performed work](../0013-progress-performed-work/spec.md),
  [0021 — timed and distance sets](../0021-timed-and-distance-sets/spec.md),
  [0022 — unilateral exercises](../0022-unilateral-exercises/spec.md),
  [0010 — persist active workout](../0010-persist-active-workout/spec.md),
  [0020 — custom and replace exercise](../0020-custom-and-replace-exercise/spec.md)
- Roadmap: [04-progress-and-prs.md](../../../roadmap/04-progress-and-prs.md)
- Constitution articles engaged: 2, 3, 4

## Verified against the code (2026-10-17)

Recorded so the plan starts from facts rather than from this spec's wording:

- During a workout the phone fetches only "last time" per exercise: the
  performed sets of the most recent workout containing it. It seeds the ghosted
  placeholders (which are kept with the active workout); the "last time" data
  itself is held only while the workout screen is open and re-fetched on
  reopening. A failed fetch is silently treated as "no previous performance".
- No record data reaches the phone during a workout. Records are derived on the
  server on every read, from saved workouts; the phone sees them only on the
  exercise progress screen (current bests, with most reps at the top three
  weights only — not enough to judge reps at any weight, hence FR-1) and, after
  saving, in the list of records each saved workout beat, which the summary
  matches by workout identity.
- The server's record rules: strict improvement only; warm-ups excluded;
  weight-based types read lifting sets only (no time, no distance); a weight
  never reached before is a heaviest-weight record, not reps-at-weight;
  unilateral sets use the better side for reps / reps at weight / 1RM and the
  two-side total for volumes; an exercise logged twice in one workout is one
  session; one reps-at-weight hit per session (the heaviest weight).
- Saving needs a connection; a failed save keeps the workout for retry (0014).
