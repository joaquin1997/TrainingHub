---
spec: 0049
status: approved
created: 2026-11-03
---

# Plan — Configurable weight per side

Self-reviewed against the constitution and the owner's spec review. Design
only: no implementation, migration, external activation or device acceptance.

## Constitution check

| Article | Compliance |
|---|---|
| 1 | Optional weights only; no imbalance analytics or automatic side ramps. |
| 2 | Separate target/performed fields and occurrence-local mode. |
| 3 | Domain owns side-pair rules and DTOs, consumed by API/mobile. |
| 4 | Every stored side quantity in kg; draft input converts at boundary. |
| 5 | Generated additive migration; existing rows remain shared. |
| 6 | Watch uses display-ready existing bridge, no provider bypass. |
| 7 | No personal loads in logs or compatibility errors. |
| 8 | Contracts, schema, read/write and view slices independently checked. |
| 9 | No dependency; native layout rebuild conditional and explicit. |
| 10 | Older-client overwrite hazard handled by capability gate. |
| 11 | Owner-scoped writes/reads and authenticated capability discovery. |

## Current code and approach

`WorkoutSet` and draft rows have left/right reps and one `weightKg`.
`RoutineExerciseSet` has a single target weight and common min/max reps.
`recordReps` picks the better side but `setVolumeKg` multiplies one shared
weight by total reps. A second input alone would corrupt every derived view.

Add `weightMode: shared | perSide` on routine/workout exercise occurrences,
not Exercise. Add optional `weightLeftKg`/`weightRightKg` to performed sets;
add `targetWeightLeftKg`/`targetWeightRightKg` and optional side-rep targets
to routine sets. Keep planned and performed DTOs separate. Shared mode uses
existing shared weight and reps unchanged. In separate mode the shared field
is absent, not a higher-side surrogate. Interpret saved per-side fields even
if catalog unilateral classification later changes. Snapshot the occurrence's
unilateral/mode meaning; do not reinterpret history from current catalog flags.

In the draft, side weight strings/placeholders are in its captured unit,
with kg conversion solely in `setValuesToSave`. Enabling mode copies each
set's effective shared weight to both sides. Turning off opens one review of
all unequal sets, requiring a side selection for each; cancel is atomic.
For equal pairs collapse directly. Shared-mode conversion does not silently
reset reps/completion. Completed changes recalculate volume/feedback.

Extend pure shared domain helpers to produce performed side pairs. Side
volume is its own weight × reps, including only complete valid pairs. Weight
PR candidates require a performed side; same-side estimated 1RM and reps-at-
weight never cross-pair sides. Most-reps retains the better-side rule; best
set/session volume sums sides. API `bestSet` must return the actual winning
pair, not an old `weightKg` plus max reps. Keep historical shared-weight
fixtures identical, including tracking-type exclusions and warm-up rules.

Use those helpers for API aggregates/last time, live records/last-session
feedback, mobile summaries/comparisons, share text/card and weekly totals.
Generic performed-work volume still includes performed warm-ups where it
does today; working-record volume remains working-only. Do not change all
volume to a single eligibility rule merely to centralize multiplication.
Watch `setTarget` can encode a labelled L/R display string with both pairs;
its existing unilateral reps control remains unavailable. Check target wrap
and change Swift layout only if both pairs cannot remain readable.

Automatic approach generation uses the lesser first working side load as a
shared reference, then applies 0043's personal count/increment preferences.
If either target is missing, require a usable common target rather than
inventing it. In a per-side occurrence generated warm-up sets receive equal
side loads to represent that common target. No side-specific ramp generation.

### Alternatives considered

- Always retain the larger side in shared `weightKg`: misleads older clients.
- Per-catalog mode: leaks one person's logging choice to everyone.
- Duplicate the exercise per side: breaks performed-session identity/grouping.

## Contracts, schema and migration

