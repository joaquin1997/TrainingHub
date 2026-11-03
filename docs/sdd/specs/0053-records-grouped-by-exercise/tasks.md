---
spec: 0053
status: draft
created: 2026-11-03
---

# Tasks — Group summary records by exercise

Task gate self-reviewed; implementation not started. Every unchecked row is
one independently committable change with its own verification. Additive
contracts land before consumers; no task requires committing broken callers.
Run `pnpm -r typecheck` and `pnpm -r test` before every implementation commit.
Rollout/device rows record acceptance evidence in a documentation commit;
they are not claims that deployment happened during planning.

## Dependencies and order

Prefer 0048 first for final labels, but helper/composition consumes current saved PR data and can be implemented independently. Do not require 0051 to obtain ordering; completed draft order already available.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [ ] Add pure identity/order-based group view-model helper using existing saved-record DTOs. | mobile/rules | AC-1–AC-3, AC-7; repeated exercise occurrence, same names/different IDs, unknown order fallback, no entry/count loss. | `feat(mobile): group session records by exercise identity` |
| 2 | [ ] Compose grouped card from existing record rows and headings, leaving single-exercise and share callers unchanged. | mobile/ui | AC-1–AC-5, AC-7; all records visible, type priority/date/set values and evidence links retained, no improvement in PR count. | `feat(mobile): render exercise-grouped record summaries` |
| 3 | [ ] Wire summary grouping and explicit record-load/retry state while preserving loaded results and celebration identity. | mobile | AC-1, AC-5–AC-7; successful empty vs failed load, stale-account response guard, retry no duplicate celebration. | `fix(mobile): preserve grouped record feedback on refresh` |
| 4 | [ ] Record ES/EN, theme, large-text and screen-reader acceptance plus roadmap/backlog. | docs/device | AC-1–AC-7; 320 pt, unchanged Progress/share rendering, retired exercise and correct evidence navigation. | `docs(sdd): record grouped record summary acceptance` |

## Rollout and device acceptance

Bundle-only, no API/migration/native dependency. Check summary identity grouping/reading order on device, with no changes to single-exercise Progress or share artifacts.

## Definition of done

- [ ] All spec FR/EF/AC cases satisfied; unresolved investigations remain explicit.
- [ ] Required typecheck/tests pass; backward compatibility and ownership checked.
- [ ] Required migrations, API/bundle delivery and native rebuilds recorded separately.
- [ ] Physical-device/operational checks have evidence, not inferred from unit tests.
- [ ] Roadmap/backlog updated; mark spec/plan/tasks done only after acceptance.

## Progress log

- 2026-11-03 — Implementation plan and task breakdown prepared and self-reviewed.
  No implementation task completed; no deployment or device acceptance in this pass.
