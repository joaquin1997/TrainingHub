---
spec: 0043
status: approved
created: 2026-11-03
---

# Plan — Smarter warm-ups and warm-ups marked by hand

Self-approved under the delegated gates of 2026-10-16. Planning only:
implementation and the task breakdown have not started.

## Current state verified 2026-11-03

- `loadingKind` already exists in Prisma and in the shared `Exercise` contract
  (`barbell | dumbbell | machine`). Spec 0044 filled the reviewed catalog and
  supplied muscles and equipment. Do not add this column again or repeat the
  retired catalog sweep.
- `apps/mobile/src/lib/approachSets.ts` still builds one barbell ramp, with a
  20 kg / 45 lb floor. Both workout and routine preview helpers use it.
- Workout drafts and editable routine rows retain tracking type but not all
  metadata needed for muscle-aware ramps. Persist optional metadata alongside
  each exercise so an already loaded workout works offline.
- `ApproachSetsPreviewSheet` is shared by the workout and routine editor. Its
  result currently disappears for no-weight and too-light cases; those cases
  must retain the loading-kind selector under FR-8 / EF-1.
- Workout set labels call `cycleWorkoutSetType`; routine labels do not offer a
  type picker. Existing setters already preserve warm-up numbering, records
  exclusion and the generated-versus-personal warm-up distinction.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope | yes | Loading-aware ramps and explicit set types only; no plate calculator, editable percentages or new general settings. |
| 2 — Templates vs performed | yes | Workout muscle warmth reads earlier completed working sets; routine warmth reads earlier planned exercises. Separate adapters, one pure ramp rule. |
| 3 — Shared contracts | yes | Reuse `ExerciseLoadingKind`; new write DTO and provenance live in domain. |
| 4 — kg | yes | Round ramps in the captured display unit; existing save conversion remains canonical kg. |
| 5 — Prisma | yes | One additive provenance migration, no new loading-kind column. No row reassignment or catalog rewrite in the migration. |
| 6 — Integrations | no | No provider or native integration change. |
| 7 — Secrets | yes | No credentials added or logged. |
| 8 — Verification | yes | Independently committable slices: persistence/API, pure rules, workout integration, routine integration; typecheck/tests before each commit. |
| 9 — Dependencies | yes | No new dependencies or native rebuild. |
| 10 — Unknowns | yes | Ambiguous muscle/metadata cases have explicit deterministic rules below. Device checks remain open until run. |

## Approach

Resolve a small warm-up context, then pass it to the existing pure ramp
helper: loading kind, whether it is an EZ bar, muscle size and whether that
muscle has already been worked. The preview and confirmation use the same
resolved context and first working weight. Changing the preview's kind
recomputes its rows immediately. Confirmation rechecks exercise identity and
working weight so a stale preview never inserts rows into a replaced exercise.

Loading-kind precedence: an explicit person choice, the reviewed catalog
value from 0044, then names/aliases (EN/ES), then equipment, then machine.
For name inference, machine/cable/pulley outranks bar/dumbbell words in a
compound name. Match normalized whole words, including EZ-bar variants;
never infer from a translated display name alone when both catalog names
are available. Kettlebells use dumbbell rounding. The empty EZ bar is
10 kg / 25 lb only when the selected kind is barbell.

Use primary muscles, normalized into the groups in the spec, with category
fallback when primary data is absent. If multiple primary muscles exist,
a muscle shared with an earlier eligible exercise is enough for "already
worked"; use large when any primary muscle is large. Unknown muscle names
fall back to category; unknown category and muscle mean large and not yet
worked. Category fallback matches the same category, not every exercise of
the same size. Secondary muscles do not pre-warm unrelated primary muscles.

The spec's table is authoritative: a previously worked large muscle gets
two approach sets, a small one gets one. AC-4's former single chest set was
inconsistent with this table and has been aligned with it in the spec.

