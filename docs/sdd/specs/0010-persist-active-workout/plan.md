---
spec: 0010
status: approved     # approved with the Live Activity plan, 2026-09-24
created: 2026-09-24
---

# Plan — Persist the active workout

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Device-local only; no server copy, no expiry (out of scope). |
| 2 — Template vs performed | no | Stores the draft of a performed workout only. |
| 3 — Shared domain types | no | `WorkoutSessionDraft` is mobile-only state; nothing shared changes. |
| 4 — Weight in kg | yes | The draft is stored as-is, including its frozen `unit`; conversion to kg still happens on persist to the API. |
| 5 — Prisma migrations | no | No schema change. |
| 6 — Integrations behind interfaces | yes | Storage behind `ActiveWorkoutStorage`, like `TokenStorage`. |
| 7 — Secrets | no | The draft holds no credentials. |
| 8 — Committable + verified | yes | Pure helpers unit-tested; tasks 6–7 need a device rebuild. |
| 9 — Dependencies | yes | Adds `@react-native-async-storage/async-storage` (native, rebuild). Justified below. |
| 10 — TODOs over half-solutions | yes | No expiry of stale drafts: out of scope, noted. |

## Approach

The draft store (`workoutDraftStore.ts`) stays the single in-memory source of
truth. It gains a subscription so other code can react to changes. A persister
subscribes to it, writes the draft (debounced ~300 ms, flushed when the app goes
to background) and clears storage when the draft becomes `null`. On launch,
`RootNavigator` hydrates the store before rendering routes.

Stored envelope: `{ v: 1, ownerId, savedAt, draft }`. A pure
`parsePersistedActiveWorkout(raw, ownerId)` returns `ok | foreign | invalid |
empty`; foreign and invalid are cleared (EF-1, EF-2).

`ownerId` is the user's public id. After a restart `AuthContext` currently sets
`user.id = 'me'` (`AuthContext.tsx` L49), so a pure `tokenSubject(token)`
(decodes the JWT `sub`, no verification) restores the real id. Spec 0001's
`/auth/me` will replace it.

**Owner in memory, not only on disk** (amended 2026-09-24). The store keeps the
owner next to the draft (`activeWorkoutOwnerId`, set by `startActiveWorkout`
and by `hydrateActiveWorkout`). Today a 401 signs out without touching the
draft, so a different person signing in inherits it in the running app.
`AuthContext` calls `discardActiveWorkoutIfForeign(userId)` on every sign-in
(FR-8). The persister, subscribed to the store, then clears storage too.

**Hydration waits for a user** (EF-6). `RootNavigator` keeps the spinner until
auth is restored. If there is a user, it hydrates for that user before the routes
render. If not, storage is left untouched and hydration runs right after the
next sign-in, with the same `parsePersistedActiveWorkout(raw, ownerId)` check
(`foreign` → clear).

**Permanent rejections** (EF-5). `apiRequest` in `lib/http.ts` throws an
`ApiError` carrying `status` instead of a bare `Error` (network failures stay
as they are). On finish, a 4xx other than 401 shows the server's message plus
a "Discard workout" action (confirm → `clearActiveWorkout`); 401, 5xx and
network errors only offer retry. Spec 0001's boot decision reuses the same
status distinction.

`nextDraftId` uses a module counter (`we-gen-N`) that restarts at 0, so ids
created after hydration would collide with ids in the restored draft. Seed it
with a time-based prefix first.

### Alternatives considered

- **`expo-secure-store`** (already installed) — rejected: values over ~2 KB may
  be rejected, and a draft easily exceeds that.
- **`expo-file-system`** — rejected: no web support.
- **A server-side active workout** — rejected: needs API + schema, and
  introduces divergence problems this feature does not need (out of scope).
- **AsyncStorage** — chosen: SDK 55 bundled version, iOS/Android/web.

## Shared contracts (`packages/domain`)

None.

## Data model and migrations

None.

## API surface (`apps/api`)

None.

## Mobile surface (`apps/mobile`)

