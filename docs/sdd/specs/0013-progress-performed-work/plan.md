---
spec: 0013
status: approved     # approved by the owner, 2026-09-24
created: 2026-09-24
---

# Plan — Progress counts only performed work

How `spec.md` gets built. This is where technology belongs.

## Current state (verified 2026-09-24)

- `apps/api/src/features/progress/repository.ts` → `loadSessionInputs` maps
  every set of every session to `{ reps, weightKg }`. It drops `completedAt`,
  `type` and `isWarmup`, so the aggregation cannot tell performed from
  unperformed, or warmup from working.
- `apps/api/src/features/progress/aggregate.ts` (pure, unit-tested):
  - `buildAccumulators` computes `bestWeightKg`, `bestReps`,
    `estimatedOneRepMax` and `totalVolume` from all sets.
  - `sessionVolume` (weekly) and `buildMuscleGroupVolume` sum all sets.
  - `toSummary` derives `isRecordSession` and personal bests from the points.
- `apps/api/src/features/workouts/repository.ts`:
  - `getExerciseLastPerformance` → `findFirst` of the most recent
    `WorkoutExercise` for the exercise, returning **all** its sets.
  - `mapWorkoutSession` returns sets with `completedAt` and nothing derived.
  - Route tests mock the whole repository, so query logic is not covered by CI
    today.
- Mobile:
  - `WorkoutHistoryScreen.sessionVolume` and `WorkoutSessionDetailScreen`
    (`isDone`, `summarize`, `exerciseVolume`) already count only sets with
    `completedAt`; a legacy session shows volume 0 and every set as ○.
  - `WorkoutSummaryScreen` renders `set.reps || '-'` / `set.weightKg || '-'`
    from the draft, so placeholder-logged sets show "–". It already calls
    `toWorkoutSessionSkeleton`, which computes the effective values (kg).
  - `extractPersonalRecords` (mobile) walks the API's per-session points, so it
    follows the API fix with no change.
- Label: `progress.volumeByMuscleGroup` ("Volume by muscle group" /
  "Volumen por grupo muscular"), used only by `MuscleDistribution.tsx`.
- `packages/domain` contains types only, no runtime functions.
- A warmup is `type === 'warmup'`; older rows may only have `isWarmup = true`.
  Both must be read.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | No change to the draft, what gets saved, or stored rows (FR-8). History-list set count and real muscle data stay out (spec out-of-scope). |
| 2 — Template vs performed | yes | Reads performed data only; routines untouched. |
| 3 — Shared domain types | yes | `WorkoutSet.performed?: boolean` added in `packages/domain`. The *rule* lives once, in the API; mobile reads the flag and only falls back to `completedAt` for an older API. |
| 4 — Weight in kg | yes | Aggregates stay in kg. The summary formats kg through `formatWeightValue`, like the detail screen. |
| 5 — Prisma migrations | no | No schema change, no data change: progress is derived. |
| 6 — Integrations behind interfaces | no | |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Domain → API rule → progress → last performance → mobile; each commit green. |
| 9 — Dependencies | no | None added. |
| 10 — TODOs over half-solutions | yes | The "last time" look-back window is bounded (see Risks). |

## Approach

**One rule, in one place: the API.** A new pure module
`apps/api/src/features/workouts/performedSets.ts` owns what "performed" and
"warmup" mean:

- `isLegacySession(sets)` — no set in the whole session has `completedAt`.
- `isPerformedSet(set, legacy)` — `legacy || completedAt != null`.
- `isWarmupSet(set)` — `type === 'warmup' || isWarmup === true`.

Everything else calls these helpers:

