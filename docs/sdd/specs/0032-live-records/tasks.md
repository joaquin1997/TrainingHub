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
| 6 | [x] `RecordBadge`, `RecordNotice`, `useLiveRecords`; screen wiring; `describeRecord` widened; i18n en/es | mobile | typecheck; `expo export --platform web` bundles the shared module | `feat(workouts): show record badges and a notice while logging` |
| 7 | [x] Progress log, definition of done | docs | — | `docs(sdd): record 0032 implementation` |

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
- 2026-10-17 — Task 2. The per-set rules moved to
  `packages/domain/src/records.ts`; the API's 0013/0021/0022/0023 record
  tests passed unchanged, plus new tests of the shared rules (in the API,
  as the domain has no runner). The built API (`pnpm --filter @workout/api
  build`, which now builds the domain first) imported the moved rules at
  runtime through `packages/domain/dist`. `deriveExerciseRecords` also
  returns the full most-reps-per-weight map here (used by task 3).
- 2026-10-17 — Task 3. `GET /progress/starting-records`; builder tests
  (warm-ups and undone sets out, the same exercise twice in a workout as one
  session, never performed → empty) and route tests (order, dedupe, 400s).
  Not exercised against a database this time: the builder reads the same
  `loadSessionInputs` as every other progress route.
- 2026-10-17 — Tasks 4–6 (mobile). Starting records on the draft survive the
  0010 envelope round trip unchanged (no version bump: the field is
  optional). Badges are derived from the draft on every render, so every
  set mutation in the store (including those 0029/0031 add) is covered
  without hooks into them. The notice is raised by comparing consecutive
  drafts, so a tick from the watch shows it too. `expo export --platform
  web` bundled the app with the shared rules; no browser is available here,
  so the layout of the badge chip and the notice is left for the device
  pass.
- 2026-10-18 — Coordinator: backlog row and owner server steps updated;
  roadmap 04 checklist and progress log updated; glossary already had Starting
  records and Record badge.

## Definition of done

- [x] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO (EF-2 retries on a timer — plan,
      Risks)
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [x] Roadmap/backlog updates handed to the coordinator
- [ ] [DEVICE] Badge under a row and on the exercise, the notice, AC-1–AC-6 by
      hand, AC-8 (offline + reopen), AC-9 (started offline), AC-10/AC-11
- [ ] (owner: deploy) API redeploy for `GET /progress/starting-records`
- [ ] `spec.md` status set to `done`
