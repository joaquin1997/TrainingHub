---
spec: 0001
status: draft        # ready for review — not self-approved
created: 2026-09-23
updated: 2026-09-24
---

# Plan — Auth session hardening

Spec 0001 passed gate 1 on 2026-09-23 (all decisions resolved), so this plan is
now concrete. It is **pending human approval**, not approved: gate 2 is passed
by review, not by the author.

**Amended 2026-09-24** after a review against the code: the public surface
includes sign-in and registration (FR-10); an unreachable server opens the app
with a notice (EF-3); the reassignment is a one-off script, not a migration
(constitution Article 5, amended); the data-model notes now match
`schema.prisma`.

## Current state (verified, not assumed)

Read on 2026-09-23.

- `apps/api/src/app.ts` registers `@fastify/jwt` and decorates the instance
  with `authenticate` — a preHandler that 401s when `jwtVerify` fails. **It is
  defined but never applied.**
- The same file adds an `onRequest` hook that calls `jwtVerify` inside a
  `try/catch` and swallows the failure, explicitly to let anonymous requests
  through during the multi-user transition. Its own comment says "flip to a
  strict `authenticate` preHandler later" — that flip is FR-1.
- `apps/api/src/infrastructure/userContext.ts` — `resolveUserPublicId` returns
  `request.user?.sub` when present and otherwise calls `ensureDevelopmentUser()`
  and returns `DEVELOPMENT_USER_PUBLIC_ID`. This is FR-2, and it *creates* the
  legacy account on demand, which is why it keeps accumulating data.
- `apps/api/src/features/auth/routes.ts` signs tokens with
  `app.jwt.sign({ sub: user.publicId })` at two call sites (register, login),
  **with no `expiresIn`** — tokens never expire today. That is FR-5.
- There is **no `/auth/me` route** in the API and nothing in the app calls one.
  That is FR-3.
- `JWT_SECRET` comes from the environment with an insecure dev fallback baked
  into `app.ts`.
- Mobile already has an `AuthProvider` that restores a token at boot, exposes
  signIn/register/signOut and auto-logs-out on a 401; `lib/http.ts` attaches
  `Authorization: Bearer`. The token sits behind the `TokenStorage` interface
  over `expo-secure-store` (Article 6). FR-4 and FR-6 attach to existing seams.
- `GET /health` exists (`apps/api/src/routes/health.ts`) and is what FR-8 keeps
  public.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Providers, password reset, revocation and draft persistence are all pushed out by the spec's out-of-scope list. |
| 2 — Template vs performed | no | — |
| 3 — Shared domain types | yes | The identity shape returned by FR-3 goes in `packages/domain`, consumed by both apps. |
| 4 — Weight in kg | no | — |
| 5 — Prisma migrations | yes | No migration. FR-9 is a data change, so it is a one-off script under `apps/api/src/scripts/` (Article 5, amended 2026-09-24): a migration would run on every database, and fail on a fresh one where the legacy account does not exist. |
| 6 — Integrations behind interfaces | yes | No new provider; `TokenStorage` stays the only storage seam. No renewal mechanism, so nothing new to hide behind an interface. |
| 7 — Secrets | yes | The insecure `JWT_SECRET` fallback must hard-fail outside development, otherwise a missing env var makes every token forgeable. |
| 8 — Committable + verified | yes | Task ordering below keeps the tree green; the breaking task lands after the app can cope. |
| 9 — Dependencies | yes | No new dependency. The 90-day fixed lifetime is what avoids a refresh-token library. |
| 10 — TODOs over half-solutions | yes | One open TODO remains (target account for the migration). |

## Approach

The change is a *removal* more than an addition: delete the anonymous path and
the fallback account so the existing per-user scoping becomes the only path.
Four pieces, in dependency order.

1. **Identity contract + validation operation.** A read-only operation that
   answers "who am I" for a bearer token (FR-3), with its DTO in
   `packages/domain`. Additive — nothing breaks.
2. **Expiry and secret handling.** Add a 90-day lifetime at both signing call
   sites (FR-5), and make a missing `JWT_SECRET` fatal outside development
   (Article 7).
3. **Reassignment script.** Move the legacy account's rows to the owner's
   real account (FR-9), failing loudly on anything unmappable (EF-5). Run once
   against the dev database; not part of the migration history.