1. **Progress.**
   - `loadSessionInputs` passes the raw flags through: each set gains
     `completedAt`, `type` and `isWarmup`.
   - A new pure `selectPerformedWork(sessions)` in `aggregate.ts` keeps only
     performed sets and drops exercise entries left with none (no empty point
     drags a chart down).
   - The repository calls it once before every builder.
   - In `buildAccumulators`: best weight, best reps and estimated 1RM read
     performed non-warmup sets; `totalVolume` reads all performed sets
     (FR-1, FR-3, FR-4).
   - An exercise-session with only warmups yields a point with volume and
     undefined bests (EF-1). `toSummary` and `extractPersonalRecords` already
     ignore undefined.
   - Weekly volume and volume by category inherit the filtering, so no builder
     needs its own copy of the rule.
2. **"Last time"** (FR-2, EF-2).
   - `getExerciseLastPerformance` fetches the 10 most recent
     `WorkoutExercise` rows for the exercise. For each row it selects its sets
     plus whether its session has *any* completed set (one nested
     `exercises: { where: { sets: { some: { completedAt: { not: null } } } }, take: 1 }`).
   - A pure `pickLastPerformance(candidates)` returns the first candidate with
     performed sets, those sets only, or `null`. Warmups are kept, per the
     spec's assumption.
   - The query stays trivial; the decision is unit-tested.
3. **History and detail** (FR-5).
   - `mapWorkoutSession` sets `performed` on each returned set, using the same
     helpers.
   - Mobile reads `performed` through `isPerformedSet(set)` =
     `set.performed ?? Boolean(set.completedAt)` (fallback for an older API),
     in `WorkoutHistoryScreen` and `WorkoutSessionDetailScreen`.
4. **Summary** (FR-6). `WorkoutSummaryScreen` renders the skeleton it already
   builds: effective reps, weight in kg formatted into the session unit with
   `formatWeightValue`. It no longer reads the raw draft strings.
5. **Label** (FR-7). Rename the key to `progress.volumeByCategory`: "Volume by
   category" / "Volumen por categoría". Both catalogs are type-checked against
   `TranslationCatalog`, so a missed rename fails `typecheck`.

### Alternatives considered

- **Filter in the progress loader only** — rejected. The builders' tests would
  not cover the rule, and "last time" and history would each need their own
  copy.
- **Put the rule in `packages/domain` as a function both apps import** —
  rejected for now. It would be the first runtime code in a types-only
  package, and the mobile only needs the *result*. The server-computed
  `performed` flag keeps a single implementation.
- **Duplicate the legacy rule in the mobile** — rejected (Article 3 in spirit:
  two copies of one rule drift).
- **A Prisma relation filter for the whole "last time" rule** (legacy OR
  completed, in SQL) — rejected. It would be correct but untestable in CI,
  because route tests mock the repository. The pure picker covers the logic.
- **Stop saving unmarked sets** — rejected by the owner (spec, resolved
  decision 1).

## Shared contracts (`packages/domain`)

- `WorkoutSet.performed?: boolean`. Derived by the server on read: true when the
  set was marked done, or it belongs to a legacy session. Never sent by
  clients, never stored.
  - Impact on the API: set in `mapWorkoutSession`; `CreateWorkoutSessionInput`
    is unchanged.
  - Impact on mobile: history and detail read it, with a fallback to
    `completedAt`. The `toWorkoutSessionSkeleton` summary omits it; it does not
    need it.

## Data model and migrations

None. Backfill: no — every figure is recomputed on read (spec NFR).

## API surface (`apps/api`)

No new endpoints; responses change content, not shape (apart from the added
optional field):

| Operation | Change |
|---|---|
| `GET /progress/exercises`, `/progress/exercises/:id`, `/progress/weekly-volume`, `/progress/muscle-distribution` | Derived only from performed sets; warmups excluded from bests/1RM/records, included in volume |
| `GET /workouts/exercises/:exerciseId/last` | Only performed sets; falls back to an older workout; `404` when none of the last 10 has any |
| `GET /workouts`, `GET /workouts/:id` | Each set carries `performed` |

## Mobile surface (`apps/mobile`)

- `WorkoutHistoryScreen` (`sessionVolume`), `WorkoutSessionDetailScreen`
  (`isDone` → `isPerformedSet`): legacy sessions count as performed.
