---
spec: 0023
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Plan — Personal records by type

Records stay derived on the server from stored sets (no migration). One new
pure module computes them, one new read endpoint lists the records each
workout beat, and three mobile screens show them.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Five record types for weight & reps sets, as the spec lists. No time/distance records (0021), no per-side records (0022), no celebration beyond a marker. The record module is a list of small pure functions so those specs can add to it, but nothing is built for them now. |
| 2 — Template vs performed | yes | Records read only `WorkoutSession` / `WorkoutExercise` / `WorkoutSet`. Routines are not read. |
| 3 — Shared domain types | yes | `RecordType`, `ExerciseRecord`, `SessionRecords` live in `packages/domain/src/entities.ts`; both apps import them. No framework type enters the package. |
| 4 — Weight in kg | yes | Every record value that is a weight or a volume is kg in the contract. The mobile formats them with `formatWeightValue` in the display unit (FR-5). Rep counts are unitless. |
| 5 — Prisma migrations | no | Nothing stored. `WorkoutSession.clientId` and `publicId` already exist. |
| 6 — Integrations behind interfaces | no | |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Four code commits (records in the API → per-workout endpoint → exercise screen → summary and History), each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None added. |
| 10 — TODOs over half-solutions | yes | 0021/0022 adaptations are listed under Risks, not stubbed in code. |

## Current state (verified in the code)

- **Aggregation.** `apps/api/src/features/progress/aggregate.ts` is pure and
  unit-tested. `selectPerformedWork` (0013) keeps performed sets only;
  `buildAccumulators` builds one `ExerciseProgressPoint` per exercise entry per
  session, excluding warm-ups (`isWarmupSet`) from best weight, best reps and
  Epley 1RM, but including them in `totalVolume`.
- **The only record.** `toSummary` sets `isRecordSession` when the latest
  session's heaviest working weight beats every earlier one. The overview shows
  it as a "PR" chip and the exercise screen as "Recent PR". The exercise
  screen's "Personal records" card is `extractPersonalRecords`
  (mobile, pure): the heaviest-weight timeline.
- **Exercise screen tiles.** "Best" shows `personalBestWeightKg` with
  `personalBestReps` as caption, but the two come from different sets.
- **Summary.** `WorkoutSummaryScreen` renders the in-memory draft kept by
  `saveCompletedWorkout`, after `POST /workouts` succeeded. The draft carries
  `clientId`, not the server id (the active screen discards the response, and
  0018 edits that screen in parallel).
- **History.** `WorkoutHistoryScreen` lists `GET /workouts`; the detail reads
  `GET /workouts/:id` (`id` = `publicId`). No record information.
- **Sessions are loaded whole.** Every progress endpoint loads all of the
  user's sessions through `loadSessionInputs`; the dataset is one person's
  history.

## Approach

### Record types (pure, one function each)

New `apps/api/src/features/progress/records.ts`. Input: for one exercise, its
sessions in chronological order, each with its **working sets** (performed,
not warm-up — FR-1). Two kinds of record:

1. **Single-value records**, each a pure `(sets) => RecordCandidate | undefined`
   in a table keyed by `RecordType`:
   - `heaviestWeight` — max `weightKg` (> 0); keeps that set's reps.
   - `mostReps` — max `reps` (> 0); keeps that set's weight.
   - `bestSetVolume` — max `weightKg × reps`; keeps weight and reps.
   - `bestSessionVolume` — Σ `weightKg × reps` over the working sets.
   - `bestEstimatedOneRepMax` — max Epley (moved from `aggregate.ts`, same
     formula and rounding); keeps weight and reps.

   Walking sessions in order with a running best per type: a session **beats**
   a type when its value is strictly greater than the best of earlier sessions
   *and an earlier best exists* (EF-1: the first session — or the first one
   with a value of that type — beats nothing). The current best carries the
   date of the session that first reached it (ties keep the earlier date).

2. **Reps at weight** (`repsAtWeight`, FR-2). Per session, the best reps at
   each distinct weight. A session beats it at weight *w* when its reps at *w*
   exceed the most reps any earlier set did at *w* **or heavier**, and some
   earlier set was at *w* or heavier. That makes 100 × 8 after 100 × 6 a
   record (AC-1), keeps 95 × 6 after 100 × 8 from being one, and leaves a
   brand-new heaviest weight to `heaviestWeight`.
   **[ASSUMPTION: a session announces at most one reps-at-weight record per
   exercise — at the heaviest weight where it beat one — to keep the summary
   short.]** Current bests: the person's **three heaviest distinct weights**
   (spec assumption), each with its most reps and the date first reached.

