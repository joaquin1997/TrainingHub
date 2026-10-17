---
spec: 0015
status: approved     # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Plan — Custom exercises are private

How `spec.md` gets built. One visibility rule, applied in the API where
exercises are read and referenced; almost nothing changes in the app.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | A query rule ("catalog or mine", plus "or held" where my own data references it) in the exercises, routines and workouts repositories, and two small app guards for stale lists (EF-4). No sharing, copying, editing, deleting or per-person catalog settings (spec out of scope). |
| 2 — Template vs performed | yes | Routines and workouts are only *read* to decide what is held; no `RoutineExercise`, `WorkoutExercise` or `WorkoutSet` is rewritten or moved to a copy. The one rule serves both because it is a rule about `Exercise`, not a shared type. |
| 3 — Shared domain types | no | No contract changes: responses keep their shapes, only fewer rows and 404 instead of 403. `packages/domain` untouched (doc comment only, see Shared contracts). |
| 4 — Weight in kg | no | No weights involved. |
| 5 — Prisma migrations | no | No schema change. Visibility is derived from the existing `Exercise.isSystemDefined` and `createdByUserId`; held is derived from the person's routines and workouts (spec assumption). No data script: hidden favourites are filtered, not deleted. |
| 6 — Integrations behind interfaces | no | — |
| 7 — Secrets | no | Local end-to-end check uses an explicit throwaway local `DATABASE_URL`. |
| 8 — Committable + verified | yes | One commit per task, each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None added to the repo. (The local PGlite used for the end-to-end check lives in the scratchpad, as in 0021/0022/0026.) |
| 10 — TODOs over half-solutions | yes | Shared vs per-person catalog settings stays the spec's open item (`TODO(sdd)` in the spec); the photo route keeps its 403 for catalog exercises. Recorded in Risks. |

## Current state (verified in the code, 2026-10-17)

`apps/api/src/features/exercises/`:

- `listExercises()` — `findMany` over **every** exercise; the route does not
  even resolve the user.
- `findExerciseById(id)` — any exercise by `publicId`. Used by
  `GET /exercises/:id` and by the routines route to hydrate
  `exerciseName` on create and update.
- `createExercise` — same-name dedupe is `findFirst({ name: insensitive })`
  over every exercise, so it can return someone else's.
- Favourites — `resolveFavoriteIds` accepts any exercise;
  `listFavoriteExerciseIds` returns every favourite the person ever made.
- Photo — `findExercisePhoto(id)` serves any photo to anyone signed in
  (`TODO(0015)` on the route); writes go through `findOwnedExerciseId`,
  which answers **403** for someone else's custom exercise (an existence
  leak under this spec) and for catalog exercises.
- Unilateral — `setExerciseUnilateral` answers 403 for someone else's custom
  exercise (leak), allows catalog exercises to anyone signed in.

`apps/api/src/features/routines/routes.ts` — `hydrateRoutineWriteInput`
calls `findExerciseById` per exercise: anything that exists is accepted.

`apps/api/src/features/workouts/repository.ts` — `resolveOwnedReferences`
accepts any existing exercise (`TODO(sdd): spec 0015 narrows exercises…`);
an unknown one throws `UnknownExerciseError` → 400 (spec 0014).

