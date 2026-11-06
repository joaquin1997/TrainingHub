---
spec: 0051
status: approved
created: 2026-11-03
---

# Plan — Offer a routine update after training

Self-reviewed against the constitution and the owner's spec review. Design
only: no implementation, migration, external activation or device acceptance.

## Constitution check

| Article | Compliance |
|---|---|
| 1 | Optional selected changes only; no auto-generated routine or general merge UI. |
| 2 | Snapshot targets, performed workout and future routine remain separate. |
| 3 | Conditional change DTO in domain; diff state mobile-only. |
| 4 | Canonical snapshot and writes kg, review converts at edge. |
| 5 | Generated additive revision/archive migration; no performed data rewrite. |
| 6 | No integration changes. |
| 7 | No routine body/notes logged by new or reused write path. |
| 8 | Contracts before transaction writer before review; device acceptance distinct. |
| 9 | Existing persistence/UI tools; no new package/native rebuild. |
| 10 | Old snapshots, archived source slots and dependency selections explicit. |
| 11 | Owned routine/exercise validation and account-scoped pending review. |

## Current code and approach

`finishWorkout` awaits POST but discards its response and routes to a summary
built from a local skeleton. `Routine.updatedAt` exists; updateRoutine currently
deletes/recreates all exercise children in a transaction, with no revision
check. That replacement can break routineExerciseId links in workout history.
An optional review cannot safely use that write unchanged.

At session start, capture an immutable source routine snapshot in the draft:
parent revision, stable occurrence/set IDs, canonical target values, supported
types, order and superset groups. Keep draft-set source IDs on existing rows;
new rows have none. Capture the initial target-derived inputs separately from
last-performance placeholders. Record explicit changed field provenance in
set/exercise edit operations (phone and watch reps). Completing without editing
is not a change. Track generated warm-up origin independently of its editable
marker so a value edit does not automatically make it a manually added set.

After successful workout save, retain the actual response ID/revision and a
small owner-scoped completed-review envelope before clearing active persistence.
This envelope contains the source snapshot, candidate changes and decision
state, not another active workout. Save once by clientId; routine failure never
calls POST again. On “finish and start another routine”, queue the review in
its completed summary accessible from a nonblocking saved-workout banner;
do not interrupt the newly active session. Review remains optional and offered
once per completed workout; decline/completion closes it permanently locally.

Build a pure diff per occurrence, not exercise name (same exercise may appear
twice). Eligible changes: explicitly edited target fields, compatible types,
manual add/remove/replacement/order/set count. Unfinished rows aren't removed.
Filter generated warm-up additions and unsupported drop/failure types with
visible explanations. Preserve existing routine generated warm-ups unless
explicitly removed; generated additions from this session remain excluded.
Manual warm-ups may be selected. Show before/after canonical values converted
for review, label them future targets and select all eligible compatible changes.

Make structural selections dependency-aware: replacement/add-exercise owns its
new sets; selecting new set targets selects its parent addition. A deselected
removal preserves the original row. Rebuild valid contiguous ordering and
superset membership after selection, without accidental grouping across removed
blocks. Target reps written as an exact min=max when replacing a range with an
explicit performed target; untouched ranges remain unchanged. 0049's side-mode/
target changes are atomic selection groups once available.

Fetch the current routine before review. If changed since snapshot, show newer
values and rebase only explicitly selected changes; clear selection and require
a fresh choice. Preserve unrelated edits. Missing/replaced source occurrence
is a visible unapplicable change, not a positional guess. Mutation after review
returns 409 and preserves the pending proposal for fresh review.

### Alternatives considered

- Copy whole performed workout over template: copies one-off/skipped/generated data.
- Compare only current routine and effective placeholders: invents edits from last time.
- Reuse destructive full replacement unchanged: loses historical links and concurrency.

## Contracts, schema and API

Domain adds `revision` read field to Routine and a dedicated conditional
`ApplyRoutineChangesInput` containing expectedRevision, mutationId and selected
operations keyed by stable occurrence/set IDs. Separate from CreateRoutineInput.
Generated migration `add_routine_update_revision` adds revision and last mutation
ID/hash to Routine. Existing reads gain optional revision; all write paths,
including ordinary editor updates, must increment it transactionally.

Authenticated `PUT /routines/:id/changes`: 200 updated Routine, 400 invalid or
unsupported changes, 401 unauthenticated, 404 missing/foreign, 409 stale revision
or reused mutation with different payload. Retry same accepted ID/hash returns
saved response, or conflict if a later edit intervened. Validate accessibility
of new exercise choices under existing private-exercise rules. Retained foreign/
deleted historical slots may remain unchanged but cannot be re-added by guessing.

Apply in a transaction with compare-and-increment revision and stable-ID
updates. Reuse this writer for ordinary routine editor updates so concurrent
paths cannot bypass the guard; existing old editor requests without revision
still update atomically and increment revision, while the new review detects
intervening edits. Retain unchanged occurrence IDs/sets. Explicit removal of a
routine occurrence must preserve a saved WorkoutExercise's existing link:
retain referenced removed occurrences as archived, excluded from routine reads
and new workouts, or detach only if the spec is amended. Plan chooses additive
`archivedAt` on RoutineExercise and filters it in active-template reads.
Set deletions do not delete performed sets. No historical training rewrite.

## Verification mapping

| Criteria | Checks |
|---|---|
| AC-1–AC-3 | 60→62.5 explicit edit, no diff from completion/ghost values, accept/decline and untouched history. |
| AC-4 | Replacement, manual/generated origin, unsupported type, selected add/remove dependencies and superset ordering. |
| AC-5 | POST failure gives no offer; routine failure retains already-saved identity; identical mutation retry no duplicate children. |
| AC-6 | Concurrent ordinary editor/review writes, revision CAS rollback, newer values visible, unmatched source slot never guessed. |
| AC-7 | Deleted routine, old draft lacking snapshot, foreign exercise; no reconstruction or auto-overwrite. |
| EF-1–EF-5 | Save/reauth/isolation errors, pending review on finish-and-start and sign-out. |

Use pure diff/application tests, route validation and isolated Prisma tests
for atomic revisions, archives/history links and repeated submissions. Device
checks cover selected-all review, deselect, saved-summary access after error
and finish-and-start with an active second workout.

## Files to touch

- Domain `entities.ts`; Prisma schema/generated migration.
- `apps/api/src/features/routines/{routes,repository}.ts`, new conditional change writer/tests.
- Routine reads/start metadata filters for archived occurrences; workout link regression tests.
- Mobile workout draft/creation/edit actions/envelope; completed-review storage/helper (new).
- `ActiveWorkoutScreen.tsx`, `WorkoutSummaryScreen.tsx`, `useRoutineStart.ts` where needed for post-save navigation.
- New routine change diff/helper/review component; routine API client and form version handling.
- ES/EN labels; 0049 adapter/tests after side mode ships; roadmap/backlog.

## Risks and rollout

Archive filtering must reach every active-routine read, summary and writer;
otherwise deleted slots can reappear. Existing routine writes must preserve
archives rather than delete everything. Migration/API before app; old API has
no review endpoint and leaves workout saved with an unsupported update notice.
Old drafts lacking snapshot never fabricate changes. Rollback keeps archived
and revision-aware API until compatibility is assured; disabling review alone
is safe. No new native dependency or Health rewrite.
