---
spec: 0051
status: draft
created: 2026-11-03
---

# Tasks — Review and retain routine changes

Task gate self-reviewed; implementation not started. Every unchecked row is
one independently committable change with its own verification. Additive
contracts land before consumers; no task requires committing broken callers.
Run `pnpm -r typecheck` and `pnpm -r test` before every implementation commit.
Rollout/device rows record acceptance evidence in a documentation commit;
they are not claims that deployment happened during planning.

## Dependencies and order

Use 0043 generated/manual origin and type vocabulary. Existing 0049 per-side mode later adds atomic side-target selection groups; shared changes must work first. Revision-aware ordinary editor path cannot be skipped.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [ ] Define optional routine revision and selected operation/mutation DTOs, preserving create/write compatibility. | domain | Existing callers compile; operations identify occurrences/sets rather than names or positions. | `feat(domain): define conditional routine change requests` |
| 2 | [ ] Add generated parent revision/mutation/hash and occurrence archive fields, with active-read filtering. | api/schema | Fresh/upgrade DB and routine list/start regression; existing unarchived templates unchanged. | `feat(api): version routine updates and preserve archived links` |
| 3 | [ ] Implement owned revision-checked stable-ID writer and route, and route existing editor writes through revision-aware persistence. | api | AC-5–AC-7; actual concurrent editor/review writes, child/archive rollback, idempotent retry, saved workout links preserved and no full delete/recreate. | `feat(api): apply selected routine changes atomically` |
| 4 | [ ] Capture immutable source snapshot, original targets/source IDs and explicit edit/generated-origin provenance in active drafts. | mobile/state | AC-1–AC-4, AC-7; old draft without snapshot, last-time placeholders not edits, watch reps edits and generated set edited afterward still excluded. | `feat(mobile): capture explicit training changes for routine review` |
| 5 | [ ] Build pure eligible diff, current-version rebase and dependency-aware selected operation application. | mobile/rules | AC-1–AC-4, AC-6–AC-7; repeated exercise, add/remove/replace/order/superset, unsupported type, target range mapping and partial deselection. | `feat(mobile): prepare selectable routine change proposals` |
| 6 | [ ] Preserve saved response and owner-scoped pending review separately from active draft, including finish-and-start path. | mobile/state | AC-5, EF-1–EF-5; successful POST once, routine failure never resaves, summary access, sign-out and new active session isolation. | `feat(mobile): retain routine review after saving training` |
| 7 | [ ] Add optional post-save offer and before/after review with all compatible changes selected, deselection and explicit update. | mobile/ui | AC-1–AC-7; decline, invalidated version fresh selection, offline retry, unknown/deleted source, generated exclusions and saved-summary access. | `feat(mobile): review routine updates after training` |
| 8 | [ ] Record API/bundle deployment and selected-change acceptance; update statuses. | docs/rollout | All AC/EF, two devices/editor conflict, actual template next start, no saved-history mutation and finish-and-start review. | `docs(sdd): record post-training routine update acceptance` |

## Rollout and device acceptance

Migration and archive-aware/version-aware API first, then bundle. No native rebuild. Verify no active routine reader resurrects archived occurrences and existing saved links remain stable. Provider/Health records never rewritten.

## Definition of done

- [ ] All spec FR/EF/AC cases satisfied; unresolved investigations remain explicit.
- [ ] Required typecheck/tests pass; backward compatibility and ownership checked.
- [ ] Required migrations, API/bundle delivery and native rebuilds recorded separately.
- [ ] Physical-device/operational checks have evidence, not inferred from unit tests.
- [ ] Roadmap/backlog updated; mark spec/plan/tasks done only after acceptance.

## Progress log

- 2026-11-03 — Implementation plan and task breakdown prepared and self-reviewed.
  No implementation task completed; no deployment or device acceptance in this pass.
