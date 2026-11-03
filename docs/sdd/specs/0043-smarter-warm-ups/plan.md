---
spec: 0043
status: approved
created: 2026-11-03
revised: 2026-11-03
---

# Plan — Smarter warm-ups and warm-ups marked by hand

Revised after the owner's spec review: configurable count up to five,
adjustable increments and personal preferences replace the former shared
catalog correction/provenance proposal. Self-reviewed under the delegated
gates. Planning only; tasks and implementation have not started.

## Current state verified 2026-11-03

- Prisma and shared Exercise already expose `loadingKind` from the reviewed
  0044 catalog. Keep it as catalog metadata, not a person's mutable preference.
- `approachSets.ts` still uses a single five-row barbell scheme, fixed
  `LOADABLE_STEP` and a 20 kg / 45 lb floor. Workout and routine adapters share it.
- `ApproachSetsPreviewSheet` is shared by workout and routine editors. Its
  no-weight/too-light states must retain configuration and disable insertion.
- Drafts need optional metadata/preferences to compute locally after hydration.
- Set-type cycling still needs the named, explained picker in FR-10–FR-13.
- Prisma's `ExerciseFavorite` demonstrates the existing unique user/exercise
  relationship pattern. A warm-up preference needs its own record and purpose.

## Constitution check

| Article | Compliance |
|---|---|
| 1 — Scope | Preview count, increment, personal loading kind and explained types; no gym profiles, editable percentages or plate calculator. |
| 2 — Templates vs performed | Separate workout/routine muscle-context adapters; preferences do not rewrite intended or performed sets. |
| 3 — Shared contracts | Reuse ExerciseLoadingKind; add one shared personal-preference contract, with no account-specific values on shared Exercise. |
| 4 — kg | Custom increment stored in kg, converted at the edge; resolve generation in captured display unit with numerical tolerance. |
| 5 — Prisma | Generated additive preference-table migration; no loading-kind provenance column or catalog data rewrite. |
| 6 — Integrations | No provider/native integration changes. |
| 7 — Secrets | No credentials or personal workout values added to logs. |
| 8 — Verification | Independent persistence/API, ramp rules, workout and routine slices; required checks before commits. |
| 9 — Dependencies | No new dependency or native rebuild. |
| 10 — Unknowns | Fallbacks, rounding/count reductions and pending saves are explicit; device acceptance remains separate. |
| 11 — Identity | Preferences resolved only for validated owner; account isolation tested and cache/draft ownership preserved. |

## Approach

Build a pure context for the preview: resolved loading kind, EZ-bar flag,
muscle size/already-worked state, selected count mode and effective increment.
A personal loading-kind override outranks reviewed catalog metadata, then
names/aliases (EN/ES), equipment and machine fallback. Infer normalized whole
words; cable/machine/pulley outranks bar/dumbbell in compound names.

Automatic count follows the spec's muscle/context table. An explicit integer
1–5 overrides its count and selects the documented scheme. Both modes keep
positive, strictly increasing weights separated by at least the increment,
and below working weight. Rounding/target limits may reduce the actual count;
show requested versus generated count and why. Never invent duplicate rows.
Barbell uses the empty-bar floor; other loading kinds do not. Empty EZ bar is
10 kg / 25 lb only for barbell. Defaults remain unchanged until overridden.

Use primary muscles normalized to the spec's groups, category as fallback.
Any shared primary muscle with an eligible earlier exercise means already
worked; any large primary means large. Secondary muscles alone do not count.
Unknown category and muscle mean large/not yet worked. Workout context reads
completed working sets; routine context reads preceding planned exercises.

Preview changes recalculate immediately without editing existing sets.
Insertion rechecks exercise identity, first working target, unit and current
configuration; a stale preview cannot insert rows into a replaced exercise.
Generated sets retain the existing manual-edit/undo and shorter-rest rules.

## Shared contracts and persistence

In `packages/domain`, define `ExerciseWarmUpPreferences` and a matching update
DTO: optional loading-kind override, `approachSetCount: null | 1 | 2 | 3 | 4 | 5`
(null = Automatic) and optional `incrementKg` (null/absent = loading default).
Writes carry explicit nulls for reset; numeric values must be finite/positive
and counts integral. Responses distinguish a successfully loaded default
preference from one not fetched yet. Do not add account-specific fields to
shared Exercise or a provenance field to the catalog.

Add a Prisma `ExerciseWarmUpPreference` with user/exercise relations and a
unique pair. Store count and override as nullable fields, custom increment in
canonical kg with enough precision for existing unit conversion. Use the
repo's established user/exercise relation and ownership patterns. Generate an
additive migration; existing users have no row and therefore retain defaults.
No backfill or catalog-curation change is required. Catalog updates affect
defaults but never overwrite a preference record.

Routine read metadata and workout drafts retain catalog names/equipment,
loading kind and muscle information. Keep a separate preference cache scoped
to the signed-in user and exercise. Capture optional resolved preferences in
workout drafts for offline computation and pending writes. Old drafts use
known metadata/defaults and hydrate best-effort without changing existing sets.
Sign-out/account switch must not expose another account's preference cache.

## API surface

Add authenticated `GET` and `PUT /exercises/:id/warm-up-preferences`, registered
under 0001's global hook. GET returns the current user's values/defaults; PUT
atomically replaces their warm-up preference fields, returning saved values.
Do not accept a user identity from the body or update shared Exercise.

- 200: defaults/saved preference; repeated writes are idempotent.
- 400: invalid count, loading kind, zero/negative/non-finite increment.
- 401: missing or invalid session.
- 404: missing/deleted or another person's private custom exercise, identical.
- 5xx: failed save; client retains a local pending candidate and offers retry.

