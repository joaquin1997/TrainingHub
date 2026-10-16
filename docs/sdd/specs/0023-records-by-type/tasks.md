---
spec: 0023
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Tasks — Personal records by type

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
No migration. No native rebuild. The API must be deployed before the app
shows records (the app copes with an older API by showing none).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | links resolve | `docs(sdd): plan and tasks for 0023` |
| 2 | [ ] Domain: `RecordType`, `ExerciseRecord`, `SessionRecord`, `SessionRecords`; optional `records` on `ExerciseProgressDetail`. API: `records.ts` (one pure function per single-value type + reps at weight; bests and per-session hits); `aggregate.ts` fills `records` and computes `isRecordSession` from any type; Epley moved into `records.ts` | domain + api | unit tests: each type, strict improvement, EF-1, AC-3 warm-up, AC-1 reps at weight, top three weights, session grouping | `feat(progress): derive personal records by type` |
| 3 | [ ] `buildSessionRecords` (+ `workoutId` / `clientId` on the input, filled by the repository); `GET /progress/session-records`; route test; `progressClient.sessionRecords()` | api + mobile client | unit test AC-2 (session volume hit), route test | `feat(progress): list the records each workout beat` |
| 4 | [ ] `describeRecord` (+ test, kg and lb); `RecordsCard`; exercise progress screen: records card (type, value, date) and most reps for the top three weights; timeline card retitled; "Best" tile caption from the heaviest set; i18n en/es | mobile | unit test; web preview: AC-1 exercise screen shows 8 reps | `feat(progress): show the best of each record type` |
| 5 | [ ] Summary: records card matched by `clientId`; History list: "N records" chip; History detail: records card by `workoutId`; i18n en/es | mobile | typecheck; web preview: AC-1 summary "Most reps at 100 kg", AC-2 History entry | `feat(workouts): name the records a workout beat` |
| 6 | [ ] Progress log, definition of done, spec status | docs | — | `docs(sdd): close spec 0023 implementation` |

Not verifiable in CI: the screens (tasks 4–5) on the owner's device; the API
deploy that makes them show data.

### Acceptance criteria → tasks

| AC | Task | How |
|---|---|---|
| AC-1 | 2, 4, 5 | unit test + web preview |
| AC-2 | 3, 5 | unit test + web preview |
| AC-3 | 2 | unit test |

## Progress log

- 2026-10-16 — Plan and tasks written and self-approved under the owner's
  delegation.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Roadmap 04, backlog and glossary updates handed to the coordinator
- [ ] `spec.md` status set to `done` (after the owner's device check)