- `workoutDraftStore.ts`: `subscribeActiveWorkout(listener)`; notify from
  `startActiveWorkout` (new draft), `setActiveWorkout`, `clearActiveWorkout`;
  `hydrateActiveWorkout(draft)`; time-seeded draft ids.
- `useActiveWorkout.ts`: `useSyncExternalStore` instead of refresh-on-focus.
- `ActiveWorkoutScreen.tsx`: read the draft from the store (drop the local copy);
  pure `resolveActiveWorkoutEntry(draft, routineIdParam)` → `resume | fetch |
  none`, so an existing draft opens without the network; `routineId` optional.
- New `features/workouts/persistence/`: `ActiveWorkoutStorage` interface,
  AsyncStorage and in-memory implementations, envelope helpers, persister.
- `AuthContext.tsx`: restore `user.id` from `tokenSubject(token)`; on sign-in,
  `discardActiveWorkoutIfForeign(user.id)` then hydrate if nothing is in memory.
- `src/app/_layout.tsx`: keep the spinner until auth is restored and, when
  signed in, the draft is hydrated.
- `lib/http.ts`: `ApiError` with `status`.
- `ActiveWorkoutScreen.tsx`: on a permanent rejection, offer to discard (EF-5).
- `SettingsScreen.tsx`: confirm sign-out while a workout is active, then clear.
- **Native rebuild required** (new native dependency).

## Testing strategy

| Spec AC | Verified by |
|---|---|
| AC-1 | Device: close from app switcher, reopen |
| AC-2 | Unit: `resolveActiveWorkoutEntry`; device: airplane mode |
| AC-3 | Unit: persister clears on `null`; device |
| AC-4 | Unit: envelope `foreign`; device: two accounts |
| AC-5 | Unit: 401 path does not clear; device |
| AC-6 | Device: save with the API unreachable, reopen |
| AC-7 | Unit: `discardActiveWorkoutIfForeign`; device: expire the token, sign in as someone else |
| AC-8 | Unit: finish-error classification (`ApiError` 4xx vs network); device: force a 400 |
| AC-9 | Unit: hydration deferred while signed out; device |

Unit (Vitest, node): draft ids, subscribe/notify, `resolveActiveWorkoutEntry`,
envelope parse (`ok`/`foreign`/`invalid`/`empty`/old version), `tokenSubject`,
persister debounce and clear with fake timers and in-memory storage,
`discardActiveWorkoutIfForeign`, `ApiError` classification.

## Files to touch

- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts` (+ test)
- `apps/mobile/src/features/workouts/hooks/useActiveWorkout.ts`
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx`
- `apps/mobile/src/features/workouts/persistence/*` (new, + tests)
- `apps/mobile/src/features/auth/AuthContext.tsx`, `features/auth/tokenSubject.ts` (+ test)
- `apps/mobile/src/lib/http.ts` (+ test)
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/features/settings/screens/SettingsScreen.tsx`
- `apps/mobile/package.json`, `pnpm-lock.yaml`
- `docs/sdd/specs/0005-retro-workouts/spec.md`, `docs/sdd/backlog.md`, `docs/roadmap/01-live-workout-logging.md`
- `docs/sdd/glossary.md` (`WorkoutSessionDraft` stops being "in-memory"; active workout survives restarts)

## Risks and open questions

- Screen state that today lives only in `ActiveWorkoutScreen` (rest timer,
  picker) is not part of the draft and is not restored — acceptable.
- Moving the screen to read from the store touches many handlers; keep the
  change mechanical (`setWorkoutDraft(x); setActiveWorkout(x)` → `setActiveWorkout(x)`).
- **Ordering:** spec 0014 (idempotent save, routine link as optional provenance)
  must be deployed before task 7 switches persistence on. Otherwise retries
  after a restart can duplicate a workout, and a deleted routine leaves a
  stored workout that can never be saved.

## Rollout

Mobile only. A bundle without this simply ignores stored data. Rollback: revert;
stored data is ignored by older bundles.