Already per person and left alone: "last time"
(`GET /workouts/exercises/:id/last`, 404 "No previous performance" = no
data), progress and records (built from the person's own sessions), workout
and routine reads (they carry the exercise's name — FR-8 holds already).

`userContext.resolveUserPublicId` gives the signed-in person or, without a
token, the dev user (spec 0001) — AC-9 needs nothing more than calling it.

Mobile: every picker (`ExercisePickerModal`, the routine form's inline
search) reads `GET /exercises`; the active workout's thumbnails call
`GET /exercises/:id` and keep the neutral tile when it fails; the routine
form edits an existing row from the routine's own `exerciseId` and
`exerciseName`, never from the catalog. So once the API filters, held
exercises already show by name with the neutral tile and are not pickable.
The picker loads its list once per screen, so a list loaded before this
ships can still offer someone else's exercise (EF-4).

## Approach

### One rule, three readings

A new `apps/api/src/features/exercises/visibility.ts` holds the rule as
Prisma `where` builders and one pure classifier, so it is written once and
unit-tested without a database:

- `visibleExerciseWhere(userPublicId)` —
  `{ OR: [{ isSystemDefined: true }, { isSystemDefined: false, createdByUser: { publicId } }] }`.
  An exercise whose creator is gone has no `createdByUser` and is visible to
  nobody (EF-3).
- `usableExerciseWhere(userPublicId)` — visible **or held**: referenced by a
  `RoutineExercise` of one of the person's routines or a `WorkoutExercise` of
  one of the person's sessions (spec assumption: held is derived, not
  stored).
- `classifyExerciseAccess({ isSystemDefined, creatorPublicId }, userPublicId)`
  → `'catalog' | 'own' | 'hidden'`, for the write endpoints that must tell a
  catalog exercise (exists, maybe not editable) from a hidden one (does not
  exist for this person).

Where each reading applies:

| Reading | Used by |
|---|---|
| visible | `GET /exercises`, `GET /exercises/:id`, same-name dedupe, favourites (add, list), photo read, unilateral and photo writes (via the classifier) |
| usable (visible or held) | routine create/update hydration, workout save |
| neither (own data only) | workout/routine reads, last time, progress — unchanged |

### Endpoints

- **List** resolves the person and filters with `visibleExerciseWhere`
  (FR-1, FR-3: facets are computed in the app from this list, so they follow).
- **Detail** `findExerciseById(userPublicId, id)` → `findFirst` with
  `publicId` + visible; 404 `Exercise not found` otherwise (FR-2). A held
  exercise's detail is also 404: FR-8 lists where it is named, and the detail
  is not one of them.
- **Create** dedupe adds visible to the name match, catalog first
  (`orderBy isSystemDefined desc`) so "Sentadilla" returns the catalog row
  even if an own duplicate exists (FR-4, FR-5, AC-3, AC-4). EF-5 holds by
  construction: two people's lookups never see each other's rows.
- **Favourites**: `resolveFavoriteIds` resolves only visible exercises, so
  favouriting a hidden one is 404 like an unknown id (FR-11);
  `listFavoriteExerciseIds` keeps only visible ones (FR-12, AC-7). Remove
  stays 204 whatever the id (idempotent, reveals nothing).
- **Photo read** `findExercisePhoto(userPublicId, id)` filters the exercise
  by visible; only custom exercises have photos, so in practice only the
  creator gets it (FR-13). Hidden → 404 `Photo not found`, the same as an
  unknown id or an exercise without photo.
- **Photo write / unilateral**: `hidden` → `'not-found'` (404 `Exercise not
  found`), no more 403 for someone else's custom exercise (FR-2, FR-14,
  AC-2, AC-8). Catalog exercises keep today's rules (FR-15): photo → 403,
  unilateral → allowed.
