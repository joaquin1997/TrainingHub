---
spec: 0048
status: approved
created: 2026-11-03
---

# Plan — Trustworthy records and last-session feedback

Self-reviewed against the constitution and the owner's spec review. Design
only: no implementation, migration, external activation or device acceptance.

## Constitution check

| Article | Compliance |
|---|---|
| 1 | Two explicit feedback scopes; no changed PR definition or speculative repair. |
| 2 | Derive from owned performed work, never routine suggestions. |
| 3 | Comparison DTOs and shared formulas live in domain. |
| 4 | Compare canonical kg; format only at UI edges. |
| 5 | No schema or personal data migration. |
| 6 | No new native/provider integration. |
| 7 | Reproduction evidence redacted; no authorization or workout bodies logged. |
| 8 | API, shared derivation, loading state and presentation independently tested. |
| 9 | Existing timer/AppState; no network-status dependency. |
| 10 | Original discrepancy remains an explicit separate acceptance condition. |
| 11 | Authenticated read, owned-history scope and stale-account reply guards. |

## Current code and approach

`useStartingRecords` has a 30-second retry but suppresses permanent refusals
for the mounted workout and returns no loading state. `recordBadgeLabel` shows
type plus additional count. Shared `records.ts` already owns qualification.
Add contextual comparison values without changing its existing PR formulas.

Historical `repsAtWeight` currently means “at this weight or heavier” through
`repsAtOrAbove`. Preserve it. Last-session comparison, accepted in 0048, uses
exact matching weight and must have its own explicitly labelled explanation.
Do not silently change historical PR rules to exact-weight-only semantics.

Add a batched authenticated comparison-reference read keyed by exercise IDs
and workout `startedAt`: `GET /progress/comparison-references?exerciseIds=...&before=...`.
Keep the existing starting-record endpoint compatible. Return per exercise
independent historical and last-session sources: derived all-time StartingRecords
and latest prior session ID/date with working-set bests, exact-weight reps
and working volume. Missing history is a successful empty reference, not an
error. Use existing owned performed-work query and group repeated exercise
occurrences into one workout. Select prior session by `startedAt < before`,
tie-break by completion date then public ID. Cap/validate IDs as existing route.
History PR reference freezes when loaded; last-session reference is the latest
saved session strictly before workout start, never the active workout itself.

New domain `RecordComparisonHit` wraps a hit with `baselineValue`,
`baselineScope: historical | lastSession`, optional reference session/date,
and comparison-weight explanation. Retain existing LiveRecordHit consumers
through optional adapters rather than breaking old saved-record responses.
For historical reps-at-weight, baseline uses `repsAtOrAbove`; don't show a
higher weight's best as though lifted at exactly today's weight. Support
independent source success/failure and late completion from each source.

Store validated source references in the owner-scoped draft. Keep loading/
error/retry state in a controller keyed by client ID, exercise ID and source;
clear stale replies after removal/account switch. On restored drafts retain
valid existing historical baselines, backfill missing last-session references.
Retry missing sources on AppState foreground and existing 30-second timer
while active; that timer handles restored connectivity within one minute,
without adding a connectivity dependency. Expose manual retry as well.
401 invokes existing session recovery; 403/404 produce visible unavailability
and retry on reopen, never a whole-workout silent refusal. Do not poll successes.

Pure derivation yields historical PR hits and exact-last-session improvements.
Use only performed working sets; session volume sums all occurrences of an
exercise, excluding warm-ups as existing live PR rules do. Prefer historical
label for the same metric and keep both references in accessible detail.
Do not include improvement-only hits in PR counts, haptics or summary celebration.
Ties/missing values never beat zero. Recalculate after every edit/undo/type
change, but only actual undone→done transitions trigger transient notices;
late loading refreshes badges without a burst of retroactive notices.

Badge detail uses an accessible sheet with all metric/current/baseline values,
explicit units and historical/last-session scope/date. Keep row taps for Done
separate from detail activation. Per-exercise status says checking/unavailable
without a modal; label source-specific partial unavailability. Confirmed empty
history clears the status and earns no beaten-record notice.

### Alternatives considered

- Compare each row to same row last time: fails reorder/different set counts.
- Reuse last-performance placeholders as a baseline: those mix targets and
  warm-ups and are not a frozen comparable working-session metric.
- Recompute live reference from newly saved workouts: moves the goalposts.
- Fix catalog/account rows speculatively: no evidence and outside authorization.

## Schema and API errors

No schema migration. New shared response/error types in domain. 200 includes
one result per requested owned/history-visible exercise, including confirmed
empty; inaccessible/unresolvable sources are explicitly unavailable, not
fabricated empty history. 400 invalid IDs/date, 401 auth rejection, 5xx retry.
No private exercise existence leak or arbitrary user identifier in request.
No new writes or data-merge operation. Explicit catalog identity only.

## Verification mapping

| Spec criteria | Checks |
|---|---|
| AC-1–AC-2, AC-7–AC-8 | Current/baseline figures, extra count, all-type detail; historical vs last-session wording, same-or-heavier historical regression. |
| AC-3–AC-6, AC-9 | Offline/no data/partial data, 30-second retries, foreground, permanent refusal/reopen, old drafts and add/replace paths; no false empty history. |
| AC-10–AC-12 | 50/45/47 vs 52 kg examples, no PR-count inflation, exact last-session weights, no fictitious pairs, equality, undo/retype, frozen references and duplicate occurrences. |
| EF-1–EF-3 | Save unaffected by missing data; saved records authoritative; historical identity/no name merges. |
| Investigation acceptance | Reproduce affected exercise/session with expected/current values before defect closure; fixture for established cause and owner/device recheck. |

## Files to touch

- `packages/domain/src/{records,entities,index}.ts` — comparison reference/hit contracts and pure comparisons.
- `apps/api/src/features/progress/{repository,startingRecords,routes}.ts`, tests.
- New `apps/api/src/features/progress/comparisonReferences.ts`, tests.
- `apps/mobile/src/features/workouts/liveRecords/` loaders, draft adapters, derivation, badge/notice/labels and tests; new comparison detail/status components.
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts`, persistence envelope/tests.
- `apps/mobile/src/features/workouts/{components/WorkoutSetRow,screens/ActiveWorkoutScreen}.tsx`.
- `apps/mobile/src/i18n/locales/{en,es}.ts`, investigation evidence (redacted), roadmap/backlog.

## Risks and rollout

API first, then bundle; old API fallback preserves available historical
baselines but reports last-session unavailable rather than inventing comparisons.
No native rebuild. No production data inspection or rewrite during planning.
Concrete reproduction evidence is still missing: implementation may finish UI
criteria but 0048 must remain in-progress until investigation acceptance passes.
0049 later extends same-side values through these shared helpers, with fixtures
proving historical shared-weight results unchanged. Rollback additive response
and draft fields without discarding active workouts.
