---
id: 0013
title: Progress counts only performed work
status: done
roadmap: docs/roadmap/04-progress-and-prs.md
created: 2026-09-24
decided: 2026-09-24
---

# Progress counts only performed work

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

Progress, personal records and "last time" count sets the person never did.
When a workout is finished, every set in it is saved, including the ones that
were never marked done. Those carry their ghosted placeholder values: the
routine's targets or last session's numbers. Progress then treats them as
lifted. A routine with four planned sets of which one was done records four,
inflating volume, best weight, estimated 1RM and personal records. "Last time"
then shows those unperformed numbers as what to beat, and they feed the
placeholders of the next workout.

Warmup sets also count toward personal records and estimated 1RM today, so a
heavy warmup can register as a record.

## Why now

Every workout saved while this stands adds more wrong numbers. They are not
lost, because progress is derived and never stored (retro 0006), so fixing the
derivation fixes all of history at once. But until then the progress screens,
the records list and the "last time" hints are untrustworthy. The latter
matter most: they are what the person uses to choose weights during a workout.

## Users and scenarios

- **Short on time.** Someone plans five sets, does three, and finishes. Their
  progress, records and next "last time" must reflect three sets.
- **Heavy warmup.** Someone warms up at a weight above their previous best
  working weight (e.g. after a long break). It must not appear as a personal
  record.
- **Old workouts.** Someone has workouts saved before sets could be marked
  done. Those must keep counting as they do today, not vanish from progress.

## Scope

### In scope
- Deciding which logged sets count as **performed** work, and applying that one
  rule everywhere progress, records, volume and "last time" are derived.
- Excluding **warmup sets** from personal records, estimated 1RM and best
  weight / best reps, while keeping them in training volume.
- Treating **legacy sessions** (no set marked done at all) as fully performed.
- Making the post-workout summary show the values that were actually saved.
- Naming the volume distribution for what it measures: exercise category, not
  muscle group.

### Out of scope
- Real muscle-group distribution — needs a source of muscle data; separate
  item in roadmap area 4.
- Editing a saved workout (marking a set done afterwards) — no editing of
  saved workouts exists; a separate feature.
- Excluding warmups from volume — decided against (2026-09-24): warmups are
  work, as far as volume is concerned.
- Changing how drop and failure sets count — they are working sets; see
  Assumptions.
- Any change to stored workouts — progress is derived, so no stored data is
  rewritten (constitution Article 5, amended: data fixes are scripts, and none
  is needed here).

## Functional requirements

- **FR-1.** Progress per exercise, personal records, estimated 1RM, best weight,
  best reps and training volume MUST be derived only from performed sets.
- **FR-2.** "Last time" for an exercise MUST show only the performed sets of the
  most recent workout that included it.
- **FR-3.** Warmup sets MUST NOT count toward personal records, estimated 1RM,
  best weight or best reps.
- **FR-4.** Warmup sets that were performed MUST count toward training volume:
  per exercise, per week and per category.
- **FR-5.** A legacy session (one in which no set is marked done) MUST be treated
  as if every one of its sets was performed, everywhere this spec applies and
  in the workout history and detail.
- **FR-6.** The post-workout summary MUST show, for each set, the same values
  that were saved, including values taken from a ghosted placeholder the person
  did not edit.
- **FR-7.** The volume distribution MUST be labelled as distribution by exercise
  category, in every language the app supports.
- **FR-8.** Sets not marked done MUST still be saved with the workout, as not
  performed, so the workout detail keeps showing what was planned against what
  was done. They MUST NOT count anywhere this spec applies.

## Behaviour when things go wrong

- **EF-1.** When an exercise's only performed sets in a session are warmups, the
  session MUST add to that exercise's volume but MUST NOT set, raise or lower
  its best weight, best reps, estimated 1RM or personal records.
- **EF-2.** When the most recent workout that included an exercise has no
  performed set for it, "last time" MUST fall back to the most recent workout
  that has one, or show nothing when none does. It MUST NOT show unperformed
  values.