- `WorkoutSummaryScreen`: render from the skeleton with the display helpers.
- `MuscleDistribution.tsx` + `i18n/locales/en.ts`, `es.ts`: label.
- New `features/workouts/utils/performedSet.ts` (+ test): `isPerformedSet`.
- No native rebuild: Metro reload.

## Testing strategy

| Spec AC | Verified by |
|---|---|
| AC-1 | Unit (`aggregate.test.ts`): 1 of 4 sets done → point volume/best/1RM from that set only. Device. |
| AC-2 | Unit (`performedSets.test.ts`): `pickLastPerformance` returns only performed sets, skips a candidate with none (EF-2). Device. |
| AC-3 | Unit: performed warmup above prior best → no record, volume includes it (weekly and per category). |
| AC-4 | Unit: legacy session counts fully in `selectPerformedWork` and in the performed flags. Mobile unit: `isPerformedSet` fallback. Device: history of an old workout, if one exists. |
| AC-5 | Unit: unperformed sets with values are ignored. Device: progress figures drop on the real history after deploy. |
| AC-6 | Device: finish with a placeholder-only set → summary shows the value. |
| AC-7 | `pnpm -r typecheck` (catalog shape) + visual check in ES and EN. |

Existing tests are updated: the aggregation fixtures gain `completedAt` on
their sets, or they become legacy sessions, which keeps today's expectations
valid.

## Files to touch

- `packages/domain/src/entities.ts`: `WorkoutSet.performed?`
- `apps/api/src/features/workouts/performedSets.ts` (new) + `performedSets.test.ts`: rule + `pickLastPerformance`
- `apps/api/src/features/workouts/repository.ts`: `performed` in `mapWorkoutSession`; "last time" query + picker
- `apps/api/src/features/progress/repository.ts`: pass `completedAt` / `type` / `isWarmup`; call `selectPerformedWork`
- `apps/api/src/features/progress/aggregate.ts` + `aggregate.test.ts`: `selectPerformedWork`, warmup-aware bests
- `apps/mobile/src/features/workouts/utils/performedSet.ts` (new) + test
- `apps/mobile/src/features/workouts/screens/WorkoutHistoryScreen.tsx`, `WorkoutSessionDetailScreen.tsx`, `WorkoutSummaryScreen.tsx`
- `apps/mobile/src/features/progress/components/MuscleDistribution.tsx`, `apps/mobile/src/i18n/locales/en.ts`, `es.ts`
- `docs/roadmap/04-progress-and-prs.md`, `docs/sdd/specs/0006-retro-progress/spec.md` (behaviour + invariant), `docs/sdd/backlog.md`

## Risks and open questions

- **"Last time" look-back window.** Only the 10 most recent workouts containing
  the exercise are examined. Every workout must have at least one completed
  set, but not necessarily for this exercise, so ten in a row without a
  performed set of it would show nothing. Acceptable; the window is a named
  constant.
  `TODO(sdd): raise the window or move to a paged look-back only if "last time"`
  `is seen missing in practice.`
- **Progress figures will visibly drop** on the owner's history after deploy.
  That is the fix, not a regression. The roadmap note states it, so it does
  not look like data loss.
- **Legacy sessions are uncounted.** Probably zero or a handful (completion
  started saving the same day workouts did). The rule costs nothing either way.
- **Performance.** The progress loader already reads every session; the added
  fields do not change the query count. "Last time" goes from 1 row to at most
  10. Negligible at this data size.

## Rollout

1. Deploy the API (`DOCKER_CONTEXT=docker-ts ./scripts/run.sh backend`). No
   migration. Progress, "last time" and the `performed` flags change for every
   client at once.
2. Reload the app (Metro). The history/detail legacy fix and the summary fix
   ship here. A new app against an old API falls back to `completedAt`; an old
   app ignores `performed`. Both directions work.

Rollback: redeploy the previous image and revert the mobile commits. Nothing
was written, so nothing needs undoing.
