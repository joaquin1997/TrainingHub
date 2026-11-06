---
spec: 0053
status: approved
created: 2026-11-03
---

# Plan — Group records by exercise

Self-reviewed against the constitution and the owner's spec review. Tasks 1–3 are implemented locally; no deployment or device acceptance.

## Constitution check

| Article | Compliance |
|---|---|
| 1 | Summary grouping only; no new Progress screen or record algorithm. |
| 2 | Reads saved performed records, never changes templates/history. |
| 3 | Existing domain DTOs reused; grouping remains view model. |
| 4 | Existing record formatters preserve unit semantics. |
| 5 | No schema change. |
| 6 | No provider/native changes. |
| 7 | No extra personal logging. |
| 8 | Pure grouping, UI composition and acceptance independently committable. |
| 9 | No new dependency or native rebuild. |
| 10 | Missing order/error state/retired identities explicitly handled. |
| 11 | Existing authenticated record read and account lifecycle retained. |

## Current code and approach

`WorkoutSummaryScreen` passes a flat `SessionRecord[]` into RecordsCard with
exerciseName repeated in metadata. Exercise progress reuses that card for one
exercise. Keep its single-exercise API stable and add an explicit grouped
variant/composition for the summary rather than globally regroup every card.

A pure `groupSessionRecords(records, savedExercises)` helper returns an ordered
array of {exerciseId, exerciseName, records}. Use stable exercise ID as key,
ordered by first occurrence in the saved workout; repeated occurrences merge
within that ID, distinct IDs never merge by label. A missing ordering reference
retains response encounter order after known exercises and keeps the record
identifiable. Keep record-type priority from domain RECORD_TYPE_ORDER, then
existing date order and stable input order on a tie. Do not deduplicate distinct
record entries unless their source contract actually identifies duplicates.

Render a single exercise heading (optionally labelled count) and existing
record rows below it, initially all visible. Preserve values, supporting sets,
dates and existing evidence actions, but drop repeated per-row exercise captions.
Keep single-exercise Progress and share text/card unchanged. Existing summary
celebration uses the unchanged historical record count; grouping triggers no
new celebration. Last-session improvements from 0048, if displayed adjacent,
retain their separate label and never enter this array or count.

The summary currently catches a record fetch error without presenting it.
Add explicit load/error state with Retry and generation guards, retain loaded
groups on failure, and only treat a successful empty response as no records.
Use the authoritative saved workout response/order already supplied by 0050.
No additional whole-history request just for grouping.

### Alternatives considered

- Group by exerciseName: merges distinct catalog exercises/translations.
- Collapse groups by default: adds navigation to a small result set.
- Rework all Progress/share presentation: outside accepted summary scope.

## Contracts, schema and API

No new shared data contract, route or migration. Grouping is a local view model
of existing SessionRecord and WorkoutSession data, not a persisted record type.
Auth/read errors follow existing client session behaviour. No native rebuild.

## Verification mapping

| Criteria | Checks |
|---|---|
| AC-1–AC-3 | 3+2 records, first occurrence order, repeated ID merged, identical names/distinct IDs separate, no dropped entries. |
| AC-4 | ES/EN, kg/lb, theme and large-text visual check; existing label formatting reused. |
| AC-5 | Existing evidence links correct; semantic headings followed by type/value/date; no new celebration on grouping/retry. |
| AC-6 | Empty success vs failed load/retry, preserve loaded groups, retired/deleted names/history retained. |
| AC-7 | Improvement-only feedback never increases PR groups/count. |

Pure helper tests cover identity/order/count preservation, not implementation-
mirroring snapshots. Verify actual summary at 320 pt and large text plus screen
reader reading order; Progress/share visual regression check remains manual.

## Files to touch

- New `apps/mobile/src/features/progress/utils/groupSessionRecords.ts`, tests.
- `apps/mobile/src/features/progress/components/RecordsCard.tsx` row extraction
  if required; new `GroupedRecordsCard.tsx` composition.
- `apps/mobile/src/features/workouts/screens/WorkoutSummaryScreen.tsx` and
  `WorkoutSessionDetailScreen.tsx` (existing multi-exercise section, FR-3).
- ES/EN group-count/retry labels; docs/roadmap/backlog.

## Risks and rollout

No dependency on 0049 storage or 0050 correction to render existing records.
Keep current caller interface until grouped summary is wired. Bundle-only
rollout; rollback restores flat presentation without any data transformation.
Prefer 0048 first so wording is final, but grouping itself uses existing saved
PRs and can land independently. Device acceptance remains required for layout.

## Implementation notes — 2026-11-05

The summary and saved detail now use the shared grouped card. Each group has
one exercise heading, a labelled record count and every existing record row;
the summary evidence button targets the authoritative saved-session ID.
The per-exercise RecordsCard interface and share builders remain unchanged.
Both screens use the existing generation-guarded focus resource, retaining
loaded results on ordinary refresh failure and clearing rejected identities.
The summary retains its existing workout celebration identity.

0053 introduces no schema/API/native changes. This checkout also contains
0050, whose migration and API must precede combined app delivery; see its
verification. Layout, screen-reader and actual navigation acceptance remain
pending, not inferred from compilation or pure tests.
