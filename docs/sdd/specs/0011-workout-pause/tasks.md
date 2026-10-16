---
spec: 0011
status: in-progress  # self-approved 2026-10-16 under the owner's delegation
created: 2026-09-24
---

# Tasks — Pause the active workout

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Spec, plan and tasks; glossary (pause, active duration); backlog | docs | links resolve | `docs(sdd): spec 0011 pause the active workout` |
| 2 | [x] Optional `pausedSeconds` on the create input and the session | domain | `pnpm -r typecheck` | `feat(domain): paused time on workout sessions` |
| 3 | [x] Prisma field + migration; repository; validation | api | route tests (valid, negative, over duration, missing) | `feat(api): store paused time on workout sessions` |
| 4 | [x] Pause/resume helpers, `activeDurationSeconds`, send `pausedSeconds` | mobile | unit tests | `feat(workouts): pause model and active duration` |
| 5 | Pause/Resume button, paused state, active duration in banner/history/detail, i18n en/es | mobile | manual in app (Metro reload) | `feat(workouts): pause and resume the active workout` |
| 6 | Roadmap, backlog, spec status; redeploy the API | docs / ops | `/health` ok; AC-3 on device | `docs(sdd): close spec 0011` |

Task 6 includes a redeploy; not verifiable in CI.

## Progress log

- 2026-09-24 — Spec written from decisions taken with the owner; tasks awaiting review.
- 2026-10-16 — Tasks self-approved under the owner's delegation. Tasks 1–2:
  glossary (pause, active duration), backlog; optional `pausedSeconds` on
  `WorkoutSession` and `CreateWorkoutSessionInput`.
- 2026-10-16 — Task 3: `pausedSeconds Int @default(0)`, migration generated
  offline with `prisma migrate diff` (not applied yet). Route: non-integer,
  negative or non-number → 400 invalid payload; more than `completedAt −
  startedAt` → 400 with its own reason; absent → stored as 0. Responses carry
  `pausedSeconds`. 6 route tests.
- 2026-10-16 — Task 4: draft `pausedAt` / `pausedSeconds`; pure
  `pauseWorkout` / `resumeWorkout` (idempotent) / `totalPausedSeconds`
  (ongoing pause included); `activeDurationSeconds` in `lib/format.ts`. The
  save sends `min(paused, elapsed)` computed at the same instant as
  `completedAt`; the skeleton carries it too. 8 unit tests. Both fields ride in
  the stored envelope unchanged (optional, so v1 stays valid).

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/01-live-workout-logging.md` updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] API redeployed with the migration applied
