---
spec: 0021
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Tasks — Timed and distance sets

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Order: domain → migration + API → data script → mobile → docs. No native
rebuild.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks | docs | — | `docs(sdd): plan and tasks for 0021` |
| 2 | [x] Domain: `ExerciseTrackingType`, `CreateExerciseInput`, optional time/distance fields on exercise, routine sets, last set, progress | domain | typecheck | `feat(domain): tracking type and time and distance fields` |
| 3 | [x] `Exercise.trackingType` + routine set targets in `schema.prisma`; migration `20261017090000_add_exercise_tracking_type`; exercises API returns/accepts `trackingType` (400 on unknown); route tests | api | tests; `migrate deploy` + `migrate diff` on local PGlite | `feat(exercises): exercises carry a tracking type` |
| 4 | [x] Routines API: `trackingType` on routine exercises, time/distance targets read and written; route tests | api | tests | `feat(routines): time and distance targets in routines` |
| 5 | [x] Last performance returns time/distance; progress aggregate: best time/distance, record by type, volume unchanged; tests | api | tests | `feat(progress): time and distance in last time and progress` |
| 6 | [x] Data script `set-catalog-tracking-types` (wger sourceIds → type, only rows still `weight_reps`) + npm script | api | run on local PGlite | `feat(exercises): script that sets catalog tracking types` |
| 7 | [x] Mobile `lib/tracking.ts` (fields per type, time parse, distance format, saved-set line) + tests | mobile | tests (EF-2) | `feat(workouts): helpers for time and distance values` |
| 8 | [x] Draft store: type per exercise, time/distance values, placeholders from targets and last time, save sends only the type's fields; tests | mobile | tests (AC-1, AC-2, AC-3) | `feat(workouts): workout draft holds time and distance` |
| 9 | [ ] `WorkoutSetRow` / header components with columns per type and the set timer (`setTimer.ts` + test); active screen uses them; added exercises keep their type; i18n | mobile | tests; web preview (AC-2, AC-3) | `feat(workouts): log time and distance sets` |
| 10 | [ ] Routines: `RoutineSetTable` columns per type, validation, detail targets; custom exercise tracking type (FR-2); domain `CreateExerciseInput` in the client; i18n | mobile | typecheck; web preview | `feat(routines): time and distance targets in the routine editor` |
| 11 | [ ] Summary, history (list + detail), exercise detail and progress show time/distance (`summarizeSession` totals + test; `TimedProgressFigures`); i18n | mobile | tests; web preview (AC-1) | `feat(workouts): show time and distance in history and progress` |
| 12 | [ ] Spec status, tasks log | docs | — | `docs(sdd): close spec 0021 implementation` |

Not verifiable in CI: the migration and the catalog script on the server
(owner, at deploy); the set timer's vibration and feel on a device.

### Acceptance criteria → tasks

| AC | Tasks | How |
|---|---|---|
| AC-1 | 8, 11 | draft + stats tests; web preview History `1:00` |
| AC-2 | 4, 8, 9 | draft test; web preview `0:45` targets |
| AC-3 | 3, 8, 9 | default type; unchanged tests; web preview |
| FR-2 | 3, 10 | route test; web preview of the modal |
| FR-4 | 9 | `setTimer` test; web preview; device |
| FR-5 | 5, 11 | aggregate + stats tests |
| FR-6 | 5 | aggregate test |
| EF-1 | 7, 11 | display from saved values |
| EF-2 | 7 | `parseDurationInput` test |

## Progress log

- 2026-10-16 — Plan and tasks written and self-approved under the owner's
  delegation.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Roadmap/backlog updates handed to the coordinator
- [ ] Migration applied and catalog script run on the server (owner)
- [ ] `spec.md` status set to `done`