Additive domain contracts in `entities.ts`; `RecordSetValues` gains side loads
and shared helpers expose valid same-side candidates. Extend last-performance,
input/output, routine and watch target adapters. Export compatibility capability.

Generated Prisma migration `add_per_side_weights`: nullable kg/target/side-rep
fields, occurrence mode default shared and optional occurrence unilateral
snapshot where absent. Existing rows retain shared interpretation, no backfill
of fake loads/reps and no catalog rewrite. Writes validate complete mode/field
consistency and finite nonnegative loads; zero retains existing non-record
load semantics. Missing side reps/load is incomplete, not copied from the other
side. Typed zero is distinct from blank input or a missing suggestion.

## API and older-client compatibility

Authenticated `GET /capabilities` returns `perSideWeightsV1: true` only once
read/write/aggregate support is installed. New client sends
`X-TrainingHub-Capabilities: per-side-weights-v1` on affected requests. Existing
workout/routine routes accept additive fields and return mode/side quantities.
400 invalid mode/values, 401 auth, 404 inaccessible resource, 409
`CLIENT_UPDATE_REQUIRED` for an old reader/writer touching per-side data.

On list/history/progress containing per-side quantities, never return a
misleading shared-weight payload to an incapable client; use the same visible
409 update-required response. Old writes must not erase a per-side routine
through full replacement. Check stored mode inside the transaction before
replacement, not just the submitted body. This is an intentional update gate
for accounts using the optional feature; shared-only accounts remain compatible.
An older API (no capability) disables new separate-mode creation rather than
silently stripping fields. Existing per-side drafts remain stored/read-only
with update guidance until a capable server is available.

## Verification mapping

| Criteria | Checks |
|---|---|
| AC-1–AC-2 | 510 kg vs shared 360 kg fixtures; old session/record results unchanged. |
| AC-3 | Mode on copies effective values; multi-row off review chooses each side; cancel preserves original draft. |
| AC-4 | 20×12 and 25×5 candidate pairing, historical/live estimates, reps-at-weight and last-session exact-weight comparisons. |
| AC-5 | Distinct routine target round trip, start mode/targets, 0051 selective persistence once installed. |
| AC-6 | One incomplete side, blank vs zero vs invalid, valid other side counted without inventing data. |
| AC-7–AC-8 | kg/lb, history flag change, target/sharing/watch labels and lesser-load warm-up generation with personal settings. |
| EF-1–EF-4 | Validation, old read/write gate, capability absence, completed mode-change recalculation. |

Tests must exercise real serialization/mapping as well as pure formulas;
route mocks alone cannot establish Prisma transaction/persistence correctness.
Use an isolated migrated test database for old/new routine/workout round trips.

## Files to touch

- `packages/domain/src/{entities,records,index}.ts`.
- `apps/api/prisma/schema.prisma`, generated migration, runtime capabilities route.
- `apps/api/src/features/routines/{routes,repository}.ts`.
- `apps/api/src/features/workouts/{routes,repository,sides}.ts`.
- `apps/api/src/features/progress/{aggregate,records,repository,startingRecords}.ts`.
- Mobile draft, persistence envelope, last-time pairing, pure stats/comparison/share helpers and tests.
- Workout row/screen/detail/summary, routine table/form, warm-up adapter/preview, watch `setTarget`.
- Mobile API capability/header adapters and ES/EN strings; Swift `WorkoutView.swift` only if layout requires it.
- Domain-rule API/mobile tests, migration integration harness, rollout docs and backlog.

## Risks and rollout

Plan after 0043 and 0048 contracts settle; 0050/0051 must adopt these optional
fields without dropping them. Add migration/API first, then capable app; only
then expose opt-in. Verify connected watch labels before enabling. No new
native dependency; layout changes require the 0047 watch rebuild. Existing
old-client fallback is an explicit update requirement, not guessed data.
Rollback must preserve side-aware API guards once per-side rows exist; never
roll back to code that can overwrite them. Disable further opt-in and restore
a capable prior app instead. No destructive migration rollback.
