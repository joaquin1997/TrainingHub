---
spec: 0032
status: in-progress  # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Tasks — Live record badges while logging

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Order: domain → API → mobile → docs. No migration, no native rebuild.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | — | `docs(sdd): plan and tasks for 0032` |
| 2 | [x] `packages/domain/src/records.ts`: per-set record rules, `StartingRecords`, `LiveRecordHit`, live comparison; API `records.ts` / `sides.ts` score through them; API build builds the domain; Vitest aliases; mobile tsconfig path `@workout/domain/records` | domain / api | existing API record tests unchanged; new domain-rule tests; built API imports the domain at runtime | `feat(progress): share per-set record rules in the domain package` |
| 3 | [x] `deriveExerciseRecords` returns most reps at every weight; `buildStartingRecords`; `GET /progress/starting-records`; tests | api | tests (performed only, warm-ups excluded, never performed, 400s) | `feat(progress): starting records for the active workout` |
| 4 | [x] Draft `startingRecords`; `missingStartingRecordIds`, `withStartingRecords`; client; `useStartingRecords` (load, merge into the current draft, 30 s retry, stop on 404); tests | mobile | tests (AC-8 draft side, EF-4) | `feat(workouts): keep starting records with the active workout` |
| 5 | [x] `buildLiveRecordBadges`, `recordNotice`; tests for every scenario | mobile | tests (AC-1–AC-7, AC-12–AC-14) | `feat(workouts): derive live record badges from the draft` |
| 6 | [ ] `RecordBadge`, `RecordNotice`, `useLiveRecords`; screen wiring; `describeRecord` widened; i18n en/es | mobile | typecheck; `expo export --platform web` bundles the shared module | `feat(workouts): show record badges and a notice while logging` |
| 7 | [ ] Progress log, definition of done | docs | — | `docs(sdd): record 0032 implementation` |

Not verifiable in CI: the badge and notice layout on a phone, offline after
reopening (AC-8, AC-9), AC-10/AC-11 end to end — [DEVICE]; the API redeploy —
(owner: deploy).

### Acceptance criteria → tasks

| AC | Tasks | How |
|---|---|---|
| AC-1–AC-7, AC-12–AC-14 | 2, 5 | badge and notice tests over the shared rules |
| AC-8 | 4 | draft keeps the records (envelope round trip); [DEVICE] |
| AC-9 | 4, 5 | errors swallowed, no records → no badge; [DEVICE] |
| AC-10, AC-11 | 3–6 | no write path exists; [DEVICE] |

## Progress log

- 2026-10-17 — Plan and tasks written and self-approved under the owner's
  delegation. Probe before planning: Metro bundles a domain module reached
  through its own tsconfig path, but not the domain index (`./auth.js`
  unresolved), hence `@workout/domain/records`.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Roadmap/backlog updates handed to the coordinator
- [ ] [DEVICE] Badge under a row and on the exercise, the notice, AC-1–AC-6 by
      hand, AC-8 (offline + reopen), AC-9 (started offline), AC-10/AC-11
- [ ] (owner: deploy) API redeploy for `GET /progress/starting-records`
- [ ] `spec.md` status set to `done`
