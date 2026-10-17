---
spec: 0024
status: in-progress  # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Tasks — Warm-up sets

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Two slices: the approach-set calculator (tasks 2–5), then the warm-up block
(tasks 6–8). Order inside each: domain → migration → API → mobile. Two
additive migrations; no native rebuild. The API (with its migrations) must
be deployed before routine warm-up sets and the warm-up block persist.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | — | `docs(sdd): plan and tasks for 0024` |
| 2 | [ ] `lib/approachSets.ts`: scheme, bar, step per unit, rounding, drop rule | mobile | unit tests (AC-1, AC-2, FR-3, EF-2) | `feat(workouts): work out approach sets from the working weight` |
| 3 | [ ] `approachSetsDraft.ts` (`addApproachSets`, outcomes, replace rule); export `nextDraftId`; flame button + notice on the active screen; i18n en/es | mobile | unit tests (AC-1 order and type, EF-1, FR-2 save as warm-up) | `feat(workouts): add approach sets in the active workout` |
| 4 | [ ] Domain `isWarmup` on routine sets; `RoutineExerciseSet.isWarmup` + migration `20261017140000_add_routine_set_warmup`; routines API reads/writes it; routine route test | domain + api | route test; `migrate diff` SQL | `feat(routines): routine sets can be warm-ups` |
| 5 | [ ] Routine editor: `routineApproachSets.ts`, inheritance skips the other kind, `W` marker, button + notice, save `isWarmup`; routine detail `W`; duplicate copies it; workout draft types routine warm-ups `warmup`; i18n | mobile | unit tests | `feat(routines): approach sets in the routine editor` |
| 6 | [ ] Domain warm-up item types; `RoutineWarmUpItem` + `WorkoutWarmUpItem` + migration `20261017150000_add_warm_up_blocks`; routines API (create, replace only when sent, read); workouts API (save with `done`, read); route tests | domain + api | route tests; `migrate diff` SQL | `feat(routines): warm-up block on routines and workouts` |
| 7 | [ ] Routine editor warm-up card (name, target time/reps, add/remove); routine detail block; duplicate copies it; i18n | mobile | typecheck; unit test (duplicate) | `feat(routines): edit the warm-up block` |
| 8 | [ ] `warmUpDraft.ts` (`buildWarmUpDraft`, `toggleWarmUpItem`, `toWarmUpItemsInput`); store builds and sends it; active screen checklist card first; history detail shows done items; i18n | mobile | unit tests (AC-3, FR-6, FR-7) | `feat(workouts): warm-up checklist in the active workout` |
| 9 | [ ] Progress log, definition of done | docs | — | `docs(sdd): close spec 0024 implementation` |
| 10 | [ ] [DEVICE] Approach-set button, notice and generated rows in the active workout and the routine editor; warm-up card first in the workout, ticking leaves the sets-done bar alone; history detail shows the ticked items | device | owner, iOS | — |
| 11 | [ ] (owner) Apply both migrations on the server and deploy the API | ops | `npm run db:deploy` | — |

Not verifiable in CI: tasks 10–11.

### Acceptance criteria → tasks

| AC | Tasks | How |
|---|---|---|
| AC-1 | 2, 3, 5 | unit tests; device |
| AC-2 | 2 | unit test |
| AC-3 | 6, 8 | unit + route tests; device |
| FR-1 | 3, 5 | unit tests; device |
| FR-2 | 3 | draft test (saved as `warmup`); 0013/0023 record tests |
| FR-3 | 2 | unit test |
| FR-4 | 3, 5 | ordinary sets/rows; device |
| FR-5 | 6, 7 | route tests; device |
| FR-6 | 8 | unit test |
| FR-7 | 6, 8 | route + unit tests |
| EF-1 | 3, 5 | unit tests |
| EF-2 | 2 | unit test |

## Progress log

- 2026-10-17 — Plan and tasks written and self-approved under the owner's
  delegation.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Roadmap 01, backlog and glossary updates handed to the coordinator
- [ ] Checked on the owner's device (task 10)
- [ ] Migrations applied on the server (task 11)
- [ ] `spec.md` status set to `done`
