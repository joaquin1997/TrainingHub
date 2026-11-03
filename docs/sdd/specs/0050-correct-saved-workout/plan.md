---
spec: 0050
status: approved
created: 2026-11-03
---

# Plan — Correct a saved workout

Self-reviewed against the constitution and the owner's spec review. Design
only: no implementation, migration, external activation or device acceptance.

## Constitution check

| Article | Compliance |
|---|---|
| 1 | Existing scalar corrections only, no deletion or structural/timing edits. |
| 2 | Performed corrections never update templates or another active session. |
| 3 | Read/write/conflict DTOs in domain; local edit state stays mobile. |
| 4 | Edit unit captured; canonical kg retained across corrections. |
| 5 | Generated additive revision/idempotency fields; legacy normalization on write. |
| 6 | No Health rewrite or new native provider. |
| 7 | No notes/measurements in error logging or payload hashes exposed. |
| 8 | Transaction and conflict tests, UI navigation and refresh independently verified. |
| 9 | No new dependency/native rebuild. |
| 10 | Legacy completion and export-status limitations explicit. |
| 11 | Owner in every transaction predicate; 401 recovery retains same-owner edits. |

## Current code and approach

Workout routes only list/read/last/create. The detail is read-only. POST's
clientId idempotency deliberately returns the original save and must not be
repurposed for corrections. Derived progress/records are rebuilt from sessions.

Introduce a correction draft separate from the active-workout store. Clone
saved, canonical quantities into inputs at an explicitly captured edit unit;
keep original DTO, stable exercise/set IDs and expected revision. An explicit
performed flag drives the edit; never infer completion from nonempty inputs.
Only measurements/type/completion and notes are editable. No add/delete/order,
date/duration/routine link controls. Validate quantities by saved measurement
shape; don't reinterpret old time/reps data via today's catalog classification.

Add `revision Int @default(0)` to WorkoutSession. New correction input includes
`expectedRevision`, `mutationId`, session/exercise notes and the complete set
of existing set IDs with edited measurements/type/performed. Require exact
existing IDs/parent ownership and reject extra/missing/duplicate IDs. Patch
only allowed scalar fields: never delete/recreate exercises or sets. Within
one Prisma transaction, compare-and-increment revision under owner/workout
condition, then update children; any invalid child or race rolls back all.
Update session `updatedAt` on every accepted correction.

Idempotency: store `lastCorrectionMutationId` and a canonical payload hash on
the session. Retry of that mutation with same hash returns the saved version;
same ID/different payload is 409. If a later correction intervened, return
conflict, never reapply stale edits. The mutation identity is scoped to the
owned workout, not global. Preserve clientId so this cannot create a session.

Legacy sessions without any `completedAt` currently count all sets as performed.
Initialize edits from server `performed`, not absence of timestamps. On the
first successful correction materialize all remaining performed flags as
completion timestamps: preserve existing times, use session completedAt or
startedAt for newly materialized legacy/performed sets; clear timestamps on
unperformed sets. Require at least one performed set so legacy detection can
never make all explicitly unfinished sets suddenly count again. This is an
on-write normalization of that workout, not a bulk data migration. Never
change the session's actual timing or Health export.

Use an invalidation event keyed by owner/workout/exercise IDs after successful
save. Existing screens mostly hold local state, not a query cache: subscribe
or reload on focus with request generations in history/detail, progress,
last-performance suggestions, comparison and home/widget data. Do not mutate
a running draft's existing suggestion/reference snapshots. If refresh fails,
show stale/error state; never imply old values are newly refreshed. Refresh
later record history through existing chronological derivation, not a PR table.

### Alternatives considered

- Delete/recreate the session: changes identity, links and idempotency.
- Last writer wins: silently loses another device's correction.
- Clone active workout state: risks affecting a real session or resaving it.

## Contracts, schema and API

Domain adds optional `revision` to read DTO for old-client compatibility and
`UpdateWorkoutSessionInput`/conflict response. Correction controls require a
server-returned revision (old server: read-only with unavailable notice).
Generated migration `add_workout_correction_revision` adds revision and nullable
last-mutation/hash columns; no new health or derived record storage.

Authenticated `PUT /workouts/:id/correction`: 200 full updated WorkoutSession,
400 invalid values/IDs/empty performed result, 401 session rejection, 404 missing
or foreign workout identically, 409 stale revision/mutation mismatch,
5xx retry with retained draft. Unknown fields attempting date/routine/structure
edits are rejected. Support optional 0049 fields only when installed; shared
sets work before it. Existing POST behaviour unchanged.

UI adds Edit to saved detail and a dedicated correction screen/route. Guard
header back, gestures and navigation with Save/Discard/Keep editing. Save
success resets dirty state and returns/refetches detail. Network/409 retains
local edit and offers comparing/reloading current server version with explicit
confirmation, no automatic overwrite. Hide edit on sign-out, restore it only
for the same owner after reauthentication. No cross-account local exposure.
Show Health-export limitation without claiming an untracked export status;
when known exported, show it; otherwise use neutral “edits here do not update
an existing Health entry” copy, not an inferred badge.

## Verification mapping

| Criteria | Checks |
|---|---|
| AC-1, AC-7 | 100→10 correction updates all owned derived views/later PRs; warm-up retyping; Health/share artifacts unchanged. |
| AC-2, AC-4 | Explicit done change, legacy normalization, final-performed guard and invalid values. |
| AC-3 | Save/Discard/Keep editing across back/gesture, no-change exit and unit snapshot. |
| AC-5 | Offline/401/409 retained edits; two writers; atomic invalid-child rollback; same mutation retries without a second session. |
| AC-6 | Old-session round trip, stable IDs/date/order/link, routine and active-draft references untouched. |
| EF-1–EF-4 | Empty/invalid, server failure, conflict/deleted/foreign workout, never recreate. |

Route tests cover auth/validation; isolated Prisma integration tests must
prove atomic conditional update and legacy normalization, not just mocks.
Device checks cover navigation guards, focus refresh, offline reauth and widget.

## Files to touch

- `packages/domain/src/entities.ts`, Prisma schema/generated migration.
- `apps/api/src/features/workouts/{routes,repository,performedSets}.ts`, tests.
- New workout correction parser/repository helpers and integration tests.
- Mobile `workoutsClient.ts`, new correction draft/helper/screen and app route.
- Saved workout detail, History and Progress focus refresh; last-performance and summary comparison hooks.
- Home/widget synchronization refresh; new owner-scoped workout invalidation helper.
- ES/EN strings, documentation and roadmap/backlog.

## Risks and rollout

Implement before 0049 with shared fields; its later integration must retain
all side values and enforce capability guards. API migration first, then app.
Old clients can read with an extra revision; old API does not expose Edit.
Legacy normalization must preserve exactly the previously displayed performed
sets. No remote Health rewrite. Rollback disables correction UI while retaining
revision/data; do not restore stale client edits into the active-workout store.
