---
spec: 0049
status: draft
created: 2026-11-03
---

# Tasks — Weight per side

Task gate self-reviewed; implementation not started. Every unchecked row is
one independently committable change with its own verification. Additive
contracts land before consumers; no task requires committing broken callers.
Run `pnpm -r typecheck` and `pnpm -r test` before every implementation commit.
Rollout/device rows record acceptance evidence in a documentation commit;
they are not claims that deployment happened during planning.

## Dependencies and order

Implement after 0043 and 0048. Prefer 0050/0051 first on shared targets, then extend their explicit DTOs/selection adapters in tasks 3/5/6 to retain side data. No silent unknown-field loss.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [ ] Add optional mode/side target/performed DTOs and same-side candidate helpers with legacy defaults. | domain | AC-1–AC-2, AC-4, AC-6; 510/360 kg, no cross-side pair, null/zero and legacy rule fixtures. | `feat(domain): model per-side weights and record candidates` |
| 2 | [ ] Add generated side-field/occurrence-mode snapshot migration and regenerate Prisma client. | api/schema | Existing rows remain shared; fresh/upgrade test database reads unchanged legacy weights. | `feat(api): store optional side weights and targets` |
| 3 | [ ] Map/validate/persist side fields across routine/workout/last-performance routes and add authenticated runtime capability and old-client overwrite/read guards. | api | AC-5–AC-7, EF-1–EF-3; round trip, capability missing, existing separate routine replacement, 400/401/404/409 and transaction rollback. | `feat(api): safely read and write per-side training` |
| 4 | [ ] Wire same-side candidates and actual side volume through API aggregation/history/starting references, preserving eligibility by use. | api/rules | AC-1–AC-2, AC-4, AC-6–AC-7; saved/live reference parity, no warm-up PR, historical display after catalog flag change. | `fix(progress): derive records from matching side measurements` |
| 5 | [ ] Add draft fields/mode transitions/persistence and routine targets with explicit unequal-load collapse review. | mobile | AC-3, AC-5–AC-7; enable copies effective values, per-set left/right selection, cancel atomicity, old drafts, unit capture and unsupported server read-only. | `feat(mobile): configure and log separate side loads` |
| 6 | [ ] Adapt summaries/history/progress/last time/shares/live feedback and watch targets to shared side helpers. | mobile | AC-1–AC-2, AC-4–AC-7; no larger-side surrogate, both labels shown and no fictitious set, 0048 and 0050/0051 optional-field preservation. | `feat(mobile): display and compare per-side training` |
| 7 | [ ] Adapt automatic warm-up preview to lesser working load with equal per-side generated rows and existing personal count/increment. | mobile | AC-8; 20/25 target uses 20, missing-side guidance, manual/done rows unchanged and 0043 regression. | `feat(mobile): generate common warm-ups for side loads` |
| 8 | [ ] Record compatible API/app rollout, integration and phone/watch acceptance. | docs/rollout | AC-1–AC-8, old-client update gates, asymmetric targets/history/shares, 320 pt/large text and rollback retaining side-aware API. | `docs(sdd): record per-side load acceptance` |

## Rollout and device acceptance

Generated migration/API plus capability support precede opt-in app. If Swift target layout changes, include in paired native rebuild; otherwise verify display-ready target on existing watch. Once side data exists, retain a capable API even if rolling back the feature UI.

## Definition of done

- [ ] All spec FR/EF/AC cases satisfied; unresolved investigations remain explicit.
- [ ] Required typecheck/tests pass; backward compatibility and ownership checked.
- [ ] Required migrations, API/bundle delivery and native rebuilds recorded separately.
- [ ] Physical-device/operational checks have evidence, not inferred from unit tests.
- [ ] Roadmap/backlog updated; mark spec/plan/tasks done only after acceptance.

## Progress log

- 2026-11-03 — Implementation plan and task breakdown prepared and self-reviewed.
  No implementation task completed; no deployment or device acceptance in this pass.
