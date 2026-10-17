---
spec: 0014
status: approved     # self-approved 2026-10-16 under the owner's delegation; revisable
created: 2026-10-16
---

# Plan — Workout save integrity

How `spec.md` gets built. This is where technology belongs.

## Current state (verified 2026-10-16)

- `apps/api/src/features/workouts/routes.ts`
  - `parseCreateWorkoutSessionInput` checks `startedAt` is a non-empty string;
    `completedAt` (session and set) is any non-empty string. `new Date('x')`
    later reaches Prisma and fails as a 500.
  - `POST /workouts` answers 201, or 400 on Prisma `P2025` ("unknown exercise
    or routine").
- `apps/api/src/features/workouts/repository.ts` → `createWorkoutSession`
  connects `routine`, `routineExercise` and `exercise` by `publicId`, no
  ownership filter. `toWorkoutExerciseCreateInput` builds the nested create.
- `apps/api/prisma/schema.prisma` → `WorkoutSession` has no client identity.
  Postgres treats `NULL`s as distinct in a unique index, so a nullable column
  under `@@unique([userId, clientId])` leaves old rows unaffected.
- Route tests mock the repository entirely (`routes.test.ts`).
- Mobile
  - `buildWorkoutSessionDraft` sets `id: workout-session-${routine.id}`, so two
    workouts of one routine share it; unusable as an identity.
  - `toCreateWorkoutSessionInput` builds the payload; `apiRequest` treats any
    2xx as success, so a 200 replay needs no client change.
  - `RoutineDetailScreen`: Edit/Duplicate hidden behind `editLocked` while the
    routine's workout is active; Delete always shown and calls
    `routinesClient.remove` with no confirmation.
  - `RoutinesListScreen`: the ⋯ `ActionSheet` always offers Edit, Duplicate,
    Delete (Delete confirms through `Alert`).
  - `ActionSheet` has `title` and `actions`, no message line.
- No runtime UUID source without a dependency (`crypto.randomUUID` is not
  guaranteed on Hermes).

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Offline save, exercise privacy (0015), future-date checks and duplicate cleanup stay out (spec). The UI changes are limited to the lock and the missing confirmation. |
| 2 — Template vs performed | yes | The save reads routines only to decide whether to *link*; it never writes to them. |
| 3 — Shared domain types | yes | `CreateWorkoutSessionInput.clientId?` added in `packages/domain`; no copy elsewhere. |
| 4 — Weight in kg | no | |
| 5 — Prisma migrations | yes | Additive nullable column + composite unique. SQL generated offline with `prisma migrate diff` from the edited schema (the dev database is reachable only through the SSH tunnel, so `migrate dev` is not run here); it mirrors `schema.prisma` exactly, in its own timestamped folder, applied with `db:deploy`. No data change. |
| 6 — Integrations behind interfaces | no | |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | domain → migration → API → mobile → docs, each green. |
| 9 — Dependencies | no | Client id from `Date.now()` + `Math.random()`; no package. |
| 10 — TODOs over half-solutions | yes | The concurrent-save path relies on the unique index (`P2002`), which only a real database exercises — named in the testing strategy, verified on deploy. |

## Approach

### Identity (FR-1…FR-3, FR-9, EF-1, EF-2, EF-4)

- `CreateWorkoutSessionInput.clientId?: string`. Optional so older apps keep
  working (FR-9).
- Schema: `WorkoutSession.clientId String?` + `@@unique([userId, clientId])`.
- Route: `clientId` parsed as an optional trimmed string of at most 64
  characters; longer is a 400.
- Repository `createWorkoutSession(userPublicId, input)` returns
  `{ session, created }`:
  1. With a `clientId`, look up `(user, clientId)`; found → `{ created: false }`.
  2. Otherwise create. If the create fails with `P2002` on that index (a
     concurrent duplicate, EF-2), read the existing row → `{ created: false }`.
- Route answers `201` when created, `200` with the stored session on replay.
  The stored session wins over the retried body (EF-4).

### Owned references (FR-4, FR-5, EF-3)

Before creating, the repository resolves references in three small queries:

- routine: `findFirst({ publicId, user: { publicId } })` → internal id or none;
- routine slots: `findMany({ publicId in [...], routine: { user: { publicId } } })`;
- exercises: `findMany({ publicId in [...] })`.

A new pure module `apps/api/src/features/workouts/saveReferences.ts` decides
from those results:

- `dropForeignLinks(input, ownedRoutineIds, ownedSlotIds)` → the input with
  `routineId` / `routineExerciseId` removed where not owned;
- `findUnknownExercise(input, knownExerciseIds)` → the first unknown public id,
  or `undefined`.

An unknown exercise throws `UnknownExerciseError` (exported from the
repository); the route maps it to 400 "Workout references an unknown
exercise". The old `P2025` branch stays as a safety net for a reference
deleted between the check and the create.

### Dates (FR-6)

In the route parser: `startedAt` must satisfy `!Number.isNaN(Date.parse(v))`;
the same for session `completedAt` and each set `completedAt` when present.
`completedAt < startedAt` (session) → 400 with its own message. Set times are
not compared with the session window (devices drift; nothing depends on it).

### Mobile (FR-1, FR-7, FR-8)

- `WorkoutSessionDraft.clientId: string`, set in `buildWorkoutSessionDraft`
  through `createWorkoutClientId()` (`${Date.now().toString(36)}-${random}`),
  sent by `toCreateWorkoutSessionInput`. Every mutation spreads the draft, so
  the id survives edits. Spec 0010 will persist it with the draft.
- `ActionSheet` gains an optional `message` line under the title.
- `RoutinesListScreen`: for the active workout's routine the sheet offers
  Duplicate only, with `routineDetail.editLocked` as its message.
- `RoutineDetailScreen`: Delete is hidden while locked (the lock text is
  already shown); Delete asks for confirmation through `Alert`, reusing
  `routines.deleteTitle` / `routines.deleteConfirm`.

### Alternatives considered

- **Reuse the draft `id` as the identity** — rejected: derived from the routine
  id, so a second workout of the same routine would be taken for a retry and
  silently not saved.
- **Idempotency-Key header** — rejected: the identity belongs to the workout,
  not to a request, and 0010 persists it with the draft; a body field keeps it
  in the shared contract (Article 3).
- **Refuse a foreign or missing routine link (400)** — rejected by the owner
  (2026-09-24): loses a real workout over a cosmetic link.
- **Only check ownership with a relation filter inside the nested create** —
  Prisma's nested `connect` cannot express "connect if owned, else skip", and
  a failed connect aborts the whole save.
- **`crypto.randomUUID`** — not guaranteed on Hermes; a dependency for it fails
  Article 9 when collisions only need to be avoided per user.

## Shared contracts (`packages/domain`)

- `CreateWorkoutSessionInput.clientId?: string` — device-chosen identity of the
  workout, unique per user; repeated saves with it return the first one.
  - API: parsed, stored, used for the replay lookup.
  - Mobile: generated at draft creation, always sent.

## Data model and migrations

- `WorkoutSession.clientId String?`, `@@unique([userId, clientId])`.
- Migration `YYYYMMDDHHMMSS_add_workout_session_client_id`: `ADD COLUMN` +
  `CREATE UNIQUE INDEX`. Backfill: no — old rows keep `NULL` (spec NFR).

## API surface (`apps/api`)

| Operation | Change |
|---|---|
| `POST /workouts` | Accepts `clientId`; `200` + stored session on replay; foreign/missing routine and routine-slot links dropped; unknown exercise → `400`; unreadable times or end < start → `400` |

## Mobile surface (`apps/mobile`)

- `workoutDraftStore.ts`: `clientId` on the draft and in the payload.
- `ui/ActionSheet.tsx`: optional `message`.
- `RoutinesListScreen.tsx`, `RoutineDetailScreen.tsx`: lock and confirmation.
- No native rebuild: Metro reload.

## Testing strategy

| Spec AC | Verified by |
|---|---|
| AC-1 | Route test: repository reports `created: false` → `200` with the stored session. **[DEPLOY]** `curl` the same body twice → one row. |
| AC-2 | Unit (`saveReferences.test.ts`): missing routine/slot links dropped. Route test: save succeeds. **[DEVICE]** delete the routine through the API mid-workout, finish. |
| AC-3 | Unit: foreign routine/slot links dropped, own links kept. |
| AC-4 | Route tests: unreadable `startedAt`, unreadable set `completedAt`, end before start → `400`, repository not called. |
| AC-5 | Unit: `findUnknownExercise`. Route test: `UnknownExerciseError` → `400`. |
| AC-6 | **[DEVICE]** routines list ⋯ and detail with a workout in progress. |
| AC-7 | **[DEVICE]** detail Delete → confirm dialog; cancel keeps the routine. |
| FR-1 | Mobile unit: draft has a `clientId`, stable across edits, different for two drafts of one routine, present in the payload. |
| EF-2 | Only a real database raises `P2002`; **[DEPLOY]** two parallel `curl`s. Code path reviewed, not CI-tested. |

## Files to touch

- `packages/domain/src/entities.ts`
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/<ts>_add_workout_session_client_id/migration.sql`
- `apps/api/src/features/workouts/saveReferences.ts` (new) + `saveReferences.test.ts`
- `apps/api/src/features/workouts/repository.ts`, `routes.ts`, `routes.test.ts`
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts` + test
- `apps/mobile/src/ui/ActionSheet.tsx`
- `apps/mobile/src/features/routines/screens/RoutinesListScreen.tsx`, `RoutineDetailScreen.tsx`
- `docs/sdd/glossary.md`, `docs/sdd/specs/0004-retro-routines/spec.md`,
  `docs/roadmap/01-live-workout-logging.md`, `docs/sdd/backlog.md`

## Risks and open questions

- **Deploy order.** The API must be deployed (with the migration) before or
  together with the app change; an old API ignores `clientId`, which is safe
  but unprotected. An old app against the new API works (FR-9).
- **Replay hides edits made between attempts** (EF-4). Accepted: a retry is the
  same workout.
- **Concurrent duplicate** relies on the unique index; verified only on the
  real database (see testing strategy).

## Rollout

1. Apply the migration (SSH tunnel, `npm run db:deploy`), then redeploy the API
   (`DOCKER_CONTEXT=docker-ts ./scripts/run.sh backend`).
2. Reload the app (Metro).

Rollback: redeploy the previous image; the extra nullable column is harmless
to the old code and can stay.
