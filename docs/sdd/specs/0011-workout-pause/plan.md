---
spec: 0011
status: approved     # approved with the Live Activity plan, 2026-09-24
created: 2026-09-24
---

# Plan — Pause the active workout

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Workout clock only; rest timer and auto-pause out of scope. |
| 2 — Template vs performed | yes | Field lives on `WorkoutSession` only, never on `Routine`. |
| 3 — Shared domain types | yes | `pausedSeconds?` added in `packages/domain`. |
| 4 — Weight in kg | no | |
| 5 — Prisma migrations | yes | Additive migration, default 0. |
| 6 — Integrations behind interfaces | no | |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Contract → migration/API → mobile; each green. |
| 9 — Dependencies | no | None added. |
| 10 — TODOs over half-solutions | no | |

## Approach

Draft gains `pausedAt?: string` (set while paused) and `pausedSeconds?: number`
(finished pauses). Pure helpers in the draft store: `pauseWorkout(d, now)`,
`resumeWorkout(d, now)` (idempotent), `totalPausedSeconds(d, end)` (includes an
ongoing pause). `lib/format.ts` gets `activeDurationSeconds(startIso, endIso,
pausedSeconds = 0)` built on `durationSecondsBetween`. `useElapsedSeconds`
accepts `{ pausedAt, pausedSeconds }`.

`toCreateWorkoutSessionInput` sends `pausedSeconds = min(totalPausedSeconds(d,
completedAt), completedAt − startedAt)`.

### Alternatives considered

- **Shift `startedAt` forward by the paused time** — rejected: falsifies when the
  workout started.
- **Store `activeDurationSeconds` instead of paused time** — rejected: paused
  time with default 0 needs no backfill and keeps old rows correct.
- **Display-only pause** — rejected by the owner (2026-09-24).

## Shared contracts (`packages/domain`)

- `CreateWorkoutSessionInput.pausedSeconds?: number`
- `WorkoutSession.pausedSeconds?: number`

Optional, so an older API ignores it and an older app omits it.

## Data model and migrations

- `WorkoutSession.pausedSeconds Int @default(0)`
- Migration name: `<timestamp>_add_workout_session_paused_seconds`
- Backfill: no (default 0 is correct for existing rows).

## API surface (`apps/api`)

`POST /workouts`: optional `pausedSeconds`; integer ≥ 0 and ≤ `completedAt −
startedAt` when `completedAt` is present; otherwise 400. Responses include
`pausedSeconds`.

## Mobile surface (`apps/mobile`)

- `ActiveWorkoutScreen`: Pause/Resume button, paused badge, clock uses pause.
- `RoutinesListScreen` banner, `WorkoutHistoryScreen`, `WorkoutSessionDetailScreen`:
  active duration.
- i18n en/es: pause, resume, paused.
- No native rebuild (Metro reload).

## Testing strategy

| Spec AC | Verified by |
|---|---|
| AC-1, AC-2 | Unit: pause/resume helpers; manual in app |
| AC-3 | Unit: `activeDurationSeconds`; manual |
| AC-4 | Unit: finish while paused (clamp) |
| AC-5 | Unit: `pausedSeconds` absent → unchanged |
| EF-1 | Route test: negative, over-duration, non-integer → 400 |

## Files to touch

- `packages/domain/src/entities.ts`
- `apps/api/prisma/schema.prisma` + migration
- `apps/api/src/features/workouts/routes.ts`, `repository.ts` (+ route tests)
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts` (+ test)
- `apps/mobile/src/lib/format.ts` (+ test), `lib/useElapsedSeconds.ts`
- `ActiveWorkoutScreen.tsx`, `RoutinesListScreen.tsx`, `WorkoutHistoryScreen.tsx`, `WorkoutSessionDetailScreen.tsx`
- `apps/mobile/src/i18n/locales/en.ts`, `es.ts`
- `docs/sdd/glossary.md`

## Risks and open questions

None known.

## Rollout

Deploy the API first (`DOCKER_CONTEXT=docker-ts ./scripts/run.sh backend`; the
container runs `prisma migrate deploy` on start), then reload the app. Both
directions are backwards compatible.
