---
spec: 0014
status: in-progress  # self-approved 2026-10-16 under the owner's delegation
created: 2026-10-16
---

# Tasks — Workout save integrity

Ordered, independently committable, independently verifiable. Each task leaves
the tree green: `pnpm -r typecheck` and `pnpm -r test` pass at every step
(Article 8).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | Spec, plan and tasks; glossary (workout identity, optional provenance, lock covers deletion); backlog | docs | links resolve | `docs(sdd): spec 0014 workout save integrity` |
| 2 | `CreateWorkoutSessionInput.clientId?`; schema `clientId` + `@@unique([userId, clientId])`; generated migration | domain / data | `prisma validate`; typecheck | `feat(workouts): client identity on saved workouts` |
| 3 | Route: parse `clientId`, validate times (unreadable, end < start) | api | route tests (4 new) | `fix(workouts): refuse unreadable or inverted workout times` |
| 4 | `saveReferences.ts` (`dropForeignLinks`, `findUnknownExercise`); repository resolves owned refs, throws `UnknownExerciseError`, replays by `clientId` (incl. `P2002`); route `201`/`200`/`400` | api | unit tests; route tests | `fix(workouts): idempotent save with owned references only` |
| 5 | Draft `clientId` (generated, stable across edits) sent in the payload | mobile | unit tests | `feat(workouts): send a stable identity with each workout` |
| 6 | Active routine: no edit/delete from the list menu or detail; detail Delete confirms; `ActionSheet` message | mobile | typecheck; **[DEVICE]** AC-6, AC-7 | `fix(routines): lock the active workout's routine and confirm deletes` |
| 7 | Apply migration + redeploy; `curl` replay and parallel saves; device AC-2 | ops | **[DEPLOY]** AC-1, EF-2; **[DEVICE]** AC-2 | — (no commit) |
| 8 | Roadmap 01, retro 0004 (gap closed), 0001 FR-7 note, backlog; spec status | docs | links resolve | `docs(sdd): close spec 0014` |

Task 7 is the owner's (deploy and device checks are batched).

### Acceptance criteria → tasks

| AC | Task |
|---|---|
| AC-1 | 4 (route), 7 |
| AC-2 | 4, 7 |
| AC-3 | 4 |
| AC-4 | 3 |
| AC-5 | 4 |
| AC-6 | 6 |
| AC-7 | 6 |

## Progress log

- 2026-10-16 — Spec, plan and tasks written and self-approved under the
  owner's delegation (see spec "Open decisions"). Found while verifying: the
  routines list menu bypasses the edit lock, and the detail screen deletes
  without confirmation; both folded into task 6.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/01-live-workout-logging.md` updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] API redeployed with the migration applied