- **Routines** — `hydrateRoutineWriteInput` calls a new
  `findUsableExercises(userPublicId, ids)` once (one query instead of one per
  row) and refuses the save with today's 400 `Routine references unknown
  exercises` when any id is missing (FR-6, AC-6). A held exercise passes, so
  editing a routine that holds one still saves (FR-7, AC-5). The denormalized
  `exerciseName` comes from the same row.
- **Workouts** — `resolveOwnedReferences` uses `usableExerciseWhere`; a
  non-held foreign exercise is unknown → 400 `Workout references an unknown
  exercise` (EF-2). A workout saved offline with a held exercise passes
  because the routine it came from holds it (EF-1, FR-7).

### App (EF-4)

No visual change is needed for held exercises (see Current state). Two
guards for lists loaded before the deploy:

- **Picker**: choosing a custom (not system) exercise first asks
  `GET /exercises/:id`; on 404 the picker shows "This exercise is no longer
  available" and reloads its list. Any other failure (offline, 5xx) lets the
  choice through, so the picker never becomes online-only for one's own
  exercises. Catalog exercises skip the check (always visible). The decision
  is a pure helper `isExerciseGone(error)` (ApiError 404), unit-tested.
- **Routine form**: a save refused as `Routine references unknown exercises`
  shows a clear translated message and reloads the catalog used by the inline
  search.

### Alternatives considered

- **Per-person copy of someone else's exercise** — rejected by the spec's
  first assumption (rewrites performed work, Article 2).
- **A stored "held" list (migration + backfill)** — rejected: the spec
  assumes held is derived; a stored list is a data migration tied to one
  server (Article 5) and drifts from the routines and workouts it mirrors.
- **Keep 403 for someone else's custom exercise on writes** — rejected:
  403 vs 404 is exactly the existence leak FR-2 forbids.
- **Filter in the app** — rejected: the list would still carry other
  people's exercises over the wire (FR-3) and every client would need it.
- **Prisma middleware / extension that injects the rule into every exercise
  query** — rejected: invisible at the call site, and it must *not* apply to
  routine/workout reads, which name held exercises (FR-8).
- **Show a held exercise's detail read-only** — rejected: FR-2 says the
  detail answers "not found", and FR-8 is the only exception.

## Shared contracts (`packages/domain`)

No shape changes. `Exercise` responses are filtered, not reshaped. Only a
doc comment on `Exercise.createdByUserId` / `isSystemDefined` noting the
visibility rule could be added; not needed to ship, skipped (Article 1).

## Data model and migrations

None.

- Migration name: — (none; the reserved `2026101814xxxx` range is unused)
- Backfill / data migration needed: no — existing favourites of hidden
  exercises stay in the table and are filtered on read (spec assumption);
  existing references are held, not moved.

## API surface (`apps/api`)

| Method + path | Change | Status codes |
|---|---|---|
| `GET /exercises` | catalog + own only; resolves the person (dev user fallback, AC-9) | 200 |
| `GET /exercises/:id` | catalog + own only | 200, 404 `Exercise not found` |
| `POST /exercises` | dedupe on catalog + own only, catalog first | 201, 400 |
| `GET /exercises/favorites` | only visible favourites | 200 |
| `PUT /exercises/:id/favorite` | visible only | 204, 404 `Exercise not found` |
| `DELETE /exercises/:id/favorite` | unchanged | 204 |
| `GET /exercises/:id/photo` | visible only (auth) | 200, 404 `Photo not found`, 401 |
| `PUT/DELETE /exercises/:id/photo` | someone else's custom → 404 (was 403) | 204, 400, 403 (catalog), 404, 401 |
| `PUT /exercises/:id/unilateral` | someone else's custom → 404 (was 403) | 200, 400, 404, 401 |
| `POST /routines`, `PUT /routines/:id` | exercises must be visible or held | 201/200, 400 `Routine references unknown exercises` |
| `POST /workouts` | exercises must be visible or held | 201/200, 400 `Workout references an unknown exercise` |

Spec 0030 (in parallel) adds a tracking-type endpoint with the same rule as
unilateral: it should call `classifyExerciseAccess` and map `hidden` to 404.

## Mobile surface (`apps/mobile`)

- `features/exercises/utils/exerciseAvailability.ts` (+ test) —
  `isExerciseGone(error)`.
- `features/exercises/components/ExercisePickerModal.tsx` — check before
  choosing a custom exercise; notice + reload on gone.
- `features/routines/screens/RoutineFormScreen.tsx` — clear message +
  catalog reload on the unknown-exercises refusal.
- i18n en/es: `exercises.noLongerAvailable`, `routineForm.unknownExercise`.

No native rebuild (Metro reload).

## Testing strategy

Unit (API, vitest):

- `visibility.test.ts` — the where builders' shape (catalog OR own; usable
  adds the two held branches scoped to the person) and the classifier
  (catalog, own, someone else's, creator gone).
- `exercises/routes.test.ts` — a **no existence leak** block: the mocked
  repository behaves like the real one (an exercise owned by `user-ana`, the
  request acting as `user-test`); for detail, photo read, photo write and
  delete, favourite and unilateral, the response for Ana's id equals — status,
  body and content type — the response for an id that never existed; the
  route always passes the acting person to the repository; list and
  favourites call the repository with the acting person; unilateral and
  photo write no longer answer 403 for someone else's custom exercise.
- `routines/routes.test.ts` — create/update look exercises up for the acting
  person; a missing (hidden, not held) exercise is 400; a held one is saved
  with its name.
- `workouts/saveReferences.test.ts` — unchanged decision; repository query
  covered by the end-to-end check.

Unit (mobile): `isExerciseGone` (404 ApiError → true; 500, network error,
401 → false).

End-to-end (local PGlite, not CI): the API against a fresh migrated DB with
two registered users; curl walks AC-1 to AC-7 and AC-9 (see tasks.md log).

| Spec AC | Verified by |
|---|---|
| AC-1 | `visibleExerciseWhere` test; list route passes the person; e2e list as Ana / Ben / anonymous |
| AC-2 | routes "no existence leak" block; e2e curl of detail, photo, favourite, unilateral as Ben |
| AC-3 | dedupe uses visible (repository) ; e2e create as Ben returns a new id |
| AC-4 | dedupe orders catalog first; e2e create "sentadilla"-style catalog name and own duplicate |
| AC-5 | `usableExerciseWhere` test; routines route test (held saves); e2e: Ben's routine holding Ana's exercise is updated and a workout saved; history and progress name it; it is absent from Ben's list; photo 404 → neutral tile |
| AC-6 | routines route test; e2e workout and routine with a not-held foreign id → 400 |
| AC-7 | `listFavoriteExerciseIds` filter; e2e favourite made before (seeded) not listed |
| AC-8 | classifier test; routes test (own → 200, hidden → 404) |
| AC-9 | list route resolves the person via `resolveUserPublicId` (dev user fallback); e2e anonymous list |
| EF-1 | e2e: held exercise in a workout save → 201 |
| EF-3 | classifier test (creator gone → hidden) |
| EF-4 | `isExerciseGone` test; picker/routine form on device [DEVICE] |
| EF-5 | by construction (dedupe scoped to the person) |

## Files to touch

- `apps/api/src/features/exercises/visibility.ts` (new) + `visibility.test.ts` (new)
- `apps/api/src/features/exercises/repository.ts` — user-scoped list, detail, dedupe, favourites, photo read, writes via classifier; `findUsableExercises`
- `apps/api/src/features/exercises/routes.ts` + `routes.test.ts`
- `apps/api/src/features/routines/routes.ts` + `routes.test.ts`
- `apps/api/src/features/workouts/repository.ts`
- `apps/mobile/src/features/exercises/utils/exerciseAvailability.ts` (new) + test
- `apps/mobile/src/features/exercises/components/ExercisePickerModal.tsx`
- `apps/mobile/src/features/routines/screens/RoutineFormScreen.tsx`
- `apps/mobile/src/i18n/locales/{en,es}.ts`
- `docs/sdd/specs/0015-private-custom-exercises/{spec,plan,tasks}.md`

## Risks and open questions

- **Spec 0030 in parallel** touches `exercises/repository.ts`, `routes.ts`
  and `routes.test.ts` (tracking-type endpoint). Kept mergeable: the rule is
  in a new file; the unilateral function keeps its name and result type;
  0030's endpoint should adopt `classifyExerciseAccess` (hidden → 404).
- **Held via the active workout only.** A held exercise removed from the
  routine *during* a workout and never logged before stops being held, and
  that workout is refused (400, permanently rejected per 0014). Requires an
  edit of a locked routine (0014 locks it), so practically unreachable.
  Accepted.
- **Query cost.** `usableExerciseWhere` adds two `EXISTS` sub-queries over
  the person's routines and workouts, only for the handful of ids of one
  save. Negligible at household scale.
- **Photo route for catalog exercises** keeps 403 (they exist for everyone,
  so 403 reveals nothing). FR-15.
- `TODO(sdd): shared vs per-person catalog settings` — the spec's open item;
  unchanged here.

## Rollout

1. Redeploy the API (no migration). Older apps keep working: they get
   fewer exercises and 404 instead of 403 in two creator-only paths they
   never reach for others' exercises (the detail hides those controls).
2. App: Metro reload / JS update for the EF-4 guards; not required for
   privacy itself.

Rollback: revert the API commits; nothing was migrated.