4. **Close the boundary.** Replace the swallowing `onRequest` hook with strict
   authentication plus an allowlist of `GET /health`, `POST /auth/login` and
   `POST /auth/register` (FR-8, FR-10), and make `resolveUserPublicId` fail
   instead of inventing a user. This is the breaking step; the app change lands
   with it.

On the app side, `AuthProvider` calls the validation operation while it restores
the token, and — the part that needs care — distinguishes *rejected* from
*unreachable* (EF-2 vs EF-3). The current auto-logout-on-401 does not make that
distinction, so a network error must not be allowed to fall into the logout
path. *Unreachable* renders the app as signed in, with a non-blocking notice and
a retry, so an active workout on the device (0010) stays reachable.

### Alternatives considered

- **Global strict hook with an allowlist vs per-route preHandler.** Chosen:
  global. A new route added later cannot silently be born public, which is the
  failure mode that actually matters; a per-route preHandler is more explicit
  but relies on remembering it every time.
- **Keeping the dev-user fallback behind an environment flag.** Rejected: it
  preserves the exact code path this spec exists to delete, and a flag that
  disables authentication is the kind of thing that ends up enabled.
- **Token lifetime enforced only client-side.** Rejected outright — a client
  cannot enforce expiry on an attacker. `expiresIn` at signing time is the only
  place it means anything.

## Shared contracts (`packages/domain`)

An identity DTO for FR-3, holding what the app needs at boot to render a
signed-in shell. Should reuse whatever the sign-in response already returns for
`user` rather than inventing a second shape — two shapes for one concept is an
Article 3 violation in spirit even if both live in `packages/domain`.

`TODO(sdd): confirm the sign-in response's user shape and reuse it; check what`
`AuthProvider actually stores today before defining anything new.`

## Data model and migrations

No schema change and no migration — this is a **data** change, done by a
one-off script: `apps/api/src/scripts/reassign-dev-user.ts`, with an npm script
following the `import:wger` pattern in `apps/api/package.json`.

What moves, checked against `schema.prisma` (2026-09-24). Ownership sits on the
parent only, so children follow without being touched:

- `Routine.userId` → owner. `RoutineExercise` / `RoutineExerciseSet` follow;
  `Routine.folder` is a column, so folders travel with their routines.
- `WorkoutSession.userId` → owner. `WorkoutExercise` / `WorkoutSet` follow.
- `Exercise.createdByUserId` → owner (user-defined exercises).
- `ExerciseFavorite.userId` → owner, **except** where the owner already has the
  same favorite: `@@unique([userId, exerciseId])` would reject the move, so
  those legacy rows are deleted instead.
- Settings are columns on `User` (`unit`, `defaultRestSeconds`, `language`),
  not rows: the owner's values win and nothing is copied.
- Then delete the legacy `User`, so `ensureDevelopmentUser` cannot resurrect it
  and FR-2 is verifiable by its absence.

Script behaviour: `--dry-run` by default (prints counts per table); `--apply`
runs everything in one transaction; the owner is passed as an argument, never
hardcoded; it prints the moved row ids (for a manual rollback) and aborts on
anything it cannot map (EF-5). Idempotent: once the legacy account is gone it
reports "nothing to do".

`TODO(sdd): the target account must be named before the script is run — it is`
`the owner's existing account, readable from the users table on the dev`
`database. Blocking for running task 4 only; writing it can proceed.`

## API surface (`apps/api`)

| Operation | Auth | Notes |
|---|---|---|
| Validation of current credentials (FR-3) | required | Read-only, no side effects. Returns the identity DTO. Rejects per EF-1. |
| `GET /health` | **public** (FR-8) | Allowlisted. Must not gain any user-derived field. |
| `POST /auth/login`, `POST /auth/register` | **public** (FR-10) | Allowlisted: they are how credentials are obtained. |
| Every other existing route | required | Behaviour change only: 401 instead of falling back to the legacy account. |

All rejections must be indistinguishable per EF-1 — same status, same body, no
hint about whether the token was missing, malformed, expired or unknown.

## Mobile surface (`apps/mobile`)

