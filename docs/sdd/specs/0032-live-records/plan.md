---
spec: 0032
status: approved     # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Plan — Live record badges while logging

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | One read endpoint, starting records kept on the draft, badges derived on the phone, a badge under the row, an exercise badge and a short notice. No sound or vibration, no watch or lock-screen badge, no target hints, no reconciling with the saved result, no stored record (spec out of scope). |
| 2 — Template vs performed | yes | Starting records are read from saved performed work and kept on `WorkoutSessionDraft` only. Routines are untouched. |
| 3 — Shared domain types | yes | `StartingRecords` and `LiveRecordHit` are contracts in `packages/domain`. The **per-set record rules** (better side, lifting sets only, Epley 1RM, set volume, reps at or above a weight, strict improvement) move into `packages/domain/src/records.ts` as pure functions with no framework import, and both the API's record derivation and the phone's badges call them — the drift Article 3 warns about is exactly "the phone says record, the summary disagrees". This is the first runtime code in the domain package; see Approach for how each consumer resolves it. |
| 4 — Weight in kg | yes | Starting records arrive in kg; the phone compares in kg, on the weight it would save (`setValuesToSave`: display unit → kg, one decimal), never on the formatted figure (EF-7). Labels go through `formatWeight`. |
| 5 — Prisma migrations | no | No schema change. |
| 6 — Integrations behind interfaces | no | No integration touched; the watch and the live activity are out of scope. |
| 7 — Secrets | no | — |
| 8 — Committable + verified | yes | One commit per task, each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None. No native change, no rebuild: a JS reload ships the phone side. |
| 10 — TODOs over half-solutions | yes | The retry for a failed load (EF-2) is a plain timer while the screen is open, not connectivity detection (no NetInfo dependency); recorded in Risks. |

## Current state (verified in the code)

- **Records** are derived on every read in
  `apps/api/src/features/progress/records.ts` (`deriveExerciseRecords`) from
  the working sets of performed work (`aggregate.ts`: `selectPerformedWork`
  then `buildRecordHistories`, which drops warm-ups and merges an exercise
  logged twice in one workout). The per-set scoring lives in small functions
  there (`heaviestWeight`, `mostReps`, `bestSetVolume`,
  `bestEstimatedOneRepMax`, `longestTime`, `longestDistance`, `repsByWeight`,
  the private `repsAtOrAbove`), plus `recordReps` in `workouts/sides.ts` and
  `estimateOneRepMax` in `records.ts`.
- `ExerciseProgressDetail.records` carries the bests, but most reps at the
  **top three** weights only (`REPS_AT_WEIGHT_TOP`) — not enough for FR-1.
- **The phone** fetches "last time" per exercise in `ActiveWorkoutScreen`
  (held in component state, refetched on reopen) and has no record data
  during a workout. The draft (`workoutDraftStore.ts`) is persisted whole as
  JSON (`activeWorkoutEnvelope.ts`, spec 0010), so any optional field added to
  `WorkoutSessionDraft` survives a restart with no envelope change.
- What a set would save is `setValuesToSave(set, trackingType, unit,
  isUnilateral)`: effective values (typed, else ghosted placeholder), only the
  fields the tracking type logs, weight in kg rounded to one decimal, and for
  a unilateral set `reps` = left + right beside the sides.
- **`packages/domain` is types-only today.** Mobile imports it only for
  types (erased by Babel), so Metro has never bundled it. Verified here with
  `expo export --platform web`: Metro resolves `@workout/domain` through the
  tsconfig path to `src/index.ts`, then **fails on `./auth.js`** (Metro does
  not map a `.js` specifier to a `.ts` file). A file imported through its own
  tsconfig path whose only relative imports are `import type` bundles fine
  (probe module, same export). The API runs compiled JS: Node resolves
  `@workout/domain` to `packages/domain/dist/index.js`, which the Dockerfile
  builds but the API's local `build` script does not.
- Record labels for the summary and progress screens: `describeRecord`
  (`features/progress/utils/recordLabels.ts`), keyed by `RecordType`, unit
  aware. It takes an `ExerciseRecord` (with a `date` it never reads).

## Approach

### 1. One set of rules, in the domain package

`packages/domain/src/records.ts` (pure, `import type` only):

