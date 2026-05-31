# 4. Progress, PRs & charts

## Checklist
- [x] Personal record (PR) detection (per exercise; recent-record flag + badge)
- [x] Estimated 1RM (Epley, per session point + best)
- [ ] PR history (list of past records over time)
- [~] Charts for weight/volume over time
  - [x] Per-session bar chart (est. 1RM with volume fallback) on the exercise
    detail screen — dependency-free, pure-view bars
  - [ ] Smooth line charts / multi-metric toggle
- [ ] Weekly volume, muscle-group distribution
- [ ] Workout calendar view

## Progress log
- PR detection + estimated 1RM in the aggregation (pure, unit-tested) and
  surfaced in the progress overview (🏆 PR badge, est. 1RM) and detail
  (per-session 1RM).
- Per-session bar chart on the exercise detail screen. Scaling logic is a pure,
  unit-tested helper (`buildProgressSeries`); the chart itself (`ProgressChart`)
  is built from plain views so it needs no native chart dependency and renders
  the same on iOS/Android/web. Shows est. 1RM, falling back to volume.

## Notes
- Progress aggregation already exists (`apps/api/src/features/progress`). PRs can
  derive from the same per-session points.
- A smoother line chart would need a RN chart lib (e.g. react-native-svg); the
  current bars are intentionally dependency-free.
