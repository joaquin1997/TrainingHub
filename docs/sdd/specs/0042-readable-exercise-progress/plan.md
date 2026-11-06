---
spec: 0042
status: in-progress
created: 2026-11-03
---

# Plan — Readable exercise progress

Plan gate self-reviewed under the delegated gates recorded in the
[SDD workflow](../../README.md). Implementation is complete locally. Delivery and
physical-device acceptance remain separate; see [verification](verification.md).

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | Yes | Exercise lookup/detail only; retain overview summaries, existing record formulas and saved-workout inspection. |
| 2 — Template vs performed | Yes | Derive exclusively from owned saved performed work; no routine writes. |
| 3 — Shared domain types | Yes | Add compatible evidence/search fields in domain; API and mobile consume the same definitions. |
| 4 — Weight in kg | Yes | API evidence and volume stay kg-scaled; convert only for display through existing helpers. Active drafts are untouched. |
| 5 — Prisma migrations | No | Existing session/exercise/set IDs, order and catalog names suffice. No schema, migration or backfill. |
| 6 — Integration boundaries | No | No Health, Watch or provider changes. |
| 7 — Secrets | Yes | Synthetic fixtures/screenshots; no account dumps or configuration changes. |
| 8 — Committable + verified | Yes | Contracts, derivation, read routes and UI land in independently green steps. |
| 9 — Dependencies | Yes | Reuse Expo Router, existing controls and SVG/bar charts; no dependencies. |
| 10 — Explicit gaps | Yes | Older API evidence is unavailable rather than reconstructed; physical acceptance stays open. |
| 11 — Validated identity | Yes | Authenticated reads scoped by workout owner; clear local data on account change and reject stale replies. |

## Current code and approach

`repository.ts` already loads owned workouts and applies `selectPerformedWork`
before aggregation. Catalog names are localized by `exerciseDisplayName`.
`buildRecordHistories` merges repeated exercise occurrences within a workout,
but `buildAccumulators` currently emits one point per occurrence and independently
maximizes weight and reps. Detail and exercise-info rows can therefore display
a pair never lifted. Session IDs and same-set evidence are missing from DTOs.

The overview loads summaries above the exercise list. Detail has an implicit
1RM/volume fallback, no period controls, clears loaded data before refresh and
loads on mount rather than focus. Reps-only exercises use weight labels.
`TimedProgressDetail` is a separate detail body with the same navigation and
filtering gaps. The exercise-information action already exists, but only when
history has loaded successfully; it pushes into a different tab's stack.

Extend existing reads additively. Aggregate each exercise once per saved
workout with stable evidence. Filter loaded trained-exercise results locally.
Use one detail flow for all five tracking types, retaining the chart renderer
and all-time record card. No general cache, offline archive or new persistence
layer is needed.

### Alternatives considered

- Client fetching every workout to repair pairs/grouping: duplicates performed
  work rules, downloads unrelated history and leaves other API readers wrong.
- Independent maxima joined with a multiplication sign: cannot satisfy FR-5.
- Server search/period request per interaction: unnecessary for the existing
  all-history response and prevents immediate loaded-result filtering.
- A new chart library or per-type screen implementation: existing chart and
  shared metric configuration cover the requirements with fewer moving parts.

## Shared contracts (`packages/domain`)

Extend `ExerciseProgressSummary` with optional `searchNames: string[]` containing
authorized catalog names/aliases for either language. Display continues using
`exerciseName`; aliases never become exercise identities.

Add a framework-independent `ProgressSetEvidence` shape with saved exercise
occurrence/set IDs, logged order and optional original `weightKg`, `reps`,
`repsLeft`, `repsRight`, `durationSeconds`, `distanceMeters`. Quantities come
from one performed working set. For unilateral labels, retain side values;
existing better-side rules for maxima and two-side totals for volume remain.

Extend `ExerciseProgressPoint` with optional `workoutId`,
`heaviestWorkingSet: ProgressSetEvidence`, `totalWorkingReps` and
`sessionVolumeKg`. Keep existing maxima/volume fields compatible. The new
optional session-volume field distinguishes an actual recorded weighted volume
from the legacy `totalVolume: 0` when no weighted quantities exist. A measured
zero is not the same as absence. Reps totals sum recorded working reps using
the existing stored two-side total for unilateral sets. Do not invent missing
quantities or recover evidence by joining independent maxima.