Keep current percentage schemes but select full/two/one from the context.
Always require positive weights, a step between distinct approach rows and
weights below the working target. A very light target can produce fewer
rows than the selected scheme, including none. Do not impose a bar floor
on dumbbells or machine/cable.

### Alternatives considered

- **Guess from names on every preview** — rejected: reviewed metadata already
  exists, names can change language and a person's correction must survive.
- **Store only on the device** — rejected: FR-9 requires the other devices to
  see the correction.
- **Fetch metadata when pressing Warm-up** — rejected: breaks the offline
  workout and makes an existing local calculation depend on connectivity.
- **One routine/workout warmth adapter** — rejected: would treat planned work
  as completed work. Only the numeric ramp is shared.

## Shared contracts (`packages/domain`)

Reuse `ExerciseLoadingKind`. Add `ExerciseLoadingKindSetBy = 'system' |
'person'` and `UpdateExerciseLoadingKindInput`. Add optional provenance to
`Exercise`; older responses default to system. Return the updated `Exercise`
from the write operation, using its existing metadata fields.

Extend routine exercise read contracts with optional warm-up metadata where
not already exposed (loading kind/provenance, equipment, catalog names,
primary muscles/category). This is read metadata, not a new planned or
performed set type. Workout drafts capture the same optional fields at start,
add and replace. Old drafts remain readable and infer from available names;
refresh metadata best-effort after connectivity returns without modifying
sets already present.

## Data model and migrations

Add `Exercise.loadingKindSetBy String @default("system")` with a generated
Prisma migration, suggested name `add_exercise_loading_kind_provenance`.
Existing loading kinds, including the 0044 catalog, stay intact. No backfill
script is required; system is the correct provenance of existing values.

Catalog curation must read provenance and exclude person-selected loading
kind from both its proposed changes and apply/undo operations. Otherwise the
next catalog apply would undo FR-9 or report a perpetual pending correction.
Add coverage of this interaction to the catalog planner and apply tests.

## API surface (`apps/api`)

`PUT /exercises/:id/loading-kind`, authenticated through 0001's global hook.
Body: `{ loadingKind: 'barbell' | 'dumbbell' | 'machine' }`.

- 200: updated exercise, provenance person; repeated choices are idempotent.
- 400: malformed body or an unsupported kind.
- 401: absent/invalid session.
- 404: missing, deleted or another person's custom exercise, identically.
- 5xx: saving failed; client keeps the local candidate and shows retry.

Mirror `trackingTypeRepository` ownership checks: any signed-in person can
change a catalog exercise; only its owner can change a custom one. A loading
kind change never edits existing routine targets or logged sets. Use an
ownership/deletion condition at the update as well as on the initial read.

## Mobile surface (`apps/mobile`)

1. Extend `approachSets` with optional context, retaining the old barbell
   default until callers are migrated. Extract metadata normalization,
   loading inference and muscle matching into pure helpers.
2. Workout preview receives all preceding exercise metadata and done working
   sets. Routine preview receives preceding planned exercise metadata. Do not
   count warm-up-only or unfinished workout exercises as already worked.
3. Extend the preview sheet with three named loading choices, selected state,
   the already-worked explanation, permission to edit, saving status and a
   save-failed/retry message. Keep the selector available with no weight or
   a too-light target, and disable adding when there are no generated rows.
4. A choice applies locally immediately and is saved immediately. Dismissing
   the sheet cancels set insertion, not an already saved exercise preference.
   On failure, keep a pending choice in that exercise's current draft/editor
   state; retry explicitly or on the next preview attempt. Do not promise a
   general background sync queue. Close/reopen the workout preserves the
   pending choice with its optional draft metadata. Another device only sees
   it after a successful save. Ignore late saves for a replaced exercise.
5. For foreign/deleted exercises, show the inferred context read-only. Existing
   historical exercise names remain usable without fetching private details.
6. Replace label cycling with one small shared set-type sheet, current value
   selected. Workout offers normal/warm-up/drop/failure; routine only
   normal/warm-up. Cancel and selecting the current type are no-ops. Changing
   an actual type removes the generated marker but preserves done, values and
   rest state; existing live-record derivation recomputes the badges.

