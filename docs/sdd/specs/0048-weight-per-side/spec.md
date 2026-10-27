---
id: 0048
title: A different weight on each side
status: draft
amends: 0022
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-10-27
---

# A different weight on each side

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

On a unilateral exercise (0022) each side has its own reps, but both sides share
one weight. Someone whose left side is weaker, or who is rebuilding after an
injury, often lifts less on one side: 22.5 kg on the left and 25 kg on the
right. Today they must log one weight and remember the other, or log the
exercise twice. Progress, volume and records then describe a lift that did not
happen.

0022 left this out on purpose ("different weights per side within one set —
follow-up if needed"). The owner now asks for it, *"configurable"*.

## Why now

The owner trains with a Bulgarian split squat and similar single-side work, and
raised it in the device test of 2026-10-21. It is the one follow-up 0022
named.

## Users and scenarios

- **Weaker left side.** Bulgarian split squat: left 20 kg × 12, right 22.5 kg ×
  12. The set shows both weights and both reps, side by side.
- **Same weight, as before.** Cable one-arm row at 15 kg both sides. The person
  does not touch anything new; the row stays as compact as today.
- **Turning it on mid-session.** The person has typed 20 kg on a set and decides
  the right side should be 22.5. They switch "different weight per side" on for
  that exercise; the 20 becomes both sides' weight and they change the right.
- **Looking back.** In History and "last time" the person sees each side's
  weight and reps, and the volume counts each side with its own weight.

## Scope

### In scope
- Logging a weight per side for the sets of a unilateral exercise, when the
  person chooses to.
- Showing it everywhere a unilateral set is shown: the active workout, "last
  time", the summary, History and its detail, the share text and card, the watch.
- Counting volume, records and estimated 1RM with each side's own weight.
- Routine targets per side (the same choice in the routine editor).

### Out of scope
- Tracking types other than weight & reps (0021): time and distance exercises do
  not gain per-side weights.
- Suggesting a weight for the weaker side, or showing the left/right gap over
  time — a follow-up on progress (0042).
- Changing the exercise catalog's unilateral flag — unchanged (0022 FR-1).
- Editing saved workouts to add per-side weights afterwards — 0049.

## Functional requirements

- **FR-1.** For an exercise marked unilateral that records weight and reps, the
  person MUST be able to log a **weight per side** for each set: one for the
  left, one for the right.
- **FR-2.** Weight per side MUST be a choice the person can turn on and off for
  the exercise as it stands in their workout, and in their routine. With it off,
  the set has one weight for both sides, exactly as today.
  `[ASSUMPTION: a switch on the exercise within a workout or routine, remembered
  for that exercise on the person's later workouts; see the open decision.]`
- **FR-3.** Turning weight per side **on** MUST copy the set's current weight
  to both sides; turning it **off** MUST keep the heavier side's weight as the
  single weight, and tell the person which one it kept.
  `[ASSUMPTION: heavier side wins on off, because it is the safer record to keep.]`
- **FR-4.** The row of a set with a weight per side MUST show left and right
  side by side, each with weight and reps, without growing taller than today's
  unilateral row, at phone width and at large text sizes (0034).
- **FR-5.** Training volume MUST be each side's weight × that side's reps, summed.
  With one weight for both sides the result MUST equal today's.
- **FR-6.** Records and estimated 1RM MUST read the better side (0022
  assumption): the heavier weight for a heaviest-weight record, each side's own
  weight and reps for the rest. Set volume reads both sides together (0032
  FR-11).
- **FR-7.** "Last time" MUST be per side, including the weights.
- **FR-8.** Everything shown outside the active workout MUST show a weight per
  side where the set has one, and the single weight where it does not: summary,
  History, workout detail, share text and card, and the watch ("20 / 22.5 kg ×
  12 / 12").
- **FR-9.** Weights per side are kilograms in storage and the display unit on
  screen, like every weight (Article 4); the unit captured at the start of the
  workout holds for both sides.
- **FR-10.** Existing workouts and routines MUST read exactly as before: one
  weight for both sides. No stored data is rewritten.

## Behaviour when things go wrong

- **EF-1.** A side left without a weight, with weight per side on, counts as that
  side not done for weight, as an empty side does for reps today (0022 EF-1); the
  other side is unaffected.
- **EF-2.** When the exercise's unilateral flag is turned off (0022) for an
  exercise whose sets already have a weight per side, those sets MUST keep their
  values and be shown as saved; nothing is lost.
- **EF-3.** A phone build or a watch build without this feature, receiving a set
  with a weight per side, MUST show the heavier side's weight rather than fail.
- **EF-4.** A routine with per-side targets started on a build that does not know
  them MUST start with the heavier side's weight on both sides.

## Domain impact

Changes **WorkoutSet** and **RoutineExercise** sets: a unilateral set may carry a
weight per side as well as reps per side. New glossary term **weight per side**.
No change to **Exercise**'s unilateral flag. Records, estimated 1RM and volume
are still derived from **performed sets**; **personal record** keeps its
meaning. Needs a data model change and a migration (plan).

## Acceptance criteria

- **AC-1.** Given split squats with weight per side on, left 20 kg × 12 and
  right 22.5 kg × 12, then volume is 20 × 12 + 22.5 × 12 = 510 kg.
- **AC-2.** Given weight per side off, 20 kg left × 10 and right × 8, then volume
  is 360 kg, as 0022 AC-1.
- **AC-3.** Given a set with 20 typed, when weight per side is turned on, then
  both sides show 20; when turned off after the right side was changed to 22.5,
  then the weight is 22.5 and the person is told.
- **AC-4.** Given the next workout with the same exercise, then "last time" shows
  20 and 22.5 on their sides.
- **AC-5.** Given the same set in History, the share text and the watch, then
  each shows both weights.
- **AC-6.** Given every workout saved before this feature, then it reads and counts
  as before.
- **AC-7.** In lb the same cases hold with the display unit.

## Non-functional requirements

- Needs an API and database change (migration) and a redeploy before the app
  build that uses it (as 0027, 0032).
- Needs a native rebuild only for the watch's display (FR-8).
- No new dependency (Article 9).

## Assumptions

- **[ASSUMPTION: records use the better side, as 0022 assumed for reps. A
  heaviest-weight record is the heavier of the two sides' weights.]**
- **[ASSUMPTION: only weight & reps unilateral exercises can have a weight per
  side. Time and distance exercises are 0021's.]**

## Open decisions

- **[NEEDS DECISION: where does "configurable" live? Options: (a) a switch on the
  exercise in the catalog, for everyone, like the unilateral flag; (b) a switch
  on the exercise inside a workout or routine, remembered for the person's next
  one (assumed here); (c) every unilateral set always shows both weights, with
  no switch. (c) is the simplest rows-and-data model but makes the common case —
  same weight both sides — heavier on screen.]**
- **[NEEDS DECISION: should the weaker-side gap be shown anywhere (a "left is
  10 % lighter" note, a chart of the gap)? Out of scope here; the answer decides
  whether it becomes part of 0042.]**

## Related

- Amends: 0022 (out of scope, "different weights per side"), 0032 FR-11.
- Builds on: 0021 (tracking types), 0023 (records), 0025/0041 (watch display).
- Roadmap: docs/roadmap/01-live-workout-logging.md
- Constitution articles engaged: 2, 3, 4, 5, 9