Add an optional `readableProgressVersion: 1` on detail to indicate complete
0042 grouping/evidence semantics. Additive optional fields leave existing
callers compiling. The new detail checks the version: against an older server
show explicit update/unavailable state with retry/back, rather than guessing
pairs, workout IDs or session counts. Overview can still show name/date/count
from an older API, with alternate-name matching unavailable until API rollout.

## Data and derivation

No Prisma migration or data backfill. In `loadSessionInputs`, retain existing
session-wide legacy detection before filtering. Add saved set/occurrence IDs
and explicit `orderBy` for exercise `order` and set `order`. Pass authorized
search metadata alongside the existing localized name.

Within one workout, group occurrences by exercise ID before constructing each
point. Sum their performed volume and working reps; calculate maxima/estimate
from eligible working sets. Select heaviest evidence by weight descending,
then record reps descending, then logged occurrence/set order. Never turn a
best rep count from another set into the heaviest set's reps. Summary latest
and session counts derive from these combined points. Existing summary maxima
remain independently labelled wherever no paired evidence is available.

Chronology uses the existing `completedAt ?? startedAt` date; ties use workout
ID for deterministic order, with input order fallback in ID-less unit fixtures.
Two workouts at the same timestamp remain distinct. Dates in the UI include
local time for same-day sessions and point inspection.

Use `isPerformedSet`/`isWarmupSet`, `recordReps`, `estimateOneRepMax` and existing
record derivation unchanged. Records exclude warm-ups; general session volume
includes performed warm-ups. Do not reuse working-only PR volume for the
general-volume chart. Keep first-session bests readable without calling them
beaten records; retire the detail's duplicate heaviest timeline or fix it so
`extractPersonalRecords` cannot announce a first-ever beaten record or use a
fictitious pair.

For reclassified exercises, keep raw saved quantities as recorded. Metric
eligibility must inspect those quantities, not manufacture values from the
current tracking type: old reps must not become seconds; time/distance sets
must not feed 1RM merely because they also contain weight. Offer metrics by
current type, leave unsupported older values absent and show original recorded
figures in session evidence. Preserve existing record-type filtering in
`recordValuesOf`; changing record definitions is outside this slice.

## API surface (`apps/api`)

Retain authenticated `GET /progress/exercises` and
`GET /progress/exercises/:exerciseId`; no query parameters or write endpoints.
Responses gain the optional fields above. Detail returns 404 for no owned
performed history, identically for unknown IDs and other users' history;
401 follows 0001, service/database failure remains an error rather than empty.

Select only histories rooted in the requesting user's workouts. Do not add a
catalog-wide join or filter out retired/deleted rows that still have owned
history. For an exercise privately owned by someone else but retained in this
user's saved workout, preserve existing historical name visibility without
adding private aliases, translations, photos or a browsable private catalog
entry. Search metadata may include full names/aliases only for system or
requester-owned exercises; other historical entries search their allowed name.
Verify repository selection as well as route behavior: mocked repository route
tests alone cannot establish ownership or field projection.

## Mobile surface (`apps/mobile`)

### Lookup and navigation

Put a labelled search input and result section directly after the Progress
title. With a nonempty trimmed query, show only matching trained exercises in
the results area and hide overview summaries so results stay immediately
reachable. With an empty query, show recent trained results first and keep
general summaries available below. Rows show localized name, last date and
session count; omit the current independent-max weight/reps preview.

Normalize query and search names with Unicode decomposition, accent removal,
case folding and trimming. Sort by last trained date descending, localized
display name on ties, then ID. Filter already loaded data without requests
per keystroke. Retain query and scroll offset while pushing detail; restore
the offset after focus refresh/layout without jumping back to the title.

Keep the existing Progress detail route for search. Add an exercise-stack
progress route reusing `ExerciseProgressDetailScreen` so opening from exercise
information and native Back remain in that stack. Show its named action even
when no history exists or its optional preview read failed. Empty/error Back
uses `router.back()` when possible, with an explicit origin fallback for deep
links. Workout evidence pushes `/workouts/[workoutId]` with the point's saved
ID, never its date or list index. Returning restores detail controls/scroll.

### Metrics, periods and figures

Introduce pure metric/period helpers and one shared detail body. Supported
metrics/defaults exactly follow FR-6: weighted heaviest/volume/estimated 1RM;
reps-only maximum/working total; duration longest; weighted-duration
heaviest/longest (longest default); distance-duration distance/longest duration
(distance default). Weighted heaviest uses same-set evidence; 1RM retains
existing eligibility/formula. Every choice changes title, units and readout
together; unavailable data shows no points without a fallback metric.

