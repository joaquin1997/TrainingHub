---
spec: 0033
status: in-progress  # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Tasks — Delete custom exercises

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Order: migration + rule → API endpoints → routine flag → mobile → docs. The
API ships before the app (the app's delete action needs the endpoints).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | — | `docs(sdd): plan and tasks for 0033` |
| 2 | [x] `Exercise.deletedAt` + migration `20261018150000_add_exercise_deleted_at`; `visibility.ts`: visible excludes deleted custom exercises, usable keeps the creator's own whatever its lifecycle, classifier `isDeleted` → hidden; `findAccessibleExercise` passes it; tests | api | unit tests; `prisma:generate` | `feat(exercises): deleted lifecycle for custom exercises` |
| 3 | [x] `ExerciseDeletionImpact` (domain); `deletion.ts` (`planExerciseDeletion`, `deletionImpactWhere`) + tests; repository `getExerciseDeletionImpact`, `deleteCustomExercise` (remove or archive, favourites, photo best effort, `P2003` fallback); `GET /exercises/:id/deletion-impact`, `DELETE /exercises/:id`; route tests | domain / api | unit + route tests (AC-1, 2, 5, 7, EF-2, EF-3) | `feat(exercises): delete custom exercises` |
| 4 | [x] `RoutineExercise.exerciseDeleted` (domain); routine reads set it | domain / api | typecheck; e2e (task 7) | `feat(exercises): routines mark deleted exercises` |
| 5 | [x] Mobile: client methods; `exerciseDeletion.ts` (`describeDeletionImpact`, `isInActiveWorkout`) + tests; `DeleteExerciseButton` on the custom exercise detail (impact → confirm → delete; EF-1, EF-2, EF-6); i18n en/es | mobile | unit tests; typecheck | `feat(exercises): delete a custom exercise from its detail` |
| 6 | [x] Mobile: "Deleted exercise" chip in routine detail and routine form | mobile | typecheck | `feat(exercises): show deleted exercises in routines` |
| 7 | [ ] Local end-to-end check on PGlite (two users; AC-1…AC-8, EF-5); progress log; definition of done | docs | log | `docs(sdd): record 0033 implementation` |
| 8 | [ ] [DEVICE] Delete flow on a phone: confirmation texts (unused / counts / active workout), offline error, routine chip, active workout keeps sets and saves, neutral tile, no delete on catalog | mobile | device | — |
| 9 | [ ] (owner: migration/deploy) Apply the migration and redeploy the API, before the app update | ops | `/health`; impact call on the server | — |

Not verifiable in CI: the end-to-end check (local PGlite, task 7), the
device pass (task 8), the deploy (task 9).

### Acceptance criteria → tasks

| AC | Tasks | How |
|---|---|---|
| AC-1 | 2, 3, 5, 7 | visible rule test; planner (remove); route 204; e2e |
| AC-2 | 3, 5, 7 | impact where test; route test; confirmation helper test; e2e counts |
| AC-3 | 2, 7 | rule tests; e2e history / detail / progress |
| AC-4 | 2, 4, 6, 7, 8 | usable rule test; e2e routine flag and saves; device chip |
| AC-5 | 3, 5, 8 | planner (archive for active workout); helper test; device |
| AC-6 | 3, 7, 8 | e2e photo 404; device tile |
| AC-7 | 3, 5, 8 | route tests (403 / 404); button condition; device |
| AC-8 | 2, 7 | visible rule test; e2e new id |
| AC-9 | 5, 8 | screen error path; device offline |
| EF-1 | 5, 8 | as AC-9 |
| EF-2 | 3, 5 | planner (already deleted → 204); `isExerciseGone` (404 = gone) |
| EF-3 | 3 | route "same as unknown" tests |
| EF-4 | 3 | photo removal outside the transaction (code); photo read uses visible |
| EF-5 | 2, 7 | usable rule test; e2e save |
| EF-6 | 5, 8 | screen: no delete without impact; device |

## Progress log

- 2026-10-17 — Plan and tasks written and self-approved under the owner's
  delegation (gates delegated 2026-10-16). Decisions recorded in the plan:
  `deletedAt` archive vs outright removal decided by references plus the
  device's active workout; impact counts only the creator's data; the
  creator's deleted exercise stays usable for saves so routines and the
  active workout never break.
- 2026-10-17 — Task 2: `Exercise.deletedAt` and the hand-written migration
  `20261018150000_add_exercise_deleted_at` (one `ADD COLUMN`, mirrors the
  schema). `visibleExerciseWhere`'s custom branch requires `deletedAt: null`,
  so list, detail, search, favourites, photo read and same-name dedupe all
  drop a deleted exercise with no change at their call sites.
  `usableExerciseWhere` no longer reuses the visible branches: it keeps the
  creator's own exercise whatever its lifecycle (saves never break) plus the
  held branches. The classifier takes an optional `isDeleted` (deleted custom
  → hidden), passed by `findAccessibleExercise`, so photo writes and
  unilateral answer 404 for a deleted exercise. 4 new rule tests.
- 2026-10-17 — Task 3: `deletion.ts` holds the decision
  (`planExerciseDeletion`: not-found / forbidden / already-deleted / remove /
  archive) and the creator-only count filters (`deletionImpactWhere`); the
  repository only carries them out. `GET /exercises/:id/deletion-impact` and
  `DELETE /exercises/:id?inActiveWorkout=true`, both authenticated. Route
  tests live in a new `deletion.routes.test.ts` (not `routes.test.ts`, which
  0030 edits): the real routes and repositories run against an in-memory
  stand-in for Prisma that evaluates the repositories' own `where` objects —
  so creator-only, same-as-unknown for others, counts of the creator's data
  only, history/progress still named, and same-name create are checked
  through the real code, not through mocks of it. 30 new tests (11 unit, 19
  route).
- 2026-10-17 — Task 4: `RoutineExercise.exerciseDeleted` (domain, optional,
  present only when true); the routine read selects `exercise.deletedAt`.
  Stand-in tests: after deletion the routine still has the slot with its
  name, rest and targets, marked deleted; the creator's deleted exercise
  stays usable for her saves (also one kept only for the active workout);
  Ben, who held it, keeps it usable, and nothing else opens up for him.
- 2026-10-17 — Task 5: `exercisesClient.getDeletionImpact` / `remove`;
  `exerciseDeletion.ts` (`describeDeletionImpact`, `isInActiveWorkout`; 6
  tests). The flow lives in a new `DeleteExerciseButton` so the detail screen
  (also edited by 0030) gains one import and one element, shown under the
  same creator-only condition as the photo button. Impact first (404 → it
  is already gone, leave; other failure → "could not check", nothing
  deleted); the confirmation lists routines, saved workouts, the active
  workout on this device, or "not used anywhere", then what disappears;
  delete passes `inActiveWorkout`; 204 or 404 → back to the list, which
  reloads on focus; any other failure → error, the exercise stays. i18n
  en/es in a new `exerciseDeletion` namespace. "Already deleted" reuses
  0015's `isExerciseGone` instead of a second 404 helper.
- 2026-10-17 — Task 6: routine detail shows a neutral "Deleted exercise"
  chip next to the name of a slot whose exercise was deleted; the routine
  form shows it in place of "Selected" for such a row (from the loaded
  routine's flags, so a row re-pointed to another exercise loses it). Starting
  the routine and the workout itself need no change (name from the routine,
  thumbnail 404 → neutral tile); history, session detail, share and progress
  read the name from the workout, so they show it as before.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Relevant `docs/roadmap/NN-*.md` checklist and progress log updated
      (left to the owner's merge: this branch does not touch `docs/roadmap/`)
- [ ] `spec.md` status set to `done`; `../backlog.md` updated (after the
      device pass and deploy; backlog left to the merge)
- [ ] Constitution amended if this work settled a new invariant
