---
spec: 0001
status: approved
created: 2026-09-23
updated: 2026-11-03
---

# Plan — Auth session hardening

Approved for implementation by the owner's request of 2026-11-03, under the
previously delegated gates. The original 2026-09-24 design is retained, with
changes for Google sign-in, body measurements and the reviewed catalog.
Implementation is local; rollout and device acceptance are still pending.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope | yes | Close the auth boundary, validate at boot and provide a one-off data reassignment. No refresh tokens, revocation or new providers. |
| 2 — Templates vs performed | yes | Ownership changes only; routine targets and logged sets remain separate and unchanged. |
| 3 — Shared contracts | yes | `AuthIdentityResponse` reuses `AuthTokenResponse.user` in domain. |
| 4 — kg | no | No measurement values or conversions change. |
| 5 — Prisma | yes | No schema migration. Data reassignment is a separate transaction-backed script. |
| 6 — Interfaces | yes | Token storage and provider boundaries remain in place. |
| 7 — Secrets | yes | Missing/blank JWT secret is fatal outside explicit development/test; nothing is printed or committed. |
| 8 — Verified changes | yes | Typecheck and full mobile/API suites; rollout checks tracked separately. |
| 9 — Dependencies | yes | No new packages or native rebuild requirement. |
| 10 — Unknowns | yes | Target account, live reassignment and deployment remain explicit rollout items; no account guessed. |

## Approach

`createApp` installs one strict global `onRequest` hook. Its allowlist is
method and exact path: `GET /health`, `POST /auth/login`,
`POST /auth/register`, `POST /auth/google`. Query parameters do not change
the matched path. Every other route, including future routes, is protected.
Google is an existing credential-acquisition operation introduced by 0039,
so it must remain public. The unfinished Apple demo remains protected until
0002 implements an actual provider; it must not be used to obtain app access.

Verification checks signature/expiry, a nonempty string subject, an explicit
expiration, and that the subject still belongs to an existing account.
Missing, malformed, expired, unknown-account and old non-expiring tokens
receive the same `401 { message: 'Unauthorized' }`. Database failures are
server errors, not credential rejections. `resolveUserPublicId` can only
return the verified subject and never creates or returns a default account.

Set a 90-day default at JWT registration, covering email register, email
login and Google equally. Old tokens have no expiration and require one
new sign-in. A missing secret is allowed only for explicit development/test.

### Alternatives considered

- **Per-route protection** — rejected: a forgotten handler creates a new
  anonymous data path. Existing explicit handlers may remain as defense in
  depth; the global hook is authoritative.
- **Only checking that a token is signed** — rejected: an unknown or deleted
  account must not have an authenticated identity; old non-expiring tokens
  would otherwise remain usable indefinitely.
- **Treating every startup failure as logout** — rejected: outside the
  tailnet, a stored workout must remain usable under its own user's identity.
- **Refresh tokens or server revocation** — excluded by the accepted scope;
  revocation remains 0003.

## Contracts and API

`AuthIdentityResponse = Pick<AuthTokenResponse, 'user'>` in domain.
`GET /auth/me` returns this identity read-only after global validation.
The same rejection applies to every protected operation. Public health
continues to return service/database availability only.

## Mobile

`sessionBootDecision` handles validated, rejected and unreachable outcomes.
`AuthProvider` reads storage and checks `/auth/me` before exposing user data.
Only a 401 clears credentials. Network, timeout and server failures keep the
token, derive the local workout owner from its subject and open offline.
Unreadable tokens never create a guessed owner. Validation has a five-second
network timeout so a silent server cannot hold the startup screen forever.

The root navigator shows an ES/EN non-blocking notice and Retry; startup
onboarding checks do not hold the offline workout behind server requests.
Retry checks the same credentials and either removes the notice or signs out
on rejection. Late validation responses cannot override a newer sign-in or
sign-out. A late 401 from an older request cannot sign out a newer token.
The shared HTTP wrapper handles mid-session 401s; sign-in attempts and the
boot check handle their own errors without an unrelated logout callback.

No active-workout discard on involuntary sign-out. Existing 0010 persistence
keeps it until the same user returns; a different user is handled by the
existing owner checks. No new screen, dependency or native capability.