Attaches to existing code: `AuthProvider` (boot validation, and the EF-2 vs
EF-3 distinction), `lib/http.ts` (already attaches the bearer token and already
has `[api]` diagnostic logging). No new screen — the sign-in screen and the
`_layout.tsx` gating exist.

EF-4 is covered by spec 0010: its FR-7 keeps the active workout across an
involuntary sign-out (and an app restart), and it discards the workout when a
different user signs in. Nothing to build here; verify it once both land.

EF-3 needs a small non-blocking notice ("could not reach the server · retry")
rendered by `RootNavigator` in `src/app/_layout.tsx` while the boot decision is
`offline`.

**No native rebuild expected** — no new native dependency, no `app.json` change.
Worth stating because `EXPO_PUBLIC_*` values are baked into the Metro bundle: if
this work touches the API URL for any reason, it needs
`npx expo start --clear` and an app reload, not just an `.env` edit.

## Testing strategy

| Spec AC | Verified by |
|---|---|
| AC-1, AC-2 | Route tests: absent, malformed and expired credentials all rejected identically |
| AC-3 | Route tests with two distinct authenticated subjects |
| AC-4, AC-5, AC-6, AC-8 | Manual on device, unless the boot logic is extracted (see below) |
| AC-7 | Route test: liveness check answers without credentials |
| AC-9 | Script `--dry-run` counts, then manual verification against the dev database after `--apply` |
| AC-10 | Route tests: login and register answer without credentials after the boundary closes |

Two things to watch:

- **The existing route tests mock `resolveUserPublicId`** — the very function
  this spec changes. Mocking it would hide the regression the spec exists to
  prevent. Those tests need to authenticate properly instead.
- **Extract the boot decision into a pure function** (given: stored token,
  server response or network error → signed-in / signed-out / offline-retry) so
  AC-5 and AC-8 stop being manual-only. Consistent with how progress
  aggregation and the weight helpers were made testable.

## Files to touch

- `packages/domain/src/auth.ts` — identity DTO for FR-3
- `apps/api/src/app.ts` — strict auth hook + allowlist; fatal missing secret
- `apps/api/src/infrastructure/userContext.ts` — fail instead of falling back
- `apps/api/src/infrastructure/developmentUser.ts` — **delete**
- `apps/api/src/features/auth/routes.ts` — `expiresIn`; validation route
- `apps/api/src/scripts/reassign-dev-user.ts` (new) + npm script in `apps/api/package.json` — reassignment
- API route tests that currently mock `resolveUserPublicId`
- `apps/mobile/src/features/auth/AuthContext.tsx` — boot validation, EF-2/EF-3
- `apps/mobile/src/app/_layout.tsx` — offline notice (EF-3)
- `docs/roadmap/03-auth-and-users.md`, `docs/sdd/backlog.md`,
  `docs/sdd/glossary.md` (retire "dev user")

## Risks and open questions

- **Locking the owner out of their own history.** The mitigation *is* the
  reassignment migration; the risk is running the boundary change (task 4)
  before the reassignment script has run, which would make that data
  unreachable in between.
  Ordering is load-bearing, not cosmetic.
- **A stale bundle on a device.** An installed app built before this change
  starts failing outright. Accepted by the spec, but it means rebuilding and
  reloading the app is part of rollout, not an afterthought.
- **Mocked tests giving false confidence.** See above.
- **EF-3 regressing quietly.** If a network error is ever routed into the
  rejection path, every launch outside the tailnet logs the user out. Worth a
  test, given the connectivity history of this project.
- **No revocation until spec 0003.** Accepted knowingly; a leaked credential is
  valid for up to 90 days.

## Rollout

API first, then the app — the reverse order leaves the app calling an operation
that does not exist. Within the API, the reassignment script runs (against the
dev database, over the SSH tunnel) before the boundary change deploys.

Deployment is the existing path: container on `joaquinserver`,
`prisma migrate deploy` on startup, reachable over Tailscale. Confirm
`JWT_SECRET` is set in `apps/api/.env` before deploying the fatal-check, or the
API will refuse to start — that is the intended behaviour, but it should not be
a surprise at deploy time.

**Rollback.** Code tasks roll back by redeploying the previous image. The
reassignment does not roll back automatically: it is reversible in principle
(the rows are still there, under a different owner) because the script prints
which rows it moved — keep that output. Deleted duplicate favorites are not
worth restoring.
