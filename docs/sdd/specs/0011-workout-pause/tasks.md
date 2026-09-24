---
spec: 0011
status: draft        # awaiting review
created: 2026-09-24
---

# Tasks — Pause the active workout

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | Spec, plan and tasks; glossary (pause, active duration); backlog | docs | links resolve | `docs(sdd): spec 0011 pause the active workout` |
| 2 | Optional `pausedSeconds` on the create input and the session | domain | `pnpm -r typecheck` | `feat(domain): paused time on workout sessions` |
| 3 | Prisma field + migration; repository; validation | api | route tests (valid, negative, over duration, missing) | `feat(api): store paused time on workout sessions` |
| 4 | Pause/resume helpers, `activeDurationSeconds`, send `pausedSeconds` | mobile | unit tests | `feat(workouts): pause model and active duration` |
| 5 | Pause/Resume button, paused state, active duration in banner/history/detail, i18n en/es | mobile | manual in app (Metro reload) | `feat(workouts): pause and resume the active workout` |
| 6 | Roadmap, backlog, spec status; redeploy the API | docs / ops | `/health` ok; AC-3 on device | `docs(sdd): close spec 0011` |

Task 6 includes a redeploy; not verifiable in CI.

## Progress log

- 2026-09-24 — Spec written from decisions taken with the owner; tasks awaiting review.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/01-live-workout-logging.md` updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] API redeployed with the migration applied
