# 4. Progress, PRs & charts

## Specified next slice

[0042 — Readable exercise progress](../sdd/specs/0042-readable-exercise-progress/spec.md)
is ready (2026-11-03): search trained exercises before general summaries,
explicit metric and period choices, coherent performed-set figures and links
to the saved workout. Plan and implementation are pending; existing line
charts from 0034 are reused rather than reintroduced.

## Checklist
- [x] Personal record (PR) detection (per exercise; recent-record flag + badge)
- [x] Estimated 1RM (Epley, per session point + best)
- [x] PR history (list of past records over time)
- [x] Records by type (heaviest weight, most reps, reps at a weight, best set
  and session volume, est. 1RM, longest time and distance), named on the
  summary, History and the exercise screen (spec 0023 — redeploy and device
  check pending)
- [x] Record badges while logging: a done set that beats the starting records
  gets a badge and a notice; stored only on save (spec 0032 — redeploy and
  device check pending)
- [~] Charts for weight/volume over time
  - [x] Per-session bar chart (est. 1RM with volume fallback) on the exercise
    detail screen — dependency-free, pure-view bars
  - [x] Smooth line charts and area/readout — spec 0034, using `react-native-svg`
  - [ ] Explicit metric/period selection and readable exercise lookup — spec 0042 (ready)
- [~] Weekly volume, muscle-group distribution
  - [x] Weekly training-volume chart on the progress overview
  - [x] Volume distribution by exercise **category** (a proxy, see notes)
  - [ ] Muscle-group distribution (real muscle data)
- [x] Training-frequency tiles (streak, total workouts, active weeks, best week)
- [ ] Workout calendar view

## Progress log
- PR detection + estimated 1RM in the aggregation (pure, unit-tested) and
  surfaced in the progress overview (🏆 PR badge, est. 1RM) and detail
  (per-session 1RM).
- Per-session bar chart on the exercise detail screen. Scaling logic is a pure,
  unit-tested helper (`buildProgressSeries`); the chart itself (`ProgressChart`)
  is built from plain views so it needs no native chart dependency and renders
  the same on iOS/Android/web. Shows est. 1RM, falling back to volume.
- Weekly training-volume chart on the progress overview. New
  `GET /progress/weekly-volume` endpoint buckets all sessions into Monday-start
  weeks (pure `buildWeeklyVolume`, unit + route tested) and the overview renders
  it through the same `ProgressChart` (`buildWeeklyVolumeSeries`).
- PR history on the exercise detail: `extractPersonalRecords` (pure, unit-tested)
  walks the per-session points and lists every session that beat the max weight.
  Mobile-only, reuses the existing detail `points`.
- (2026-05-31) Volume distribution (`6e6a553`): `GET /progress/muscle-distribution`
  sums volume per exercise **category** (`buildMuscleGroupVolume`), rendered as
  horizontal bars. Category stands in for muscle group because wger's muscle
  data is sparse. (The label said "muscle group" until spec 0013 renamed it.)
- (2026-09-24 → 2026-10-16) Spec 0013 — progress counts only performed work.
  One rule in the API (`performedSets.ts`): a set is performed when marked
  done, or when it belongs to a legacy session (no set marked done at all).
  Progress, records, 1RM, weekly volume, volume by category and "last time"
  read only performed sets; warmups count for volume but never for best
  weight, best reps, 1RM or records. History and detail use the server's
  `performed` flag; the post-workout summary shows the saved values; the
  distribution is now labelled "by category".
  **Figures drop on purpose** after the API is redeployed: sets that were
  saved but never marked done stop counting. No data was changed — progress
  is derived, so the old numbers were the bug, not the new ones.
- (2026-05-31) Training-frequency tiles (`2cdc6c4`): streak, total workouts,
  active weeks and best week, derived on the device from the weekly-volume data
  (`summarizeTrainingFrequency`).
- (2026-10-17) Spec 0023 — personal records by type. The API derives records
  per type (`records.ts`, one pure function each): heaviest weight, most reps,
  reps at a weight ("at that weight or heavier", top three weights shown),
  best set volume, best session volume, est. 1RM, plus longest time and
  distance from 0021. Only strict improvements count, warm-ups never do, and
  an exercise logged twice in one workout is one session. The progress detail
  carries `records`; `isRecordSession` now means any type. New
  `GET /progress/session-records` lists what each workout beat: the summary
  and History detail show a records card, the History list a "N records"
  chip, and the exercise screen a "Records" card (the old timeline is now
  "Heaviest weight over time"). Needs the API redeploy (no migration); an
  older API just shows no records.
- (2026-10-18) Spec 0032 — records shown live while logging. The per-set
  record rules moved to the domain package (`records.ts`), shared by the API
  and the app. New `GET /progress/starting-records` gives each exercise's
  bests when it enters the workout; the draft keeps them (offline after a
  restart). A done working set that beats them gets a record badge (session
  volume on the exercise) and a notice; nothing is stored until the save,
  whose records stay authoritative. Needs the API redeploy (no migration);
  badge and notice layout pending the device check.

## Notes
- Progress aggregation already exists (`apps/api/src/features/progress`). PRs can
  derive from the same per-session points.
- Smooth lines now use `react-native-svg` (0034); bars remain the fallback
  for older native binaries. Metric/period controls are the separate 0042 slice.

## Spec review — 2026-11-03

- Ready specs: [0048](../sdd/specs/0048-trustworthy-live-records/spec.md) for
  explicit record availability and unambiguous figures; [0053](../sdd/specs/0053-records-grouped-by-exercise/spec.md)
  for grouped summary records. The reported migration/record discrepancy is
  unconfirmed and requires a concrete case before closure; no data rewrite.
  0042 retains its existing scope and status.

- Owner review of 0048 (2026-11-03): accepted readable extra-record counts,
  load/error states, recalculation and no first-session beaten PR. Added
  distinct historical-record versus last-session-improvement feedback;
  last-session improvement does not increase PR counts. Specification only.
