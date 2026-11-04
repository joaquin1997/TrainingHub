---
spec: 0046
status: in-progress
created: 2026-11-03
---

# Tasks — Completed values, undo selection and top Finish

Task gate self-reviewed; tasks 1–4 implemented locally 2026-11-04. Every unchecked row is
one independently committable change with its own verification. Additive
contracts land before consumers; no task requires committing broken callers.
Run `pnpm -r typecheck` and `pnpm -r test` before every implementation commit.
Rollout/device rows record acceptance evidence in a documentation commit;
they are not claims that deployment happened during planning.

## Dependencies and order

0043 may land first but these optional draft additions must merge without resetting its preference/type metadata. 0047 consumes the stable rest ID and origin established here.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Add optional stable completion/rest origin IDs and exact undo selection fields with pure transition helpers, keeping current callers compatible. | mobile/state | AC-3–AC-4, AC-8–AC-11; old/malformed envelope, same-set retick, same-exercise unrelated rests and no origin fallback. | `feat(mobile): track undo selection and rest origin` |
| 2 | [x] Connect phone completion/undo, supersets and currentSetToDo to the new state rules; preserve origin across rest edits and watch completion. | mobile/flow | AC-3–AC-4, AC-8–AC-11, EF-3–EF-5; round trigger vs owner, multiple undos, deletion, controller/runner cancellation and stale replay. | `fix(mobile): restore undone sets and cancel their rests` |
| 3 | [x] Use normal theme placeholder color for done values, including both sides and all tracking fields. | mobile/ui | AC-1–AC-2 visual dark/light check; typed values and placeholder strings remain unchanged after undo. | `fix(mobile): show completed suggestions as logged values` |
| 4 | [x] Add guarded top Finish with confirmation and visible error/recovery state using existing handler. | mobile/ui | AC-5–AC-7, EF-1–EF-2; cancel/no sets, double tap, replacement-workout race, offline/permanent refusal. | `feat(mobile): finish workouts from the header` |
| 5 | [ ] Record device acceptance and update glossary/roadmap/backlog. | docs/device | AC-1–AC-11, 320 pt/large text, connected watch cancellation, paused-workout rest and reconnect; no stale alert. | `docs(sdd): record workout interaction acceptance` |

## Rollout and device acceptance

Bundle-only initially. Check actual installed watch clears local rest on phone undo; if native fix is required, include it in 0047 rebuild and keep affected acceptance pending. Do not alter 0011 independent rest-countdown behaviour.

## Definition of done

- [ ] All spec FR/EF/AC cases satisfied; unresolved investigations remain explicit.
- [ ] Required typecheck/tests pass; backward compatibility and ownership checked.
- [ ] Required migrations, API/bundle delivery and native rebuilds recorded separately.
- [ ] Physical-device/operational checks have evidence, not inferred from unit tests.
- [ ] Roadmap/backlog updated; mark spec/plan/tasks done only after acceptance.

## Progress log

- 2026-11-03 — Implementation plan and task breakdown prepared and self-reviewed.
  No implementation task completed; no deployment or device acceptance in this pass.

## Local implementation — 2026-11-04

Tasks 1–4 are implemented with state/selector, hydration, runner, watch
controller and Finish-guard regression coverage. See [verification.md](verification.md).
Their physical visual/native acceptance cases remain in task 5; automated
controller delivery does not prove cancellation of an installed watch buzz.
No API/schema change, native rebuild, server deployment or device acceptance
was performed. Spec remains in-progress.