Default to three months. Month/three/six/all use local calendar-day boundaries,
clamping month ends, inclusive start and current local day, with a supplied
clock for tests. Apply one filter to chart and session list. Keep full-history
latest performance before records, explicitly dated, and all-time records
outside the period filter. Chart values may be absent for some listed sessions;
absence never creates a zero. Do not retain the chart helper's default
12-point truncation for this detail: every eligible session in the chosen
period must remain inspectable. Preserve weekly-chart defaults for other users.

Explain volume beside the selector (including performed warm-ups), and 1RM
as a working-set estimate. Use existing kg/lb, distance and readable-duration
formatters for cards, axes/readouts and rows. Independently labelled time,
distance or rep maxima must never read as if from the heaviest evidence set.
Reps-only views have no weight, volume or 1RM placeholders.

Keep chart point selection coherent on metric/period changes: clear selection
or retain by workout identity only if still present. Extend chart entries
additively with workout identity and full date/time inspection. Supply explicit
keyboard/tap previous/next point controls as well as existing screen-reader
point actions; SVG and bar fallback both permit inspection without dragging.
Single points show a value without an implied trend.

### Loading and identity

Use focus reload for overview and detail. Separate first load, refresh error,
successful empty/404 and unsupported older response. Refresh preserves loaded
values, query, metric and period with a visible retry notice; do not let a
failed optional overview summary hide successful exercise results. Changing
controls is local. On exercise/account changes clear incompatible data and
selection; guard overlapping retries/focus/language requests with a request
generation and account/exercise identity. Sign-out/401 uses existing auth flow,
without retaining the previous account's visible history.

No native dependency, permission or module changes; no native rebuild required
for development bundles. Standalone Release delivery still needs its normal
rebundle/build. iOS/Android device behavior is separate acceptance evidence.

## Testing strategy

| Spec AC | Verification |
|---|---|
| AC-1 | Search before summaries at 320 pt; loaded local filter and direct result navigation. |
| AC-2 | Pure normalization/sort plus API authorized names; ES/EN, accents, trim, aliases and duplicate IDs. |
| AC-3 | API evidence regression: 100×5 and 80×12 yields 100×5; tie reps/order and unilateral fixtures. |
| AC-4 | Metric configuration/series tests; weighted default, changed title/units/readout and inline explanations in UI. |
| AC-5 | All five tracking types, reps totals, timed-load chart, duration/distance formatting; absent weighted labels for reps. |
| AC-6 | Local month clamp, leap year, DST/day-end boundaries; chart/list parity and unchanged all-time records/latest. |
| AC-7 | Combined repeated occurrences, stable count/IDs; same-day and identical timestamp workouts; actual saved-workout links. |
| AC-8 | Modern/legacy completion at whole-session scope, warm-up-only history, working maxima vs inclusive volume; record regression suites. |
| AC-9 | Single/empty/all-missing points, more than 12 points, no fallback or first-ever beaten PR; all-time action. |
| AC-10 | Initial error vs 404, successful empty search/clear, refresh failure retaining data/controls, retry/account/stale-request tests. |
| AC-11 | Both origin stacks and native/web Back; query/scroll restoration and session-detail return, including empty-history entry. |
| AC-12 | kg/lb conversions across metric/records/evidence, mixed old quantities, absent values not zeros or new-type reinterpretations. |

FR-1–FR-13 are covered by the AC rows above. Additionally verify EF-1–EF-7,
foreign-account and private-name projection, no writes, large text, themes,
VoiceOver/TalkBack and keyboard operation. Pure helper/route tests and source
checks cannot substitute for navigation, visual and physical-device acceptance.
Run `pnpm -r typecheck` and `pnpm -r test` before implementation commits.

## Files to touch

Paths below are existing unless marked new. Add tests for behavior and failure
boundaries rather than assertions that merely mirror component source text.

