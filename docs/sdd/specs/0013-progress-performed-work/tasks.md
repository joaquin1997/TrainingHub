---
spec: 0013
status: in-progress  # tasks approved by the owner, 2026-09-24
created: 2026-09-24
---

# Tasks — Progress counts only performed work

Ordered, independently committable, independently verifiable. Each task leaves
the tree green: `pnpm -r typecheck` and `pnpm -r test` pass at every step
(Article 8).

No migration. The API tasks change derived figures only, and the mobile tasks
cope with both an old and a new API (the `performed` fallback), so the API can
be deployed at any point after task 5.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Spec, plan and tasks; glossary (performed set, warmup set, legacy session); backlog | docs | links resolve | `docs(sdd): spec 0013 progress counts only performed work` |
| 2 | [x] `performedSets.ts`: `isLegacySession`, `isPerformedSet`, `isWarmupSet`, `pickLastPerformance` (pure, not wired yet) | api | unit tests (`performedSets.test.ts`) | `feat(workouts): rule for performed and warmup sets` |
| 3 | [x] `WorkoutSet.performed?` in domain; `mapWorkoutSession` sets it from the rule | domain / api | typecheck; unit test on the pure flagging helper | `feat(workouts): expose the performed flag on saved sets` |
| 4 | [x] Progress: loader passes `completedAt` / `type` / `isWarmup`; `selectPerformedWork`; bests and 1RM from performed non-warmup sets, volume from all performed | api | unit tests (`aggregate.test.ts`): 1 of 4 done, warmup above best, legacy session, stored unperformed values ignored; existing fixtures updated | `fix(progress): count only performed sets; keep warmups out of records` |
| 5 | [x] "Last time": fetch the 10 most recent entries, choose with `pickLastPerformance` | api | unit tests (picker); route test unchanged (repository mocked) | `fix(workouts): last time shows only performed sets` |
| 6 | Redeploy the API; check progress and "last time" on the phone | ops | **[DEPLOY]** `/health` ok; **[DEVICE]** AC-1, AC-2, AC-3, AC-5 | — (no commit) |
| 7 | [x] `isPerformedSet` (mobile, with `completedAt` fallback); history volume and detail ✓/○, totals use it | mobile | unit test (`performedSet.test.ts`); **[DEVICE]** AC-4 | `fix(workouts): history treats legacy sessions as performed` |
| 8 | [x] Post-workout summary renders the saved values from the skeleton, formatted in the session unit | mobile | unit test for the skeleton values if missing; **[DEVICE]** AC-6 | `fix(workouts): summary shows the values that were saved` |
| 9 | Rename `progress.volumeByMuscleGroup` → `volumeByCategory` (en/es) | mobile | typecheck (catalog shape); **[DEVICE]** AC-7 in ES and EN | `fix(progress): label the volume distribution by category` |
| 10 | Roadmap 04 (with the "figures drop on purpose" note), retro 0006, backlog; spec status `done` | docs | links resolve | `docs(sdd): close spec 0013` |

Tasks 6–9 need a redeploy or the phone for their acceptance checks. The mobile
tasks need only a Metro reload, not a native rebuild.

### Acceptance criteria → tasks

| AC | Unit-tested in | Checked on device in |
|---|---|---|
| AC-1 | 4 | 6 |
| AC-2 | 2, 5 | 6 |
| AC-3 | 4 | 6 |
| AC-4 | 2, 3, 4, 7 | 7 |
| AC-5 | 4 | 6 |
| AC-6 | 8 | 8 |
| AC-7 | 9 (typecheck) | 9 |

## Progress log

- 2026-09-24 — Spec (gate 1: unmarked sets keep being saved) and plan approved;
  tasks approved; implementation started.
- 2026-09-24 — Task 2: rule module with 11 unit tests (legacy, Date/ISO
  completion, warmup via type or older flag, picker fallback).
- 2026-09-24 — Task 3: `performed` on `WorkoutSet`, set in `mapWorkoutSession`
  from the task-2 helpers (the mapper itself is not unit-testable: the route
  tests mock the repository; the helpers carry the logic and are tested).
- 2026-09-24 — Task 4: `selectPerformedWork` runs once in the loader, so the
  builders stay rule-free and existing fixtures needed no change. 6 new tests
  (1-of-4 done, dropped exercise, legacy, warmup in volume not records, older
  warmup flag, warmup-only session).
- 2026-09-24 — Task 5: "last time" looks through the 10 most recent entries
  (`LAST_PERFORMANCE_LOOKBACK`) and picks with `pickLastPerformance`. The
  Prisma query is type-checked but only exercised for real after the redeploy
  (task 6): route tests mock the repository.
- 2026-10-16 — Task 6 left for the owner (deploy + device checks are batched
  after several specs; decided with the owner). Work continues on branch
  `feat/sdd-0013-0012`.
- 2026-10-16 — Task 7: `isPerformedSet` (server flag, `completedAt` fallback)
  drives history volume and the detail's ✓/○, totals and per-exercise volume.
  3 unit tests. The history list's set count still includes unperformed sets
  (out of scope in the plan).
- 2026-10-16 — Task 8: the summary renders the skeleton (effective values, kg
  formatted into the session unit). 2 unit tests on the skeleton values.
  Found, not fixed (pre-existing, out of scope): saving rounds kg to one
  decimal, so 100 lb is stored as 45.4 kg and reads back as 100.1 lb in the
  summary, history and detail. Logged in `../../backlog.md` follow-ups.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/04-progress-and-prs.md` checklist and progress log updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] Retro 0006 records the invariant: progress reads only performed sets;
      warmups count for volume, never for records
