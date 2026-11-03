---
spec: 0043
status: in-progress
created: 2026-11-03
---

# Tasks — Smarter warm-ups and explained set types

Task gate self-reviewed; implementation started. Every unchecked row is
one independently committable change with its own verification. Additive
contracts land before consumers; no task requires committing broken callers.
Run `pnpm -r typecheck` and `pnpm -r test` before every implementation commit.
Rollout/device rows record acceptance evidence in a documentation commit;
they are not claims that deployment happened during planning.

## Dependencies and order

Existing master and revised 0043 plan. 0049 later adapts separate side targets; 0043 must work on current shared targets first.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [ ] Add optional personal warm-up preference DTOs/read metadata and validated draft fields without changing current callers. | domain/mobile | Compile existing callers; old envelopes and account hydration remain valid. | `feat(domain): define personal warm-up preferences` |
| 2 | [x] Add unique user/exercise preference relation with generated Prisma migration and client generation. | api/schema | Fresh migration and existing catalog fixtures retain all values; no catalog provenance column. | `feat(api): persist personal warm-up preferences` |
| 3 | [x] Add authenticated preference GET/PUT and user-isolated access/validation. | api | AC-6, AC-12–AC-13; own/shared/foreign/deleted resources, reset nulls, invalid count/increment, two users. | `feat(api): expose owned warm-up preferences` |
| 4 | [ ] Extend pure ramp/context helpers with Automatic and 1–5 schemes and custom increments, retaining legacy helper defaults. | mobile/rules | AC-1–AC-5, AC-9, AC-11–AC-12; all schemes, rounding, light target, primary/category and kg/lb cases. | `feat(mobile): calculate configurable warm-up ramps` |
| 5 | [ ] Wire user-scoped preference cache, workout preview controls and offline pending draft persistence. | mobile | AC-6, AC-11–AC-13, EF-1–EF-6; invalid partial input, late replies, reset, reopen and stale exercise/account guards. | `feat(mobile): configure workout warm-up previews` |
| 6 | [ ] Integrate routine preview through separate intended-work context using same personal preference controls. | mobile | AC-8, AC-12–AC-13; preceding routine targets vs completed workout sets, no routine mutation from preference. | `feat(mobile): configure routine warm-up previews` |
| 7 | [ ] Replace workout/routine type cycling with shared named and explained picker. | mobile | AC-7–AC-8, AC-10, EF-4; no-op/dismiss, preserved values/done/rest, numbering, generated-origin and badge effects. | `feat(mobile): explain and select set types` |
| 8 | [ ] Record migration/API/bundle rollout and device acceptance; update statuses only after all cases pass. | docs/rollout | Both users/devices, ES/EN/theme/large text, offline retry, personal cable 2.5/5 kg, all AC cases. | `docs(sdd): record warm-up acceptance` |

## Rollout and device acceptance

Migration/API precede app bundle. No native rebuild for this slice. Run the complete 0043 AC-1–AC-13 checklist on workout and routine previews, plus two-account and second-device preference checks. Keep deployment and acceptance pending until performed.

## Definition of done

- [ ] All spec FR/EF/AC cases satisfied; unresolved investigations remain explicit.
- [ ] Required typecheck/tests pass; backward compatibility and ownership checked.
- [ ] Required migrations, API/bundle delivery and native rebuilds recorded separately.
- [ ] Physical-device/operational checks have evidence, not inferred from unit tests.
- [ ] Roadmap/backlog updated; mark spec/plan/tasks done only after acceptance.

## Progress log

- 2026-11-03 — Implementation plan and task breakdown prepared and self-reviewed.
  No implementation task completed; no deployment or device acceptance in this pass.

- 2026-11-03 — Personal preference DTOs, routine catalog metadata and authenticated
  GET/PUT implemented. Generated additive migration from schema diff, applied
  all 27 migrations to an isolated temporary PostgreSQL container. Two real-DB
  tests verify user isolation, reset, private/retired access and unchanged catalog.
  Typecheck and existing/new route tests pass; production database untouched.