- `packages/domain/src/entities.ts` — compatible search/evidence/version DTOs.
- `apps/api/src/features/progress/aggregate.ts` and `aggregate.test.ts` — merged points, evidence, totals, latest and deterministic ordering.
- `apps/api/src/features/progress/repository.ts` — ordered saved evidence and allowed search names.
- `apps/api/src/features/progress/repository.test.ts` (new) — owned query/field projection and deleted/private history.
- `apps/api/src/features/progress/routes.ts` and `routes.test.ts` — additive read response/404/auth compatibility as needed.
- `apps/api/src/features/progress/reclassified.test.ts` — original quantities/record-type regression.
- `apps/mobile/src/features/progress/utils/exerciseSearch.ts` and `.test.ts` (new) — normalization, filtering and order.
- `apps/mobile/src/features/progress/utils/progressMetrics.ts` and `.test.ts` (new) — metric configuration, periods, evidence and display model.
- `apps/mobile/src/features/progress/utils/chartData.ts` and `.test.ts` — identity, reps metrics and complete selected-period series.
- `apps/mobile/src/features/progress/utils/personalRecords.ts` and `.test.ts` — removed with the unused duplicate timeline; typed all-time records remain.
- `apps/mobile/src/features/progress/screens/ProgressOverviewScreen.tsx` — search-first results, preserved position and independent loading.
- `apps/mobile/src/features/progress/screens/ExerciseProgressDetailScreen.tsx` — common detail, controls, latest, records and workout links.
- `apps/mobile/src/features/progress/components/ProgressChart.tsx` and `ProgressBars.tsx` — point inspection/date-time/accessible controls, preserving other callers.
- `apps/mobile/src/features/progress/components/TimedProgress.tsx` — removed after shared detail integration; no remaining callers.
- `apps/mobile/src/features/progress/useExerciseProgress.ts` (new) — focus-bound owned read hook.
- `apps/mobile/src/features/progress/utils/progressResource.ts` and `.test.ts` (new) — pure retry/identity-safe load lifecycle.
- `apps/mobile/src/features/exercises/screens/ExerciseDetailScreen.tsx` — always-available progress action and coherent existing history preview.
- `apps/mobile/src/app/(tabs)/exercises/[exerciseId]/progress.tsx` (new) — exercise-stack detail entry; verify coexistence with `[exerciseId].tsx` and unique route matching.
- `apps/mobile/src/app/(tabs)/exercises/_layout.tsx` — register the exercise-origin progress screen.
- `apps/mobile/src/i18n/locales/es.ts` and `en.ts` — search, metric/period/absence/error/explanation/action copy.
- `docs/sdd/specs/0042-readable-exercise-progress/verification.md` (new during implementation) — source, automated, web and device evidence recorded separately.
- This spec's `spec.md`, `plan.md`, `tasks.md`, `docs/sdd/backlog.md`, `docs/roadmap/04-progress-and-prs.md`, `README.md` and the implementation-sequence review — synchronized status/priority.

## Risks and open questions

- Historical tracking-type snapshots do not exist. Do not claim reconstruction
  of old types: retain original quantities and omit inapplicable metrics.
- Shared/private historical references require deliberately limited search
  metadata; verify current 0015 policy before projecting aliases.
- All-time plots can exceed the old 12-point view. Preserve every eligible
  point and test representative long histories; if rendering becomes unusable,
  record evidence and propose explicit pagination rather than silent truncation.
- Cross-tab return is a real navigation concern, not proved by a route string.
  Verify new exercise-stack route matching and origin return on web/native.
- No blocking product decisions. Defaults remain those in the approved spec.

## Rollout

Deploy the additive API before the new mobile bundle. No migration, data
rewrite or native module rollout. Older bundles ignore new fields and retain
existing contracts; regression-test record, last-time and exercise-info readers.
If rolling back the API, the new detail must show its explicit unavailable
state without fabricated evidence. Rolling back the bundle leaves saved data
untouched. Keep status in progress until API/bundle rollout and actual device
acceptance have evidence; passing local tests is implementation verification.


## Implementation notes — 2026-11-03

- Tasks 1–7 implemented. Metric/period selectors use radio semantics with
  explicit web checked state as well as native accessibility state.
- The shared owned read lifecycle is `useExerciseProgress.ts` with the pure
  `utils/progressResource.ts` controller. It preserves loaded values on
  transient refresh failure, rejects stale generations and clears 401/404 data.
- Removed the now-unused separate timed detail and duplicate heaviest-record
  timeline/helper/tests. The all-time typed record card remains authoritative;
  first-ever bests are not announced as beaten records.
- `RecordsCard` gains an optional stacked value layout for this detail; other
  callers retain their existing layout. Duration figures include min:s or
  h:min:s notation. No schema, native module or dependency changed.
