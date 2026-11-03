---
spec: 0050
status: draft
created: 2026-11-03
---

# Tasks — Correct saved workout errors

Task gate self-reviewed; implementation not started. Every unchecked row is
one independently committable change with its own verification. Additive
contracts land before consumers; no task requires committing broken callers.
Run `pnpm -r typecheck` and `pnpm -r test` before every implementation commit.
Rollout/device rows record acceptance evidence in a documentation commit;
they are not claims that deployment happened during planning.

## Dependencies and order

Independent of 0049 for current shared-weight sessions. Its later side fields must extend the correction allowlist/round-trip tests and capability guard. 0048 live baselines remain frozen during other-session correction.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [ ] Add optional read revision and dedicated correction/mutation/conflict DTOs; existing create contract unchanged. | domain | Compile all current consumers; correction IDs/allowed quantities have explicit types. | `feat(domain): define saved workout corrections` |
| 2 | [ ] Add generated revision and last-correction mutation/hash schema fields. | api/schema | Fresh/upgrade DB generation; existing workout identities/data preserved and revision defaults zero. | `feat(api): version saved workout corrections` |
| 3 | [ ] Implement authenticated scalar-only correction parser/writer with atomic owner+revision guard, idempotent retry and legacy completion normalization. | api | AC-1–AC-2, AC-4–AC-7; real transaction rollback/two writers, duplicate/wrong child IDs, 401/404/409, no POST/identity/structure change. | `feat(api): atomically correct owned workout values` |
| 4 | [ ] Add isolated correction draft/client/screen and navigation Save/Discard/Keep editing, preserving pending edit on errors. | mobile | AC-2–AC-6; old API read-only, unit snapshot, offline/reauth/conflict, no dirty exit prompt without edits, active draft untouched. | `feat(mobile): edit saved workout measurements` |
| 5 | [ ] Refresh affected history/progress/last-time/summary/widget readers through owned invalidation/focus reload. | mobile | AC-1, AC-6–AC-7; later PR chronology updates, stale refresh explicitly labelled; active reference snapshots remain unchanged. | `fix(mobile): refresh training views after corrections` |
| 6 | [ ] Add explicit existing-Health-export limitation copy and record acceptance/rollout. | docs/mobile | AC-1–AC-7, real legacy session and widget refresh; no invented export status, Health artifact untouched, errors retain edits. | `docs(sdd): record saved workout correction acceptance` |

## Rollout and device acceptance

Migration/API before bundle; no native rebuild. Use isolated DB integration tests for atomic writes and old legacy completion semantics; device checks for back gestures, reauth, visible historical recalculation and widget refresh. No production correction performed during planning.

## Definition of done

- [ ] All spec FR/EF/AC cases satisfied; unresolved investigations remain explicit.
- [ ] Required typecheck/tests pass; backward compatibility and ownership checked.
- [ ] Required migrations, API/bundle delivery and native rebuilds recorded separately.
- [ ] Physical-device/operational checks have evidence, not inferred from unit tests.
- [ ] Roadmap/backlog updated; mark spec/plan/tasks done only after acceptance.

## Progress log

- 2026-11-03 — Implementation plan and task breakdown prepared and self-reviewed.
  No implementation task completed; no deployment or device acceptance in this pass.