- **EF-3.** When a performed set has no weight (bodyweight) or no reps, it MUST
  behave as today: it contributes what it has and nothing is invented.

## Domain impact

Changes how progress reads **WorkoutSet**. Only **performed sets** count as
work, and **warmup sets** count for volume but not for records. Introduces two
terms (added to the glossary):

- **Performed set** — a `WorkoutSet` marked done; in a legacy session, every set.
- **Legacy session** — a `WorkoutSession` saved before sets could be marked done,
  recognisable because none of its sets is.

**Personal record**, **estimated 1RM** and **training volume** keep their
meaning. They are still derived and never stored; they now read only
performed sets. Templates (routines) are untouched (Article 2).

## Acceptance criteria

- **AC-1.** Given a workout where one of four sets of an exercise was marked
  done, when it is finished, then that exercise's volume, best weight and
  estimated 1RM for the session reflect only that set.
- **AC-2.** Given that workout, when the exercise is next added to a workout,
  then "last time" shows only the one performed set.
- **AC-3.** Given a performed warmup set heavier than any previous working set,
  when progress is viewed, then no new personal record appears, and the
  week's volume includes the warmup.
- **AC-4.** Given a legacy session, when progress and history are viewed, then
  its sets count as they did before this change.
- **AC-5.** Given workouts already saved with unperformed sets, when progress is
  viewed after this change, then those sets no longer count. No data was
  rewritten.
- **AC-6.** Given a set whose field was left showing its ghosted placeholder,
  when the workout is finished, then the summary shows that placeholder value
  for the set.
- **AC-7.** Given the progress overview in either language, then the volume
  distribution is labelled by category.

## Non-functional requirements

- **Migration of existing data:** none. Every figure is recomputed from saved
  workouts on each view, so history corrects itself on the first view after
  the change is deployed.
- Platform reach: iOS, Android and web. Nothing platform-specific.

## Assumptions

- **[ASSUMPTION: drop and failure sets are working sets]** — they count toward
  records, estimated 1RM and volume like normal sets. Only warmups are
  excluded.
- **[ASSUMPTION: "last time" keeps warmup sets]** — it shows what was done,
  set by set, so the next workout's placeholders line up by set order.
  Excluding warmups applies to records only (FR-3).

## Open decisions

None. Resolved 2026-09-24:

1. **Sets not marked done are still saved** (FR-8). The alternative was to
   stop saving them. It was chosen against because the workout detail is built
   around the difference (✓ / ○, "done / total sets"), and this spec already
   stops them from counting, so keeping them costs nothing in correctness. This
   reverses the assumption first proposed for this spec.

## Related

- Retro-specs: [0006 — progress](../0006-retro-progress/spec.md) (derived,
  never stored), [0005 — workouts](../0005-retro-workouts/spec.md) (placeholders
  log their value)
- Roadmap: [04-progress-and-prs.md](../../../roadmap/04-progress-and-prs.md)
- Constitution articles engaged: 2, 3, 4, 8

## Verified against the code (2026-09-24)

Recorded so the plan starts from facts rather than from this spec's wording:

- Finishing a workout sends every set, and unedited fields take their ghosted
  placeholder. Sets not marked done carry no completion time but do carry
  values.
- The progress derivation reads every set of every session and ignores both
  completion and set type. The same holds for the per-category volume and the
  weekly volume.
- "Last time" returns every set of the most recent workout containing the
  exercise, done or not.
- The workout history list and detail **already** count only done sets for
  volume. The detail marks done / not done per set. Neither applies a legacy
  rule, so a legacy session shows zero volume there today (FR-5 fixes that).
- The history list's set count includes sets not marked done.
- The post-workout summary shows only what was typed, so a set logged from its
  placeholder appears as "–" (FR-6).
- Per-set completion started being saved on 2026-05-30, the same day saved
  workouts first existed. Legacy sessions are therefore few or none. Not
  counted in the database for this spec.
- Records history on the device is derived from the per-session points the
  server computes, so fixing the derivation fixes it too. The frequency tiles
  derive from weekly volume.
