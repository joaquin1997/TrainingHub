---
spec: 0022
status: in-progress  # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Tasks — Unilateral exercises (left / right)

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Order: domain → migration + API → mobile → docs. No native rebuild. The
migration is additive; an older app keeps logging one rep count.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | — | `docs(sdd): plan and tasks for 0022` |
| 2 | [x] Domain: `isUnilateral` on exercise, create input, routine exercise; `SetExerciseUnilateralInput`; `repsLeft` / `repsRight` on set, set input, last set | domain | typecheck | `feat(domain): unilateral exercises and per-side reps` |
| 3 | [x] `Exercise.isUnilateral`, `WorkoutSet.repsLeft/repsRight` in `schema.prisma`; migration `20261017150000_add_unilateral_exercises`; exercises API returns/accepts `isUnilateral`, `PUT /exercises/:id/unilateral`; routines return the flag; route tests | api | tests; `migrate deploy` + `migrate diff` on local PGlite | `feat(exercises): mark an exercise as unilateral` |
| 4 | [x] Workouts API: sides parsed, `reps` = their sum, stored and returned, in last performance; progress: best reps, e1RM, most reps, reps at weight from the better side, volume from both; tests | api | tests (AC-1 API side, EF-1, better side) | `feat(workouts): record left and right reps of a set` |
| 5 | [x] Draft store: flag per exercise, side values and placeholders (target, previous set, last time), save sends sides + total; tests | mobile | tests (AC-1, FR-4, EF-1) | `feat(workouts): workout draft holds left and right reps` |
| 6 | [x] Row and header with L and R side by side; previous `20×10/8`; flag carried by add / replace / start; i18n | mobile | typecheck; web preview if a local API runs | `feat(workouts): log left and right in one set row` |
| 7 | [x] Saved sets show both sides (`formatSetValues`, summary, History detail, exercise detail); share text (0028) and watch target (0025) with sides; tests | mobile | tests (AC-1 display, volume 360) | `feat(workouts): show both sides in history, share and watch` |
| 8 | [x] Custom exercise switch; exercise detail switch through `PUT /exercises/:id/unilateral`; client; i18n | mobile | typecheck; web preview if a local API runs | `feat(exercises): switch an exercise to left and right` |
| 9 | [x] Progress log, definition of done | docs | — | `docs(sdd): record 0022 implementation` |

Not verifiable in CI: the migration on the server (owner, at deploy); the
row layout with three inputs on a phone width and the switches (device).

### Acceptance criteria → tasks

| AC | Tasks | How |
|---|---|---|
| AC-1 | 4, 5, 7 | route + aggregate tests (reps 18, volume 360); draft test; `formatSetValues` and `summarizeSession` tests; device |
| FR-1 | 3, 8 | route tests; device |
| FR-2 | 4, 5, 6 | draft and route tests; device |
| FR-3 | 4, 7 | aggregate and stats tests |
| FR-4 | 4, 5 | last performance returns sides; draft test |
| EF-1 | 4, 5 | route test (0 → null); draft test (empty side) |

## Progress log

- 2026-10-17 — Plan and tasks written and self-approved under the owner's
  delegation.
- 2026-10-17 — Tasks 2–4 (domain, migration, API). Migration
  `20261017150000_add_unilateral_exercises` written by hand; on a fresh
  local PGlite `prisma migrate deploy` applied all 18 migrations and
  `prisma migrate diff --from-url … --to-schema-datamodel` reported "No
  difference detected". The server derives `reps` = left + right whenever a
  side is sent (`workouts/sides.ts`); records read the better side through
  `recordReps`, volumes keep reading `reps`.
- 2026-10-17 — End-to-end against the built API on the same PGlite (two
  registered users, one catalog exercise inserted by hand): marking the
  catalog Bulgarian split squat → 200 `isUnilateral: true`; custom exercise
  created with the flag → 201; the other user marking it → 403; routine
  exercise carries `isUnilateral: true`; saving 10 L / 8 R at 20 kg → set
  `reps 18, repsLeft 10, repsRight 8`; "last time" returns both sides;
  progress point volume 360, best reps 10, e1RM 26.7, most reps 10, set
  volume record 360; weekly volume 360 (AC-1, API side).
- 2026-10-17 — Tasks 5–8 (mobile). Draft, row (L / R columns, compact
  layout from three inputs), saved-set line `20 kg × 10 L / 8 R` (`I / D` in
  Spanish), share text, watch target `20 kg × 10/8`, custom-exercise and
  detail switches (`UnilateralSwitch`, shown only for rep-based types).
  No web preview this time: no browser can be downloaded in this
  environment (Playwright's download is blocked), so the row layout and the
  switches are left for the device pass. Width estimate at 390 pt: about
  50 pt per input with the compact style, enough for two-digit reps.
- 2026-10-18 — Coordinator: backlog row and owner server steps updated;
  roadmap 01 checklist and progress log updated.

## Definition of done

- [x] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO (marking an exercise mid-workout does
      not change that workout — plan, Risks)
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [x] Roadmap/backlog updates handed to the coordinator
- [ ] [DEVICE] L / R row on a phone width, the custom-exercise and detail
      switches, AC-1 end to end (log 10 L / 8 R at 20 kg, History shows both,
      volume 360 kg), watch target with sides
- [ ] (owner) Migration `20261017150000_add_unilateral_exercises` applied on
      the server (API redeploy)
- [ ] `spec.md` status set to `done`
