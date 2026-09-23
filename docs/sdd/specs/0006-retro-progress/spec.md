---
id: 0006
title: "Retro: progress"
status: retro
roadmap: docs/roadmap/04-progress-and-prs.md
created: 2026-09-23
---

# Retro: progress

> **Retro-spec.** Records what exists so a future change has something to build
> on.

## What progress is

Everything in this area is **derived** from saved workouts. Nothing here is
entered by the user, and nothing here is a separate source of truth. That is
the defining property of the area: if the aggregation is wrong, the fix is in
the aggregation, never in stored numbers.

The unit of aggregation is the **session point**: one data point per workout
session for a given exercise, computed from that session's sets.

## Behaviour today

- **Per-exercise overview.** A summary per exercise, built from all saved
  workouts.
- **Personal records.** A session that beat the previous best for an exercise is
  flagged, with a badge in the overview, and the history of past records is
  listed on the exercise detail.
- **Estimated 1RM.** A one-rep-max estimate (Epley) per session point, plus the
  best.
- **Per-session chart.** A bar chart on the exercise detail showing estimated
  1RM, falling back to volume. Built from plain views so it needs no native
  chart dependency and renders identically on iOS, Android and web.
- **Weekly volume.** Training volume bucketed into Monday-start weeks, charted
  on the progress overview.

## Invariants worth protecting

- **Progress is derived, never stored.** PRs and 1RM estimates are computed, not
  persisted. Persisting them would create a second truth that can disagree with
  the workouts it came from.
- **Aggregation logic stays pure and unit-tested.** `buildProgressSeries`,
  `buildWeeklyVolume`, `extractPersonalRecords` are pure functions with tests —
  that is what makes this area safe to change, and it is the pattern to keep.
- **Volumes are kilograms** (Article 4). A single pound value entering an
  aggregate corrupts it undetectably.
- **Charts stay dependency-free** unless there is a decision to add a native
  chart library (Article 9). The bars were chosen over `react-native-svg` on
  purpose.

## Known gaps

From [docs/roadmap/04-progress-and-prs.md](../../../roadmap/04-progress-and-prs.md):

- Muscle-group distribution — blocked in practice because wger's
  `primaryMuscleGroups` data comes back sparse, which is also why the exercise
  filters use category and equipment instead. Any spec here must decide where
  muscle data comes from.
- Workout calendar view.
- Smooth line charts / multi-metric toggle — deferred: needs
  `react-native-svg` and a full rebuild; the bars suffice.

`TODO(sdd): "muscle-group distribution" is the one gap whose blocker is a data`
`problem, not an effort problem. Closing it needs a decision on the source of`
`muscle data (a better import from wger, a manual mapping table, or dropping`
`the feature), and that decision is the spec.`

## Related

- Glossary: session point, personal record, estimated 1RM, training volume
- Constitution articles engaged: 2, 4, 9
