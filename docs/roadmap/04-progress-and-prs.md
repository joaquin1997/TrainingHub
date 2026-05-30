# 4. Progress, PRs & charts

## Checklist
- [x] Personal record (PR) detection (per exercise; recent-record flag + badge)
- [x] Estimated 1RM (Epley, per session point + best)
- [ ] PR history (list of past records over time)
- [ ] Charts for weight/volume over time (line charts)
- [ ] Weekly volume, muscle-group distribution
- [ ] Workout calendar view

## Progress log
- PR detection + estimated 1RM in the aggregation (pure, unit-tested) and
  surfaced in the progress overview (🏆 PR badge, est. 1RM) and detail
  (per-session 1RM). Charts still pending (needs a RN chart lib).

## Notes
- Progress aggregation already exists (`apps/api/src/features/progress`). PRs can
  derive from the same per-session points.
- Charts need a RN chart lib (e.g. react-native-svg + a small chart helper).