The module returns, per exercise, `{ bests: ExerciseRecord[], hitsBySession }`.
`aggregate.ts` uses it in three places:

- `ExerciseProgressDetail.records` — the current bests (FR-2, FR-3).
- `isRecordSession` — now true when the latest session beat **any** type
  (the overview marker). The domain comment changes accordingly.
- `buildSessionRecords` — the records each workout beat, for the new endpoint.

Sessions are grouped by session, not by exercise entry, so an exercise logged
twice in one workout is one session for records. `ProgressSessionInput` gains
optional `workoutId` and `clientId`, filled by the repository.

### Session volume excludes warm-ups

FR-1 says every record type uses working sets only. The session-volume record
therefore sums working sets, while the "Volume" shown on the session and in the
chart includes warm-ups (unchanged). **[ASSUMPTION: the session-volume record
can read lower than the session's displayed volume when it had warm-ups.]**

### Records a workout beat (FR-4)

`GET /progress/session-records` → `SessionRecords[]`, one entry per workout
that beat at least one record: `{ workoutId, clientId?, records }`, where each
record names its exercise. The summary matches on `clientId` (what the draft
has), History on `workoutId`. One endpoint serves the summary, the History
list and the History detail.

### Mobile

- **Labels.** `describeRecord(record, unit, t)` (pure, tested) returns the
  type's title — "Most reps at 100 kg" — and its value in the display unit
  — "8 reps", "2,400 kg", "100 kg × 6".
- **Exercise progress screen (FR-3).** A new "Records" card
  lists each type's current best with its date, then "Most reps by weight" for
  the top three weights. The existing heaviest-weight timeline stays, retitled
  "Heaviest weight over time" so the two cards are not both called records.
  The "Best" tile's caption uses the heaviest set's own reps (fixes the
  mismatch above, now that the record carries them).
- **Summary.** After mount it fetches the session records and shows a
  "Records" card for the entry whose `clientId` matches; nothing on failure or
  none.
- **History list.** Fetches the session records next to the list (a failure
  only hides the markers) and shows a trophy chip "N records" on entries that
  beat any. **[ASSUMPTION: the list shows a count; the entry's detail names
  them.]**
- **History detail.** The same "Records" card as the summary, for its
  `workoutId`.
- **Overview.** Unchanged code; the "PR" chip now reflects any type.

### Alternatives considered

- **Compute records on the device from progress points.** The points are per
  session aggregates (best weight, best reps from different sets), so reps at a
  weight and set volume cannot be derived from them, and History would need
  every exercise's progress loaded. Rejected.
- **Return the records inside `POST /workouts` and `GET /workouts`.** Couples
  the workout endpoints to progress aggregation and needs the active workout
  screen (0018 is editing it) to keep the response. Rejected.
- **Store records in a table.** The spec says derived, never stored, and
  stored records go stale on any history change (EF-2). Rejected.
- **Reps at weight by exact weight only.** Then 95 × 6 after 100 × 8 would be a
  "record" and every first use of a lighter weight would be one. Rejected for
  the "at w or heavier" rule.
- **One record per reps-at-weight weight beaten.** Noisy in the summary.
  Rejected for one per exercise (assumption above).

## Shared contracts (`packages/domain`)

```ts
export type RecordType =
  | 'heaviestWeight' | 'mostReps' | 'repsAtWeight'
  | 'bestSetVolume' | 'bestSessionVolume' | 'bestEstimatedOneRepMax';

export interface ExerciseRecord {
  type: RecordType;
  /** kg for weight, volume and 1RM types; reps for mostReps / repsAtWeight. */
  value: number;
  /** The set behind it, when one set made it (repsAtWeight: the weight). */
  weightKg?: number;
  reps?: number;
  date: ISODateString;
}

export interface SessionRecord extends ExerciseRecord {
  exerciseId: EntityId;
  exerciseName: string;
}

export interface SessionRecords {
  workoutId: EntityId;
  clientId?: string;
  records: SessionRecord[];
}
```

`ExerciseProgressDetail` gains `records?: ExerciseRecord[]` (optional: absent
from older servers). Additive only; the API fills it, the mobile reads it with
a fallback.

## Data model and migrations

None.

- Migration name: —
- Backfill / data migration needed: no

## API surface (`apps/api`)

- `GET /progress/exercises/:exerciseId` — response gains `records`.
- `GET /progress/exercises` — `isRecordSession` now means "beat any type".
- **New** `GET /progress/session-records` — authenticated like the other
  progress routes; `200` with `SessionRecords[]` (empty array when none).

## Mobile surface (`apps/mobile`)

- `progressClient.sessionRecords()`.
- `features/progress/utils/recordLabels.ts` (+ test): `describeRecord`.
- `features/progress/components/RecordsCard.tsx`: rows of trophy + title +
  value (+ date or exercise name), used by the exercise screen, the summary
  and the History detail.
- `ExerciseProgressDetailScreen`, `WorkoutSummaryScreen`,
  `WorkoutHistoryScreen`, `WorkoutSessionDetailScreen`.
- i18n en/es: record type titles and values, card titles, "N records".
- No native rebuild.

## Testing strategy

Unit tests (vitest) on `records.ts` and `aggregate.ts`: each type's best and
date; strict improvement only; EF-1; warm-ups ignored (AC-3); reps at weight
(AC-1 and the 95 × 6 case); top three weights; one reps-at-weight hit;
session-volume hit (AC-2); session grouping; `isRecordSession` on a reps-only
improvement. Route test for the new endpoint. `describeRecord` per type in kg
and lb (FR-5). Web preview for the screens.

| Spec AC | Verified by |
|---|---|
| AC-1 | `records.test.ts` (100 × 6 → 100 × 8 beats reps at 100 kg; detail best 8). Web preview: second workout's summary says "Most reps at 100 kg", exercise screen shows 8 reps. |
| AC-2 | `records.test.ts` (highest session volume → `bestSessionVolume` hit). Web preview: History detail shows "Best session volume"; list shows the chip. |
| AC-3 | `records.test.ts` / `aggregate.test.ts` (heavier warm-up → no hit, no best). |

## Files to touch

- `packages/domain/src/entities.ts` — record types; `records` on the detail;
  `isRecordSession` comment.
- `apps/api/src/features/progress/records.ts` (+ `records.test.ts`) — new.
- `apps/api/src/features/progress/aggregate.ts` (+ test) — use records;
  `buildSessionRecords`; `workoutId` / `clientId` on the input.
- `apps/api/src/features/progress/repository.ts` — ids on the input;
  `listSessionRecords`.
- `apps/api/src/features/progress/routes.ts` (+ test) — new route.
- `apps/mobile/src/features/progress/api/progressClient.ts`.
- `apps/mobile/src/features/progress/utils/recordLabels.ts` (+ test) — new.
- `apps/mobile/src/features/progress/components/RecordsCard.tsx` — new.
- `apps/mobile/src/features/progress/screens/ExerciseProgressDetailScreen.tsx`.
- `apps/mobile/src/features/workouts/screens/WorkoutSummaryScreen.tsx`,
  `WorkoutHistoryScreen.tsx`, `WorkoutSessionDetailScreen.tsx`.
- `apps/mobile/src/i18n/locales/en.ts`, `es.ts`.
- `docs/sdd/specs/0023-records-by-type/*` — status and progress log.
  (Backlog, roadmap 04 and glossary updates go to the coordinator.)

## Risks and open questions

- **0021 (tracking types)** will need: `heaviestWeight`, `bestSetVolume`,
  `bestSessionVolume`, `bestEstimatedOneRepMax` and `repsAtWeight` only for
  weight-and-reps exercises; `mostReps` also for reps-only; new single-value
  types (longest time, longest distance, best pace; heaviest weight for
  weight & time) added as new entries in the type table, with `value` in
  seconds or metres. The records module would then pick the table by the
  exercise's tracking type. `describeRecord` gains the matching labels.
- **0022 (unilateral)** will need a rule for whether set volume, session
  volume and reps count per side or summed; `mostReps` and `repsAtWeight` would
  likely read per side.
- **Lb-entered weights.** Weights typed in lb are stored as converted kg, so
  "the same weight" in lb is the same kg value and groups correctly. A
  person who switched units mid-history could have 45 lb ≈ 20.4 kg next to
  20 kg as two weights; acceptable.
- **Cost.** The new endpoint loads all sessions, like every progress endpoint.
  `TODO(sdd): if history grows large, scope session-records to a workout id —
  unblocked by a measured slow response.`
- **Summary and an older server.** The endpoint 404s, the summary shows no
  card: same as today.

## Rollout

API first (additive endpoint and field), then the app. An older app ignores
`records` and never calls the new endpoint; a newer app on an older API
shows no records cards. No native rebuild; Metro reload or JS update. Roll
back by reverting the commits; nothing persisted.
