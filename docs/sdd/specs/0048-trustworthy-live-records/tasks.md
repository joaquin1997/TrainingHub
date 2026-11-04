---
spec: 0048
status: in-progress
created: 2026-11-03
---

# Tasks — Record feedback and last-session comparisons

Task gate self-reviewed; tasks 1–5 implemented locally 2026-11-04. Every unchecked row is
one independently committable change with its own verification. Additive
contracts land before consumers; no task requires committing broken callers.
Run `pnpm -r typecheck` and `pnpm -r test` before every implementation commit.
Rollout/device rows record acceptance evidence in a documentation commit;
they are not claims that deployment happened during planning.

## Dependencies and order

0043 type changes and 0046 undo must still trigger derivation. 0049 later extends shared rules to same-side pairs. Original-case evidence is not required to build generic loading/presentation, but is required to close the reported defect.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Add compatible comparison reference/hit contracts and pure scope-specific helpers, preserving existing PR formulas. | domain/api tests | AC-1–AC-2, AC-7–AC-8, AC-10–AC-12; strict improvement, historical same-or-heavier vs last-session exact weight, no zero/fictitious pair. | `feat(domain): distinguish records and last-session improvements` |
| 2 | [x] Add owned batched reference endpoint/derivation with prior-start boundary and independent source results. | api | AC-4–AC-6, AC-9–AC-12; dates/ties, duplicate exercise occurrences, legacy performed work, 400/401/foreign history and successful empty. | `feat(api): provide workout comparison references` |
| 3 | [x] Persist validated reference snapshots and expose per-source load/error/retry state across workout lifecycle. | mobile/state | AC-3–AC-6, AC-9, AC-12; timer/foreground, partial failure, permanent refusal/reopen, old drafts, add/replace, stale user/workout replies. | `feat(mobile): expose reliable record reference loading` |
| 4 | [x] Derive both feedback scopes and priority/deduplication without PR-count or haptic inflation. | mobile/rules | AC-7–AC-8, AC-10–AC-12; undo/edit/retype/session-volume, late data has no transient burst, first session and equality silent. | `feat(mobile): show last-session progress alongside records` |
| 5 | [x] Render readable badge values, explicit extra-record count, accessible detail and loading/unavailable states. | mobile/ui | AC-1–AC-3, AC-7–AC-10; full labels/units/date/scope, both themes/languages/large text and separate Done tap. | `feat(mobile): explain record values and comparison sources` |
| 6 | [ ] Capture a concrete affected case, reproduce original record discrepancy, and commit focused regression/fix if established. | investigation | Investigation acceptance; expected/observed values, identity/auth/loading evidence; no personal data rewrite or guessed cause. If evidence absent leave this task open. | `fix(records): address reproduced record discrepancy` |
| 7 | [ ] Record API/bundle rollout, owner case verification and all remaining device checks. | docs/device | AC-1–AC-12 plus investigation gate; real offline/reconnect, old draft and affected exercise; no done status while original case unconfirmed. | `docs(sdd): record comparison feedback acceptance` |

## Rollout and device acceptance

API before bundle, no native rebuild. Verify both 50/45/47 and 52 kg scenarios; check a real affected exercise/session when evidence is available. Never mark complete merely because improved wording passes. Production data access/repair is a separate explicitly scoped operation.

## Definition of done

- [ ] All spec FR/EF/AC cases satisfied; unresolved investigations remain explicit.
- [ ] Required typecheck/tests pass; backward compatibility and ownership checked.
- [ ] Required migrations, API/bundle delivery and native rebuilds recorded separately.
- [ ] Physical-device/operational checks have evidence, not inferred from unit tests.
- [ ] Roadmap/backlog updated; mark spec/plan/tasks done only after acceptance.

## Progress log

- 2026-11-03 — Implementation plan and task breakdown prepared and self-reviewed.
  No implementation task completed; no deployment or device acceptance in this pass.

- 2026-11-04 — Tasks 1–5 implemented and locally tested; see verification.md.
  Owner explicitly deferred investigation task 6 (no concrete remembered case).
  Task 7 remains open for API/bundle delivery and physical/visual acceptance.

- 2026-11-04 — API-first rollout and paired phone/Watch Release installation
  completed from source 6655b1f; both apps launched. Delivery part of the
  final task is complete; physical cases remain unchecked. See verification.md.