## Data reassignment — no schema migration

`pnpm --filter @workout/api auth:reassign-dev-user --to <owner-public-id>`
is a dry run by default; add `--apply` to write. The owner is explicit,
never inferred from a name or hardcoded. It reports counts and row IDs; keep
the apply report with the server backup.

Use one serializable transaction, moving:

- Routine ownership; its exercises, sets, folder and warm-up items follow.
- Workout ownership; performed exercises, sets and warm-up items follow.
- Custom exercise creators; photos and usage references stay attached.
- Body measurements introduced since the original plan.
- Favorites, deduplicating only existing target favorites of the same exercise.

Keep the target profile and settings; settings are columns on User, not a
second settings collection to merge. Abort on a workout client-ID collision,
legacy provider identities or any unmapped ownership remaining after the
moves. Delete the legacy account only when all owned collections are empty.
Errors roll back the transaction. With no legacy account, report nothing to
do. No IDs, workout measurements or routine targets are rewritten.

## Files changed

- `packages/domain/src/auth.ts` — shared identity response.
- `apps/api/src/app.ts` — default-deny hook, account verification, expiry/secret.
- `apps/api/src/infrastructure/sessionUser.ts` — account lookup boundary.
- `apps/api/src/infrastructure/userContext.ts` — strict identity resolution.
- `apps/api/src/infrastructure/developmentUser.ts` — removed.
- `apps/api/src/features/auth/routes.ts` — identity endpoint.
- `apps/api/src/scripts/reassign-dev-user.ts`, script/tests and package command.
- API feature route tests — real signed requests and real user resolution,
  mocking persistence rather than the boundary under test.
- `apps/mobile/src/features/auth/{AuthContext,sessionBoot,tokenSubject}`,
  auth client and tests — boot validation/offline identity.
- `apps/mobile/src/lib/http.ts` and tests — timeout and rejection handling.
- `apps/mobile/src/app/_layout.tsx`, translations — offline notice/retry.
- SDD backlog/tasks/glossary/constitution and auth roadmap.

## Testing strategy

| Criteria | Evidence |
|---|---|
| AC-1, AC-2 | Anonymous reads/writes across every feature; absent/malformed/expired/non-expiring/unknown tokens rejected identically; future route protected. |
| AC-3 | Signed two-user route calls and existing ownership/isolation suites, including foreign exercise/routine references. |
| AC-4, AC-5, AC-8 | Pure startup decisions, HTTP network/server/timeout tests; final device startup/retry remains pending. |
| AC-6 | Protected 401 callback and old-token response race tests; device navigation remains pending. |
| AC-7 | Public health with bad bearer token and query string, no user fields. |
| AC-9 | Script dry-run/write/idempotency/conflict/measurement/favorite tests; live dry-run/apply still pending. |
| AC-10 | Public register/login and Google suites; all three issue 90-day tokens. |
| EF-4 | Existing 0010 persister/account isolation tests; device expiry/re-auth/save remains pending. |

Run `pnpm -r typecheck` and `pnpm -r test`. Source changes are not a
substitute for server reassignment and device acceptance.

## Rollout and rollback

1. Back up the server database. Confirm the deployed JWT secret is configured
   without printing it. Keep the secret unchanged.
2. Select the owner's existing public ID and run the reassignment dry run.
   Review counts/collisions, then apply; verify history, routines, measurements
   and favorites under that account before deploying the strict boundary.
3. Deploy the API, check health anonymously and data routes without/with a
   new token. Confirm public Google remains callable when configured.
4. Deliver the updated JS bundle (or Release build for the standalone phone)
   and sign in again once. Verify cold start, offline start, Retry and an
   active workout surviving rejection and same-user reauthentication.

No native API change requires prebuild; a standalone Release installation
still needs a build to include the JS changes. Do not push automatically.

Rollback code by deploying the previous API/bundle; do not automatically
undo data ownership. A database backup and moved-ID report are the recovery
path if reassignment itself must be reversed. Revocation remains deferred
and a stolen new token can last up to 90 days.

## Progress — 2026-11-03

Local implementation and automated checks complete. A read-only attempt to
inspect the configured database could not connect; no live rows were read
or modified. No reassignment, server deploy or device validation was run.