Use existing theme tokens, translated labels and accessible button/selected
states. No new native capability, permission or build step.

## Testing strategy

| Spec AC / error | Verification |
|---|---|
| AC-1, AC-2 | Pure kg ramp examples for 32.5 kg dumbbells and 60 kg machine, no bar floor. |
| AC-3 | Existing 140 kg barbell regression, unchanged exact five rows. |
| AC-4, AC-5 | Large/small muscle fixtures; skipped, warm-up-only and unfinished workout rows; separate routine adapter tests. |
| AC-6 | Authenticated write/ownership tests; preview recomputation, local failure/retry, draft round trip, catalog apply preserving person provenance; device reopen and second-device read. |
| AC-7, EF-4 | Type change keeps done/values, clears generated mark, renumbers and removes live-record contribution; device checks visible list and dismiss. |
| AC-8 | Routine normal/warm-up round trip and workout start from that routine. |
| AC-9 | lb ramps, EZ empty bar, machine step, rounding and very light target cases. |
| EF-1–EF-3, EF-5 | No-weight selector, server failure, foreign/deleted exercise and unknown metadata fixtures; offline device preview. |

Run `pnpm -r typecheck` and `pnpm -r test`. Device checklist: both sheets in
ES/EN, light/dark, large text, normal/warm-up labels, live badges, retry and
reopen, plus unit capture during an active workout.

## Files to touch

- `packages/domain/src/entities.ts` — loading-kind provenance/write DTO and
  routine metadata contract.
- `apps/api/prisma/schema.prisma`, generated migration — provenance only.
- `apps/api/src/features/exercises/repository.ts` — expose provenance.
- `apps/api/src/features/exercises/loadingKindRepository.ts`,
  `loadingKindRoutes.ts` and their tests (new) — permissioned persistence.
- `apps/api/src/routes/index.ts` — register loading-kind operation.
- `apps/api/src/features/routines/repository.ts` — routine read metadata.
- `apps/api/src/scripts/catalog/curate.ts`, `catalog-curate.ts` and catalog
  tests — preserve person choices in report, apply and undo.
- `apps/mobile/src/lib/approachSets.ts`, its tests and a new
  `warmUpContext.ts` / tests — pure calculation and metadata rules.
- `apps/mobile/src/features/exercises/api/exercisesClient.ts` — save choice.
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts`,
  `approachSetsDraft.ts` and tests — metadata, explicit type setter, context.
- `apps/mobile/src/features/workouts/persistence/activeWorkoutEnvelope.ts`
  and envelope tests — backward-compatible optional metadata validation.
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx`,
  `components/WorkoutSetRow.tsx`, `ApproachSetsPreviewSheet.tsx`, new
  `SetTypeSheet.tsx` — visible choices, preview and retry.
- `apps/mobile/src/features/routines/screens/RoutineFormScreen.tsx`,
  `utils/routineApproachSets.ts` and tests — planned context and type selection.
- `apps/mobile/src/i18n/locales/{en,es}.ts` — labels and errors.
- Relevant SDD statuses, tasks once written, and roadmap area 1.

## Risks and open questions

No blocking product decision. Recorded assumptions: reviewed loading kinds
outrank inference; a shared primary muscle is enough for the shortened ramp;
unknown metadata gets the conservative ramp; saving the preference is separate
from confirming sets. These calls are explicit so device feedback can amend
small rules without changing the data model.

Old workout drafts contain less metadata: retain the generic fallback and
hydrate best-effort, never block a workout on the catalog. The shared catalog
choice affects other users, as already decided in the spec; per-person
catalog preferences remain outside this work.

## Rollout

Deploy the additive provenance migration, API and curation protection before
the mobile bundle. Old clients keep working; old APIs fail the new save and
the app must show retry while preserving this preview locally. Existing
workouts and routines are not regenerated. Roll back code by restoring the
previous bundle/API; retain the additive column and person choices.