- `recordReps(set)` — better side of a split set, else `reps` (0022).
- `isLiftSet(set)` — no time, no distance (0021).
- `estimateOneRepMax(reps, weightKg)` — Epley, one decimal.
- `SET_RECORD_VALUES: Record<SetRecordType, (set) => number | undefined>` —
  the per-set value of heaviest weight, most reps, best set volume, best e1RM
  (lifting sets only), longest time, longest distance.
- `setVolumeKg(set)` — weight × total reps on a lifting set (session volume
  sums it).
- `repsAtOrAbove(entries, weightKg)` — most reps any entry did at that weight
  or heavier.
- `RECORD_TYPE_ORDER` — the display order (0023).
- Live: `setRecordHits(set, starting)` and `sessionVolumeHit(sets, starting)`
  — strict improvement over the starting value, nothing when there is no
  starting value (FR-7, FR-8), reps at weight only for a weight already
  reached (FR-10).

The API's `records.ts` keeps its structure (best-of-session walk, one
reps-at-weight hit per session) but scores sets through these functions, and
`sides.ts` re-exports `recordReps`. The existing 0013/0021/0022/0023 API tests
are the proof that moving the rules changed nothing.

How each consumer resolves the runtime code:

- **API (Node, compiled):** imports from `@workout/domain` as today; the
  domain's `dist` is built by the Dockerfile already, and the API's `build`
  script now builds it first too (so `pnpm api` works locally). Vitest gets an
  alias to the domain's `src` (it cannot rely on a built `dist`).
