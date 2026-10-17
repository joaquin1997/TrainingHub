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
| 2 | [ ] Domain: `isUnilateral` on exercise, create input, routine exercise; `SetExerciseUnilateralInput`; `repsLeft` / `repsRight` on set, set input, last set | domain | typecheck | `feat(domain): unilateral exercises and per-side reps` |
| 3 | [ ] `Exercise.isUnilateral`, `WorkoutSet.repsLeft/repsRight` in `schema.prisma`; migration `20261017150000_add_unilateral_exercises`; exercises API returns/accepts `isUnilateral`, `PUT /exercises/:id/unilateral`; routines return the flag; route tests | api | tests; `migrate deploy` + `migrate diff` on local PGlite | `feat(exercises): mark an exercise as unilateral` |
| 4 | [ ] Workouts API: sides parsed, `reps` = their sum, stored and returned, in last performance; progress: best reps, e1RM, most reps, reps at weight from the better side, volume from both; tests | api | tests (AC-1 API side, EF-1, better side) | `feat(workouts): record left and right reps of a set` |
| 5 | [ ] Draft store: flag per exercise, side values and placeholders (target, previous set, last time), save sends sides + total; tests | mobile | tests (AC-1, FR-4, EF-1) | `feat(workouts): workout draft holds left and right reps` |
| 6 | [ ] Row and header with L and R side by side; previous `20×10/8`; flag carried by add / replace / start; i18n | mobile | typecheck; web preview if a local API runs | `feat(workouts): log left and right in one set row` |
| 7 | [ ] Saved sets show both sides (`formatSetValues`, summary, History detail, exercise detail); share text (0028) and watch target (0025) with sides; tests | mobile | tests (AC-1 display, volume 360) | `feat(workouts): show both sides in history, share and watch` |
| 8 | [ ] Custom exercise switch; exercise detail switch through `PUT /exercises/:id/unilateral`; client; i18n | mobile | typecheck; web preview if a local API runs | `feat(exercises): switch an exercise to left and right` |
| 9 | [ ] Progress log, definition of done | docs | — | `docs(sdd): record 0022 implementation` |

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

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Roadmap/backlog updates handed to the coordinator
- [ ] [DEVICE] L / R row on a phone width, the custom-exercise and detail
      switches, AC-1 end to end (log 10 L / 8 R at 20 kg, History shows both,
      volume 360 kg), watch target with sides
- [ ] (owner) Migration `20261017150000_add_unilateral_exercises` applied on
      the server (API redeploy)
- [ ] `spec.md` status set to `done`
