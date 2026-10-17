---
spec: 0015
status: in-progress  # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Tasks — Custom exercises are private

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Order: API rule → API endpoints → routines/workouts → mobile → docs. No
domain change, no migration, no native rebuild. The API change is safe for
older apps (fewer rows, 404 instead of 403 on paths they cannot reach).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | — | `docs(sdd): plan and tasks for 0015` |
| 2 | [x] `exercises/visibility.ts`: `visibleExerciseWhere`, `usableExerciseWhere`, `classifyExerciseAccess`; tests | api | unit tests | `feat(exercises): visibility rule for custom exercises` |
| 3 | [x] Exercises API scoped to the person: list, detail, same-name dedupe (catalog first), favourites (add, list), photo read; photo writes and unilateral answer 404 for someone else's custom exercise; route tests incl. "no existence leak" | api | route tests (AC-1, 2, 7, 8, 9) | `feat(exercises): custom exercises visible only to their creator` |
| 4 | [x] `findUsableExercises`; routines create/update and workout save accept catalog, own and held exercises only; route tests | api | route tests (AC-5, AC-6, EF-1, EF-2) | `feat(exercises): routines and workouts keep held exercises only` |
| 5 | [x] Mobile EF-4: `isExerciseGone`; picker checks a custom exercise before choosing (notice + reload); routine form message + catalog reload on unknown exercises; i18n en/es | mobile | unit test; typecheck | `feat(exercises): handle exercises that are no longer available` |
| 6 | [ ] Local end-to-end check on PGlite (two users, curl through AC-1…AC-9); progress log; definition of done | docs | log | `docs(sdd): record 0015 implementation` |
| 7 | [ ] [DEVICE] Ben's app: held exercise in a routine and its workout show the neutral tile and the name; not in pickers; a stale picker shows the notice | mobile | device | — |
| 8 | [ ] (owner: deploy) Redeploy the API (no migration) | ops | `/health`; Ana/Ben check of AC-1 on the server | — |

Not verifiable in CI: the end-to-end check (local PGlite, task 6), the
device pass (task 7), the redeploy (task 8).

### Acceptance criteria → tasks

| AC | Tasks | How |
|---|---|---|
| AC-1 | 2, 3, 6 | where-builder test; list route passes the person; e2e |
| AC-2 | 3, 6 | "no existence leak" route tests; e2e curl |
| AC-3 | 3, 6 | dedupe scoped (repository); e2e |
| AC-4 | 3, 6 | dedupe catalog first; e2e |
| AC-5 | 2, 4, 6, 7 | usable-where test; routines route test; e2e; device |
| AC-6 | 4, 6 | routines route test; e2e (routine and workout → 400) |
| AC-7 | 3, 6 | favourites filtered; e2e |
| AC-8 | 2, 3 | classifier test; unilateral route tests |
| AC-9 | 3, 6 | list route resolves the person (dev fallback); e2e anonymous |
| EF-1 | 4, 6 | e2e workout with a held exercise → 201 |
| EF-2 | 4, 6 | e2e → 400 unknown exercise |
| EF-3 | 2 | classifier test (creator gone) |
| EF-4 | 5, 7 | `isExerciseGone` test; device |
| EF-5 | 3 | by construction |

## Progress log

- 2026-10-17 — Plan and tasks written and self-approved under the owner's
  delegation (gates delegated 2026-10-16). No migration needed: visibility
  and "held" are derived from existing columns and the person's own data.
- 2026-10-17 — Task 2: `exercises/visibility.ts` — the rule as two Prisma
  `where` builders (visible; usable = visible or held) and a pure classifier
  (catalog / own / hidden); 8 unit tests.
- 2026-10-17 — Task 3: list, detail, dedupe (catalog first), favourites,
  photo read scoped to the acting person; photo writes and unilateral map
  someone else's custom exercise to 404 (the 403 branch for it is gone; the
  photo write keeps 403 for catalog exercises). Route tests: a "no existence
  leak" block whose repository mock applies the real classifier, comparing
  status, content type and body of Ana's id against an unknown id for detail,
  photo read/write/delete, favourite and unilateral. Interim: the routines
  route looks exercises up as visible-only until task 4 widens it to held.
- 2026-10-17 — Task 4: `findUsableExercises` (one query per save instead of
  one per row) for routine create/update; the workout save's exercise lookup
  uses `usableExerciseWhere` (the `TODO(sdd)` for 0015 there is closed). Route
  tests: acting person passed once, a foreign not-held id → 400 on POST and
  PUT, a held one saved under its name. The DB side of "held" is checked end
  to end in task 6.
- 2026-10-17 — Task 5: `exerciseAvailability.ts` (`needsAvailabilityCheck`,
  `isExerciseGone`, `isUnknownRoutineExerciseError`; 5 tests). The picker
  (add/replace in the workout, replace in the routine form) re-checks a custom
  exercise with `GET /exercises/:id` before applying it; 404 drops it, shows a
  notice and reloads the list; any other failure lets the choice through
  (offline). Catalog exercises and one just created skip the check. The
  routine form maps the unknown-exercises refusal to a translated message and
  reloads its search list. Held exercises needed no app change: the active
  workout's thumbnail already falls back to the neutral tile when the detail
  is 404, and the routine form edits a row from the routine's own id and name.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Relevant `docs/roadmap/NN-*.md` checklist and progress log updated
      (left to the owner's merge: this branch does not touch `docs/roadmap/`)
- [ ] `spec.md` status set to `done`; `../backlog.md` updated (after the
      device pass and deploy; backlog left to the merge)
- [ ] Constitution amended if this work settled a new invariant
