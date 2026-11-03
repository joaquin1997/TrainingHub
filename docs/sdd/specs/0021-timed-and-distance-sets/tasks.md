---
spec: 0021
status: in-progress  # self-approved under the delegated gates, 2026-10-16
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
| 9 | [x] `WorkoutSetRow` / header components with columns per type and the set timer (`setTimer.ts` + test); active screen uses them; added exercises keep their type; i18n | mobile | tests; web preview (AC-2, AC-3) | `feat(workouts): log time and distance sets` |
| 10 | [x] Routines: `RoutineSetTable` columns per type, validation, detail targets; custom exercise tracking type (FR-2); domain `CreateExerciseInput` in the client; i18n | mobile | typecheck; web preview | `feat(routines): time and distance targets in the routine editor` |
| 11 | [x] Summary, history (list + detail), exercise detail and progress show time/distance (`summarizeSession` totals + test; `TimedProgressFigures`); i18n | mobile | tests; web preview (AC-1) | `feat(workouts): show time and distance in history and progress` |
| 12 | [x] Spec status, tasks log | docs | — | `docs(sdd): close spec 0021 implementation` |

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
- 2026-10-17 — Tasks 2–6 (domain, migration, API, script). Migration
  `20261017090000_add_exercise_tracking_type` written by hand; on a fresh
  local PGlite `prisma migrate deploy` applied all 15 migrations and
  `prisma migrate diff --from-url … --to-schema-datamodel` reported "No
  difference detected". The catalog script set 44 wger exercises (28 time,
  2 weight & time, 14 distance & time) on the local DB; a second run changed
  0 (idempotent). `prisma format` reformats the whole schema, so the schema
  edit was kept by hand to avoid noise.
- 2026-10-17 — Tasks 7–11 (mobile). The set rows left `ActiveWorkoutScreen`
  for `WorkoutSetRow` / `WorkoutSetHeader`; the routine set table for
  `RoutineSetTable`. Web preview (local API on PGlite, 390×844), routine
  "Core" = custom Plank (time) 3 × 45 s + Rowing Machine 500 m / 1:45 +
  Press de Banca 60 kg × 8–10:
  - routine detail shows `0:45`, `500 m · 1:45`, `60 kg · 8–10 reps`;
    editor shows a single TIME column for Plank;
  - workout: Plank rows ghost `0:45` (AC-2); bench keeps KG / REPS (AC-3);
    "60" typed → `1:00` on blur (EF-2); timer on set 2 counted down
    (`0:43` after 2 s) and stopping filled `0:02` (FR-4);
  - summary and History detail: Plank `1:00`, volume 600 kg = the bench
    only, extra tiles "Set time 2:45" and "Distance 500 m" (AC-1, FR-5);
  - progress: Plank "Latest 1:00 / Longest time 1:00", Rowing "Longest
    distance 500 m", chart and records by time (FR-6);
  - custom exercise modal offers the five tracking types (FR-2);
  - a second workout shows last time's `1:00` in PREVIOUS.
  First preview showed distance & time and weight & time rows too tight
  ("1:4" clipped); fixed with a compact layout for two fields + timer.
- 2026-10-17 — Coordinator: roadmap 01 (checklist + log) and backlog row
  updated; the migration and catalog script are in the backlog's owner
  server steps.

## Definition of done

- [x] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [x] Roadmap/backlog updates handed to the coordinator
- [x] Roadmap 01 and backlog updated (coordinator, 2026-10-17)
- [x] Timed rows, timer vibration and keyboard (`numbers-and-punctuation`)
      checked on the owner's iOS device
- [x] Migration applied and catalog script run on the server (owner)
- [x] `spec.md` status set to `done`