- **Mobile (Metro, Vitest):** imports from **`@workout/domain/records`**, a
  tsconfig path straight to `src/records.ts`, never runtime values from
  `@workout/domain` itself (Metro would fail on the index's `.js` re-exports).
  Vitest gets the same alias. Types keep coming from `@workout/domain`.

### 2. Starting records from the server

`GET /progress/starting-records?exerciseIds=a,b,c` (authenticated like the
other progress routes) → `StartingRecords[]`, one per requested id, in request
order. Derived from the same performed work and record histories as the rest
of progress (`buildRecordHistories`, now exported): the last bests of each
single-value type, plus most reps at **every** weight ever lifted (FR-1) —
`deriveExerciseRecords` additionally returns that full map. An exercise never
performed comes back with empty bests ("loaded, nothing to beat", FR-8), which
the phone tells apart from "not loaded" (EF-1). 400 when `exerciseIds` is
missing, empty or has more than 50 ids.

### 3. Kept with the active workout

`WorkoutSessionDraft.startingRecords?: Record<exerciseId, StartingRecords>` —
one optional field on the draft type; everything else lives in a new folder
`features/workouts/liveRecords/`:

- `startingRecordsDraft.ts` (pure): `missingStartingRecordIds(draft)` (ids of
  exercises in the draft with no entry — covers start, add, replace, a draft
  from before this feature (EF-4) and a failed load (EF-2));
  `withStartingRecords(draft, records)` merges without overwriting an entry
  already kept (FR-4) and returns the same reference when nothing changes.
- `useStartingRecords(draft)`: when the missing ids change, fetches them in
  one request and merges into the **current** active workout (same
  `clientId`, read at resolve time); on failure retries every 30 s while the
  screen is open; on a permanent rejection (older server, 404 — EF-3) stops
  for this workout. Errors are swallowed: no badge, nothing else changes
  (EF-1, AC-9).

Entries of removed exercises stay in the map (harmless, and spare a reload if
the exercise comes back); they are not shown because badges derive from the
exercises in the draft.

### 4. Badges are derived, never stored

`liveRecordBadges.ts` (pure): `buildLiveRecordBadges(draft)` →
`{ bySet: Record<setId, LiveRecordHit[]>, sessionVolumeByExercise:
Record<exerciseId, LiveRecordHit> }`. For each set that is done and not a
warm-up (FR-5), it takes `setValuesToSave(...)` (FR-6, EF-6, EF-7, EF-8:
the tracking type and side setting are read from the draft each time) and
calls `setRecordHits` against that exercise's starting records. Session
volume sums `setVolumeKg` over done working sets of every entry of the same
exercise (FR-14). Because the badges are a function of the draft, every way
a set changes — unmark, edit, retype, delete, remove or replace the exercise
— updates them on the next render with no bookkeeping (FR-12, FR-15–FR-19),
and discarding the draft leaves nothing (FR-24).

`recordNotice(previous, next)` (pure): the first set that went from not done
to done between two drafts and has hits → `{ exerciseName, hits }`. Editing a
done set never qualifies (FR-20); hits arriving with a late load do not
either (EF-2); a tick from the watch (0025) does, as the phone screen is
what shows it.

`useLiveRecords(draft)` wraps it: memoised badges, the starting-records
loader, and the notice (cleared after ~2.5 s).

### 5. Display

- `RecordBadge` — a small trophy line under a set row: the first hit's title
  via `describeRecord` and "+N" for the rest, in `RECORD_TYPE_ORDER` (FR-13).
  Placed by the screen under `WorkoutSetRow`, inside the row's existing
  wrapper, so the row component is not edited.
- The exercise header shows the session-volume badge next to the rest chip.
- `RecordNotice` — an absolutely positioned pill near the top,
  `pointerEvents="none"`, fades out on its own; it never touches the rest
  timer (FR-21).
- `describeRecord` accepts a record without a date (type widened only).
- i18n keys under `progress.records` (`liveNotice`, `liveMore`), en + es.

### Alternatives considered

- **Badges stored on the draft sets.** Every mutation (edit, retype, delete,
  replace, tracking-type change) would have to recompute them, in a store
  three other specs are editing in parallel. Deriving is simpler and cannot
  go stale. Rejected.
- **Judge sets on the server.** Needs a connection at the moment of effort
  (spec: offline, instant). Rejected.
- **Reuse `GET /progress/exercises/:id`.** Carries reps at the top three
  weights only, and one request per exercise. Extending it would change a
  response the progress screen reads. Rejected for a dedicated batch read.
- **Copy the rules into the mobile app.** Two copies of "what is a record"
  drift (Article 3). Rejected; they are shared.
- **Import the rules from `@workout/domain` on mobile, with a Metro config
  mapping `.js` to `.ts`.** A new `metro.config.js` changes how the whole app
  bundles, for one module. Rejected for a dedicated tsconfig path.
- **A per-set "best so far in this workout" rule.** Spec FR-12 decided against
  it (badges must not jump between sets).

## Shared contracts (`packages/domain`)

- `StartingRecords { exerciseId; bests: Partial<Record<StartingRecordType,
  number>>; repsAtWeight: Array<{ weightKg; reps }> }` where
  `StartingRecordType = Exclude<RecordType, 'repsAtWeight'>`.
- `LiveRecordHit = Omit<ExerciseRecord, 'date'>`.
- `RecordSetValues` — the set fields the rules read.
- Runtime: the functions listed in Approach §1.

Impact: the API scores records through them (no output change); mobile
consumes them for badges. Additive.

## Data model and migrations

None.

- Migration name: —
- Backfill / data migration needed: no

## API surface (`apps/api`)

- `GET /progress/starting-records?exerciseIds=<comma-separated ids>`
  - 200 `StartingRecords[]` — one per distinct requested id, request order.
  - 400 `{ message: 'Invalid exerciseIds' }` — missing, empty, or > 50 ids.
  - Auth as the other `/progress/*` routes.

## Mobile surface (`apps/mobile`)

- `features/workouts/liveRecords/` (new): `startingRecordsDraft.ts`,
  `liveRecordBadges.ts`, `useStartingRecords.ts`, `useLiveRecords.ts`,
  `RecordBadge.tsx`, `RecordNotice.tsx`, `startingRecordsClient.ts`, tests.
- `workoutDraftStore.ts`: the optional `startingRecords` field (type only).
- `ActiveWorkoutScreen.tsx`: one hook call, the badge under each row, the
  exercise badge, the notice. No handler changes.
- `recordLabels.ts`: parameter type widened.
- `i18n/locales/{en,es}.ts`: two keys.
- `tsconfig.json`, `vitest.config.ts`: the `@workout/domain/records` path.
- No native rebuild.

## Testing strategy

Unit (vitest): API — the moved rules through the existing records tests, the
full reps-at-weight map, `buildStartingRecords` (warm-ups excluded, performed
only, never-performed exercise, two entries in one workout), route (200 order,
400s). Mobile — `missingStartingRecordIds` / `withStartingRecords`,
`buildLiveRecordBadges` against the spec's scenarios, `recordNotice`.
Bundle: `expo export --platform web` to prove Metro resolves the shared module.
Node: the built API imports the domain's `dist` at runtime.

| Spec AC | Verified by |
|---|---|
| AC-1 | badges test (100 × 8 vs 100 × 6 → repsAtWeight 100) + notice test |
| AC-2 | badges test (unmarked → none); notice test (unmark → none) |
| AC-3 | badges test (edit 8 → 6 → 8); notice test (edit → no notice) |
| AC-4 | badges test (two sets both badged; unmark second keeps first) |
| AC-5 | badges test (warm-up → none; retyped → heaviestWeight) |
| AC-6 | badges test (session volume crossing 5,000 both ways) |
| AC-7 | badges test (empty starting records → none) |
| AC-8 | draft test (records kept on the draft, survive serialize/parse) + [DEVICE] |
| AC-9 | hook swallows errors; badges test (no starting records → none) + [DEVICE] |
| AC-10, AC-11 | by construction: no write path (no endpoint writes, nothing stored); [DEVICE] |
| AC-12 | badges test (time tracking 75 s vs 60 s → longestTime) |
| AC-13 | badges test (unilateral 11 L / 8 R at 20 kg vs 10 → repsAtWeight) |
| AC-14 | badges test (ghosted reps placeholder) |

## Files to touch

- `packages/domain/src/records.ts` (new), `packages/domain/src/index.ts`
- `apps/api/package.json` (build script), `apps/api/vitest.config.ts`
- `apps/api/src/features/progress/{records,records.test,aggregate,routes,routes.test,repository}.ts`,
  `startingRecords.ts` + test (new)
- `apps/api/src/features/workouts/sides.ts`
- `apps/mobile/tsconfig.json`, `apps/mobile/vitest.config.ts`
- `apps/mobile/src/features/workouts/liveRecords/*` (new)
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts` (one field)
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx`
- `apps/mobile/src/features/progress/utils/recordLabels.ts`
- `apps/mobile/src/i18n/locales/{en,es}.ts`
- `docs/sdd/specs/0032-live-records/*`

## Risks and open questions

- `TODO(sdd): EF-2 retries on a 30 s timer while the workout screen is open,
  not on a connectivity event — no NetInfo dependency (Article 9). Switch to
  a connectivity listener if one is added for roadmap area 8.`
- **Parallel work (0029, 0030, 0031, 0015).** `ActiveWorkoutScreen.tsx`,
  `workoutDraftStore.ts` and the locales are shared. Edits there are
  additive and small: one optional type field, one hook call and three JSX
  insertions, two keys inside `progress.records`.
- **First runtime code in `packages/domain`.** A future mobile file that
  imports a runtime value from `@workout/domain` (not `/records`) will break
  the Metro bundle; the comment at the top of `records.ts` and in
  `tsconfig.json` says so. An API started from a stale build without the
  domain's `dist` fails at import — the build script now builds it.
- **Server/phone agreement is by rules, not by result.** The summary still
  reports one reps-at-weight hit per session and judges the session as a
  whole; the phone badges every set that beat the starting records (spec
  FR-12, FR-23 accept the difference).
- **EF-5** (another workout saved meanwhile) is accepted: badges may be stale.

## Rollout

1. API redeploy (owner): new read endpoint; nothing else changes.
2. App: JS reload. On an older API the request 404s → no badges, logging
   unchanged (EF-3).

Rollback: revert the app commits; the endpoint can stay.

## Assumptions

- **[ASSUMPTION: the starting records for an exercise are its records at the
  moment they are first loaded during the workout]** — normally the start;
  later for an added exercise or a failed load. Nothing saved in between can
  come from this workout, so this equals "at start" except under EF-5.
- **[ASSUMPTION: the per-set badge lists all types beaten, display order
  0023; the first is named, the rest counted ("+2").]**
- **[ASSUMPTION: the notice also shows for a set ticked from the watch, on
  the phone screen.]**
- **[ASSUMPTION: the notice lasts about 2.5 s.]**
