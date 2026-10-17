---
spec: 0033
status: approved     # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Plan — Delete custom exercises

How `spec.md` gets built. A custom exercise gains a "deleted" moment: it
leaves every reading of the catalog (spec 0015's *visible* rule) but stays
for the routines and saved workouts that point at it. One that nothing points
at is removed outright. The app adds a delete action with an impact
confirmation to the exercise's detail and marks deleted exercises in routines.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | One nullable column, one rule change in `visibility.ts`, two endpoints (impact, delete), one flag on routine reads, a delete action and a routine marker in the app. No restore, undo, edit, merge, bulk delete or "deleted exercises" list (spec out of scope). |
| 2 — Template vs performed | yes | Deletion never touches `RoutineExercise`, `WorkoutExercise` or `WorkoutSet` rows; the exercise row they point at stays (archive) or is removed only when nothing points at it. Routines and workouts keep being read the same way; only a read-only `exerciseDeleted` flag is added to the routine read. |
| 3 — Shared domain types | yes | `ExerciseDeletionImpact` and `RoutineExercise.exerciseDeleted` live in `packages/domain`; no Prisma or Fastify type leaks there. |
| 4 — Weight in kg | no | No weights involved. |
| 5 — Prisma migrations | yes | `Exercise.deletedAt DateTime?` in `schema.prisma`, mirrored by a hand-written migration `20261018150000_add_exercise_deleted_at` (one `ALTER TABLE … ADD COLUMN`, exactly the schema change; no database here to run `migrate dev`, same as earlier specs). No data change: existing rows stay `NULL` = not deleted. |
| 6 — Integrations behind interfaces | no | — |
| 7 — Secrets | no | Local end-to-end check uses an explicit throwaway local `DATABASE_URL` (PGlite in the session scratchpad). |
| 8 — Committable + verified | yes | One commit per task, each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None added. |
| 10 — TODOs over half-solutions | yes | Purging deleted exercises that later become unreferenced (spec NFR "may be removed for good") is left as a `TODO(sdd)` in Risks — nothing requires it now. |

## Current state (verified in the code, 2026-10-17, branch with 0015)

- `apps/api/prisma/schema.prisma` — `Exercise` has no lifecycle field.
  `RoutineExercise.exercise` and `WorkoutExercise.exercise` are
  `onDelete: Restrict`; `ExerciseFavorite`, `ExercisePhoto` and the two muscle
  link tables cascade. So a used exercise cannot be deleted; an unused one
  can, taking its photo, favourites and links with it.
- `RoutineExercise.exerciseName` is denormalized (kept at write time);
  `WorkoutExercise` has no name — workout reads and progress take
  `exercise.name`. History therefore stays named only if the row stays.
- `apps/api/src/features/exercises/visibility.ts` (0015):
  `visibleExerciseWhere` (catalog or own) drives list, detail, same-name
  dedupe, favourites (add, list) and photo read;
  `usableExerciseWhere` (visible or held via the person's routines/workouts)
  drives routine hydration (`findUsableExercises`) and the workout save
  (`resolveOwnedReferences`); `classifyExerciseAccess` (catalog / own /
  hidden) drives photo writes and unilateral via `findAccessibleExercise`.
- No delete endpoint exists for exercises.
- Mobile: the exercise detail (`ExerciseDetailScreen`) is reached only from
  the Exercises tab; it shows creator-only controls when
  `!isSystemDefined && createdByUserId === user.id`. The Exercises list
  reloads on focus. The active workout is the device draft
  (`workoutDraftStore.getActiveWorkout()`), never on the server until saved;
  its thumbnails call `GET /exercises/:id` and fall back to the neutral tile
  on any error. History, session detail and progress name exercises from the
  workout reads and show no photos. `confirmAction` is the confirmation
  helper (native alert, `confirm` on web).

## Approach

### Lifecycle: `deletedAt` on `Exercise`

Deleting a custom exercise either **removes** it (nothing references it — no
`RoutineExercise`, no `WorkoutExercise` of anyone, and it is not in the
creator's active workout) or **archives** it: `deletedAt = now()`, every
favourite of it removed (FR-10), its photo removed (FR-9). The row and its
name stay for the routines and workouts that point at it (FR-6, FR-7).

The rule change sits in `visibility.ts`, so every reading follows:

- `visibleExerciseWhere` — the custom branch gains `deletedAt: null`. List,
  detail, search, favourites list/add, photo read and same-name dedupe all
  stop seeing it (FR-5, FR-11, AC-1, AC-8). Catalog exercises are never
  deleted, so their branch is unchanged.
- `usableExerciseWhere` — catalog, **own whatever its lifecycle**, or held.
  The creator's deleted exercise stays usable for saves, so the routine
  that contains it still saves when edited (FR-7) and the active workout or
  a pending save still saves (FR-8, EF-5) — even for an exercise kept only
  because it sat in the active workout. Others who held it keep holding it
  (spec assumption on counts).
- `classifyExerciseAccess` — optional `isDeleted`: a deleted custom exercise
  is `hidden` for everyone, so photo writes and unilateral answer 404
  (`findAccessibleExercise` passes it). Additive: callers that omit it (spec
  0030's tracking-type endpoint, in parallel) keep today's behaviour.

The decision itself is a pure function, `planExerciseDeletion` in a new
`exercises/deletion.ts`, unit-tested without a database:

| Access (without lifecycle) | Deleted already | Referenced or in active workout | Plan |
|---|---|---|---|
| missing / hidden | — | — | `not-found` |
| catalog | — | — | `forbidden` |
| own | yes | — | `already-deleted` (204, EF-2) |
| own | no | yes | `archive` |
| own | no | no | `remove` |

`remove` that loses a race with a save (the FK `Restrict` fires, `P2003`)
falls back to `archive`. The photo is deleted after the archive commits, best
effort: a failure is logged and the deletion still succeeds; the photo is
never served again because the photo read uses the visible rule (EF-4).

### Impact (FR-3, FR-4, EF-6)

`GET /exercises/:id/deletion-impact` → `{ routineCount, workoutCount }`:
the number of the **creator's own** routines and saved workouts containing
it (spec assumption: never anyone else's). The `where` builders are pure
(`deletionImpactWhere`) and tested to scope to the person. Only for the
creator's live custom exercise; catalog → 403, anything else (unknown,
someone else's, already deleted) → 404.

The active workout lives on the device, so FR-4 is decided by the app
(`getActiveWorkout()`), which also tells the delete call
(`DELETE /exercises/:id?inActiveWorkout=true`) so an exercise used only
there is archived, never removed — removing it would make the workout
unsaveable (spec 0014 rejects unknown exercises permanently).

### App

- `exercisesClient.getDeletionImpact`, `exercisesClient.remove`.
- `features/exercises/utils/exerciseDeletion.ts` (+ test):
  `describeDeletionImpact(impact, inActiveWorkout)` → the i18n keys and counts
  of the confirmation lines (unused / routines / workouts / active workout /
  history kept); `isAlreadyDeleted(error)` (404).
- `ExerciseDetailScreen` — a ghost destructive "Delete exercise" button at the
  bottom, creator only (same condition as the photo button), so catalog and
  held exercises never offer it (AC-7; a held exercise's detail is 404 anyway).
  Tap → fetch impact (busy) → on 404 leave to the list (EF-2); on other
  failure show "impact could not be checked" with retry, delete nothing
  (EF-6) → `confirmAction` (destructive) naming the exercise and impact →
  delete → 204/404 leave to the Exercises list, which reloads on focus
  (FR-5); other failure (offline) → error, nothing changes (EF-1, AC-9).
  Kept as one block after the existing sections so 0030's edits elsewhere in
  the screen merge cleanly.
- Routines: `RoutineDetailScreen` shows a "Deleted exercise" chip by the name;
  `RoutineFormScreen` shows the same chip instead of "Selected" for rows whose
  exercise the routine reports as deleted (FR-7). Starting the routine needs
  nothing: the draft takes the name from the routine; the thumbnail is 404 →
  neutral tile (FR-9, AC-6).
- History, session detail, share and progress need nothing: they read the
  name from the workout and the exercise row stays (FR-6, AC-3).
- i18n en/es: new `exerciseDeletion` namespace.

No native rebuild (Metro reload).

### Alternatives considered

- **Block deletion of a used exercise** — rejected by the spec's first
  assumption (the "Old gym" scenario).
- **Copy the name onto `WorkoutExercise` and remove the exercise** — rejects
  nothing the archive gives and rewrites performed rows (Article 2); also
  breaks progress, which groups by the exercise.
- **Always archive, never remove** — simpler, but leaves typo rows forever;
  the owner's brief is "never-used exercises removed entirely". Removal is
  cheap and safe when nothing references it.
- **Drop the slot from routines** — rejected by the spec (FR-7 assumption).
- **A `status` enum instead of `deletedAt`** — one more concept for one
  state; the timestamp also records when, useful for a later purge.
- **Count other people's references in the impact** — rejected: leaks their
  data (spec assumption).
- **Ask the server whether the exercise is in the active workout** — the
  active workout is not on the server (spec 0010); only the device knows.

## Shared contracts (`packages/domain`)

- `ExerciseDeletionImpact { routineCount: number; workoutCount: number }` —
  response of the impact endpoint. Consumed by mobile only.
- `RoutineExercise.exerciseDeleted?: boolean` — present (true) only when the
  slot's exercise is deleted. Optional, so older apps ignore it and older
  servers simply never send it.

## Data model and migrations

- `Exercise.deletedAt DateTime?` — `NULL` = live.
- Migration name: `20261018150000_add_exercise_deleted_at` (reserved range
  `2026101815xxxx`), hand-written to mirror the schema line:
  `ALTER TABLE "Exercise" ADD COLUMN "deletedAt" TIMESTAMP(3);`
- Backfill / data migration needed: no.

## API surface (`apps/api`)

| Method + path | Auth | Change | Status codes |
|---|---|---|---|
| `GET /exercises/:id/deletion-impact` | required | new | 200 `{ routineCount, workoutCount }`, 401, 403 catalog, 404 unknown / someone else's / deleted |
| `DELETE /exercises/:id?inActiveWorkout=true` | required | new | 204 deleted (or already deleted), 401, 403 catalog, 404 unknown / someone else's |
| `GET /exercises`, `GET /exercises/:id`, favourites, photo read, `POST /exercises` dedupe | — | deleted custom exercises excluded (visible rule) | unchanged |
| photo writes, unilateral | — | deleted → 404 | unchanged |
| `GET /routines`, `GET /routines/:id` | — | `exerciseDeleted: true` on slots whose exercise is deleted | unchanged |
| `POST/PUT /routines`, `POST /workouts` | — | the creator's deleted exercise is usable | unchanged |

Spec 0030's tracking-type endpoint: if it goes through `findAccessibleExercise`
it inherits "deleted → 404"; if it calls `classifyExerciseAccess` directly it
should pass `isDeleted`.

## Mobile surface (`apps/mobile`)

- `features/exercises/api/exercisesClient.ts` — two methods.
- `features/exercises/utils/exerciseDeletion.ts` (new) + test.
- `features/exercises/screens/ExerciseDetailScreen.tsx` — delete block.
- `features/routines/screens/RoutineDetailScreen.tsx`,
  `features/routines/screens/RoutineFormScreen.tsx` — deleted chip.
- `i18n/locales/{en,es}.ts` — `exerciseDeletion` namespace.

No native rebuild.

## Testing strategy

Unit (API, vitest):

- `visibility.test.ts` — visible excludes deleted custom exercises (catalog
  branch untouched); usable keeps the creator's own regardless of lifecycle,
  plus held; classifier: deleted custom → hidden for creator and others,
  catalog unaffected.
- `deletion.test.ts` — `planExerciseDeletion` table above;
  `deletionImpactWhere` scopes both counts to the person and the exercise and
  never names anyone else.
- `deletion.routes.test.ts` (new; kept out of `routes.test.ts`, which spec
  0030 edits in parallel) — the real routes **and the real repositories**
  against a small in-memory stand-in for Prisma that evaluates the same
  `where` objects the repositories build (OR, nested relations, `some`,
  `in`, insensitive `equals`, `null`). Two people, Ana's never-used and used
  exercises, a catalog one, Ben holding Ana's from before 0015. Checks: auth
  required; Ben's answers for Ana's exercise equal an unknown id (status,
  body, content type) on impact and delete, and change nothing; catalog → 403
  for everyone; impact counts only Ana's routines and workouts (Ben's
  references excluded); never-used → removed with photo and favourites;
  in active workout → archived; remove race (`P2003`) → archived; used →
  archived, out of list/detail/favourites/photo, favourites gone for
  everyone; saved workouts, history and progress still name it with its
  sets, Ben's too; routine and workout rows unchanged; photo failure still
  204 and never served (EF-4); second delete 204 (EF-2); writes to a deleted
  exercise 404; same-name create after delete → a new id, old history stays
  (FR-11). A mutation check (dropping `deletedAt: null` from the visible
  rule) fails 5 of them.

Unit (mobile): `describeDeletionImpact` (unused, routines only, workouts only,
both, active workout, singular/plural counts) and `isAlreadyDeleted`.

End-to-end (local PGlite, not CI): fresh migrated DB, built API, two users;
covers the DB-side behaviour the mocks cannot: counts only the creator's,
removal vs archive, history and progress still name it with its sets,
routine keeps it marked and still saves, a workout with it saves, same-name
create returns a fresh id, favourites and photo gone, Ben's held copy
unaffected. Logged in `tasks.md`.

| Spec AC | Verified by |
|---|---|
| AC-1 | planner test (remove); routes test (204); e2e (row gone, list/search exclude it, impact said 0/0) |
| AC-2 | `deletionImpactWhere` test; routes test (Ana 1 routine / 3 workouts, Ben's excluded); e2e counts 1 routine / N workouts, Ben's references not counted |
| AC-3 | visible/usable rule tests; e2e history, workout detail and progress name it with its sets |
| AC-4 | e2e routine read has `exerciseDeleted`, PUT saves, workout from it saves; device for the chip [DEVICE] |
| AC-5 | planner test (archive when in active workout); routes test (flag passed); `describeDeletionImpact` test; device [DEVICE] |
| AC-6 | e2e photo 404 after deletion; neutral tile on device [DEVICE] |
| AC-7 | routes test (catalog 403, someone else's 404); detail shows the button only for own custom exercises (code review, device) |
| AC-8 | visible rule test; e2e same-name create → new id, old history stays with the old |
| AC-9 | screen keeps the exercise on a failed call (code); device offline check [DEVICE] |
| EF-1 | as AC-9 |
| EF-2 | planner test (already-deleted → 204); `isAlreadyDeleted` test |
| EF-3 | routes "same as unknown" tests |
| EF-4 | photo removal outside the transaction, logged; photo read filtered by visible (rule test) |
| EF-5 | usable rule test; e2e workout save with the deleted exercise → 201 |
| EF-6 | screen: impact failure shows retry and never calls delete (code); device [DEVICE] |

## Files to touch

- `apps/api/prisma/schema.prisma` — `Exercise.deletedAt`
- `apps/api/prisma/migrations/20261018150000_add_exercise_deleted_at/migration.sql` (new)
- `apps/api/src/features/exercises/visibility.ts` + `visibility.test.ts`
- `apps/api/src/features/exercises/deletion.ts` (new) + `deletion.test.ts` (new)
- `apps/api/src/features/exercises/repository.ts` — `getExerciseDeletionImpact`, `deleteCustomExercise`; `findAccessibleExercise` passes `isDeleted`
- `apps/api/src/features/exercises/routes.ts` — two routes
- `apps/api/src/features/exercises/deletion.routes.test.ts` (new)
- `apps/api/src/features/routines/repository.ts` — `exerciseDeleted`
- `packages/domain/src/entities.ts` — `ExerciseDeletionImpact`, `RoutineExercise.exerciseDeleted`
- `apps/mobile/src/features/exercises/api/exercisesClient.ts`
- `apps/mobile/src/features/exercises/utils/exerciseDeletion.ts` (new) + test
- `apps/mobile/src/features/exercises/screens/ExerciseDetailScreen.tsx`
- `apps/mobile/src/features/routines/screens/RoutineDetailScreen.tsx`, `RoutineFormScreen.tsx`
- `apps/mobile/src/i18n/locales/{en,es}.ts`
- `docs/sdd/specs/0033-delete-custom-exercises/{spec,plan,tasks}.md`

## Risks and open questions

- **Spec 0030 in parallel** edits `ExerciseDetailScreen`, `exercises/routes.ts`,
  `routes.test.ts` and possibly `repository.ts`/`visibility.ts`. Kept
  mergeable: new logic in a new file (`deletion.ts`); new routes, mocks and
  tests appended as separate blocks; the classifier change is an optional
  parameter; the screen change is one block at the end plus state/handlers.
- **Exercise in the active workout on another device.** Only the deleting
  device's draft is checked. If the exercise was never used elsewhere and
  sits in an active workout on a *second* device, it is removed and that
  workout's save is refused (0014). Requires the same person to run a
  workout on one device while deleting a never-used exercise on another.
  Accepted; documented.
- **The creator could still add a deleted exercise to another routine by
  calling the API directly** (usable keeps own-deleted so saves never break).
  Every picker reads the visible list, so FR-12 holds in the product.
  Accepted (spec assumption: FR-12 is about pickers).
- **Concurrent removal vs save** — handled: `P2003` on remove falls back to
  archive.
- `TODO(sdd): purge deleted exercises nothing points at any more (spec NFR
  retention: "may be removed") — needs a decision on when (on routine/workout
  deletion, or a periodic script); nothing depends on it.`

## Rollout

1. Apply the migration and redeploy the API (owner). Additive column, so the
   current app keeps working; it never calls the new endpoints.
2. App update (Metro / JS) adds the delete action and routine chip. An app
   on this bundle against an API without the endpoints gets 404 on the impact
   call and treats it as "already deleted" — so ship the API first.

Rollback: revert the app commits; revert the API commits. The column can stay
(nullable, ignored) or be dropped by a follow-up migration; archived rows then
reappear in their creator's catalog, which is the safe direction.