Recheck accessibility during write as well as read. A person may set their
own preference for a shared catalog exercise or their own custom exercise.
No foreign preference reads/writes, even when an exercise ID is guessed.
Include batching in the existing workout/routine metadata load where useful;
do not add a required network request per preview or per edited field.

## Mobile surface

1. Extend the pure `approachSets` helper with optional context. Keep the old
   signature compatible until both callers are migrated. Extract metadata
   inference and warmth matching into pure helpers.
2. Pass separate workout/routine context to the shared preview. Preserve the
   session's captured unit; convert saved custom increment at the weight edge.
   Use tolerant rounding so a converted increment does not drift on reload.
3. Show named loading choices, Automatic/1–5 count choices and a positive
   increment input in the preview, alongside current context and actual rows.
   Offer 2.5/5 kg quick choices for kg cable/machine previews plus editable
   input. Keep configuration visible without a valid working weight.
4. Apply valid edits locally immediately; persist a complete valid preference
   on field commit/selection, coalescing overlapping writes. Invalid partial
   input stays editable without replacing the last valid preview. Latest
   local choice wins over an earlier in-flight reply. Show saving/failure/retry.
5. Dismissing cancels insertion, not a successful preference save. Pending
   choices remain in the current draft/editor for retry; reopening the workout
   preserves them. No general background sync queue is promised. Other devices
   see only successful saves; ignore late replies after exercise/account changes.
6. Offer reset to Automatic count and default loading kind/increment. Changing
   loading kind retains an explicit custom increment until reset; absent a
   custom increment, use the newly selected kind's default. Changes never
   regenerate already inserted sets or overwrite routine targets.
7. For inaccessible historical exercises, show metadata-based local preview
   without private fetches or persistent preference writes, as EF-3 states.
8. Replace cycling with shared `SetTypeSheet`: workout normal/warmup/drop/failure,
   routine normal/warmup. Show full names and meanings, selected state and
   record effect. Dismiss/current selection are no-ops. A type change preserves
   values/done/rest, clears generated origin when appropriate, renumbers and
   recalculates live badges. Explain failure as a label, not a prescription.

Use existing theme tokens, ES/EN translations, accessible selected states and
large-text wrapping. No native change is required.

## Verification

| Criteria | Verification |
|---|---|
| AC-1–AC-3, AC-9 | Default kg/lb ramps, 140 kg barbell regression, EZ bar, no non-bar floor, light-target deduplication. |
| AC-4–AC-5 | Automatic context counts, shared/unknown muscles; skipped/warm-up-only/unfinished workout sets do not pre-warm; routine context independent. |
| AC-6, AC-12–AC-13 | User A/B isolation, cross-device read, null resets, increment conversion round trip, cache ownership, old draft hydration and retained pending save. |
| AC-7–AC-8, AC-10 | Both explained type pickers, dismiss/current no-op, values/completion preserved, generated marker/numbering and live-record effects. |
| AC-11 | Each explicit count 1–5 at a sufficiently heavy target; Automatic reset; rounding reduces count with visible explanation and no duplicated/working-weight rows. |
| AC-12, EF-6 | Machine 2.5/5 kg increments, valid decimal steps, invalid input does not replace preview; positive finite validation and kg/lb unit capture. |
| EF-1–EF-5 | No weight, offline load/save, authorization failures, inaccessible exercise, stale replies, replaced exercise, unknown metadata and already-done type changes. |

Run `pnpm -r typecheck` and `pnpm -r test` before implementation commits.
Device acceptance covers both previews/pickers in ES/EN, themes and large text,
count/increment changes, cable 2.5/5 kg, two accounts, second-device read,
reset, offline retry and reopen. Passing unit tests is not device acceptance.

## Files to touch

- `packages/domain/src/entities.ts` — preference/read-write contracts and
  optional routine metadata; no catalog provenance contract.
- `apps/api/prisma/schema.prisma`, generated migration — personal preference
  table and relations only.
- `apps/api/src/features/exercises/warmUpPreferencesRepository.ts`,
  `warmUpPreferencesRoutes.ts` and tests (new) — authenticated isolated reads/writes.
- `apps/api/src/routes/index.ts` — register new operations.
- `apps/api/src/features/routines/repository.ts` — missing routine metadata.
- `apps/mobile/src/lib/approachSets.ts`, tests and new `warmUpContext.ts` / tests
  — schemes, explicit count, increments and context rules.
- `apps/mobile/src/features/exercises/api/exercisesClient.ts` and a user-scoped
  warm-up preference cache/helper — read/write and local pending state.
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts`,
  `approachSetsDraft.ts`, persistence envelope and tests — optional metadata,
  configuration, backward compatibility and explicit type setter.
- Workout screen, set row, shared preview and new `SetTypeSheet.tsx` — controls
  and explained type selection.
- Routine form and `routineApproachSets.ts` / tests — separate intended context.
- `apps/mobile/src/i18n/locales/{en,es}.ts` — descriptions, controls and errors.
- SDD status, eventual tasks and roadmap area 1.

## Risks and rollout

No blocking product decision. Explicit-count numeric schemes, preview placement
and defaults are reversible assumptions in the spec. Count is a target rather
than a promise when the increment/working load cannot fit enough unique weights.
Prefer no rows and an explanation to invented weights. Custom increments
converted from kg require numerical tolerance and round-trip coverage.

Deploy the additive preference migration and authenticated API before the app
bundle. Old clients continue using catalog loading kind unchanged. Old servers
cause a visible preference-save failure while the local preview stays usable.
Existing sets and routine targets are not regenerated. Rollback retains the
additive preference data and restores prior code; do not rewrite the catalog.
