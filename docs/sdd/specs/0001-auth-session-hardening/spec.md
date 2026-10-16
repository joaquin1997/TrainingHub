---
id: 0001
title: Auth session hardening
status: ready
roadmap: docs/roadmap/03-auth-and-users.md
created: 2026-09-23
decided: 2026-09-23
amended: 2026-09-24
---

# Auth session hardening

## Problem

The app has accounts, but the boundary around them is not closed. Three gaps
follow from the same transitional design:

1. A request with no credentials is still served. Instead of being rejected it
   is attributed to a legacy development account, so anonymous callers read and
   write a shared pool of data.
2. Credentials restored when the app starts are never checked against the
   server. A person whose credentials became invalid while the app was closed
   is shown a logged-in app until the first request happens to fail.
3. Credentials do not expire. Once issued they are valid indefinitely, so a
   leaked credential cannot age out and there is no way to end a session
   server-side.

Together these mean per-user data separation is enforced only for clients that
choose to authenticate.

## Why now

Per-user scoping and the login flow are already built and deployed — this is
the last step that makes them mean anything. Until it lands, "multi-user" is
advisory, nothing can be exposed beyond the private network, and the legacy
shared account keeps accumulating data that will be harder to disentangle the
longer it lives. It also blocks roadmap area 9 (production readiness): there is
no point hardening transport and distribution around an API that answers
unauthenticated callers.

## Users and scenarios

- **Returning user, valid session.** Opens the app after a week and expects to
  land on their own data without logging in again.
- **Returning user, session no longer valid.** Opens the app and expects to be
  told to log in — immediately, not after a confusing half-loaded screen.
- **Unauthenticated caller.** Anything reaching the API without valid
  credentials expects a clear rejection, not someone else's data.
- **Owner, in the middle of a workout, session expires.** Has an active workout
  with sets logged and must not silently lose them to a forced logout.
- **Monitoring.** Something outside the app needs to ask whether the service is
  alive, without holding credentials.

## Scope

### In scope
- Rejecting every request that is not authenticated, with no fallback account
  — except the operations that exist to obtain credentials, and the liveness
  check.
- A way for the app to validate restored credentials at startup and learn who
  they belong to.
- Credential expiry, and defined app behaviour when a session expires.
- Reassigning the data currently owned by the legacy account to a real account.

### Out of scope
- **Additional sign-in methods.** Apple is spec 0002. Adding a provider here
  would double the surface of an already cross-cutting change.
- **Server-side session invalidation.** Deliberately deferred to spec 0003; see
  `Resolved decisions` below.
- **Password reset and email verification.** Needs an email-sending capability
  the project does not have; would be its own spec.
- **Multi-device session management** (naming devices, revoking one session).
  Nothing in the product surfaces sessions yet; also 0003 territory.
- **Account deletion and data export.** Separate concern, likely needed before
  any public distribution. Data export is already roadmap area 8.
- **Surviving an app restart with an unsaved active workout.** Specified
  separately as [0010](../0010-persist-active-workout/spec.md); this spec relies
  on it (EF-4) rather than re-implementing it.
- **Rate limiting and abuse protection on the sign-in path.** Belongs with
  roadmap area 9.
- **Offline reading of previously loaded data.** Nothing is cached today;
  see EF-3.

## Functional requirements

- **FR-1.** The system MUST reject any request that does not carry valid
  credentials, with the exceptions in FR-8 and FR-10.
- **FR-2.** The system MUST NOT attribute any request to a fallback or default
  account, and MUST NOT create such an account.
- **FR-3.** The system MUST offer a way for a client to validate its stored
  credentials and retrieve the identity they belong to, without side effects.
- **FR-4.** The app MUST validate stored credentials at startup, before showing
  any of the user's data.
- **FR-5.** Issued credentials MUST stop being valid 90 days after they are
  issued.
- **FR-6.** The app MUST return the user to the sign-in screen when its
  credentials are rejected, at any point in its lifetime.
- **FR-7.** No data belonging to one user may be readable or writable by
  another, for every operation that touches user data. This includes a write
  that *refers* to another user's records (e.g. saving a workout that points at
  someone else's routine) — closed by
  spec 0014 for workouts (implemented 2026-10-16) and
  spec 0015 for custom exercises.
- **FR-8.** A liveness check MUST remain answerable without credentials, so the
  service can be monitored. It MUST NOT expose any user data or any count
  derived from it.
- **FR-9.** Training data currently owned by the legacy development account
  MUST end up owned by the owner's real account, and MUST remain intact and
  visible in the app afterwards.
- **FR-10.** Signing in and creating an account MUST remain available without
  credentials — they are how credentials are obtained.

## Behaviour when things go wrong

- **EF-1.** When credentials are absent, malformed, expired or unknown, the
  system MUST reject the request the same way, without revealing which.
- **EF-2.** When the app starts with stored credentials that the server
  *rejects*, it MUST discard them and show the sign-in screen, with no error
  presented as a failure of the app.
- **EF-3.** When the app starts and the server is *unreachable*, it MUST NOT
  discard the stored credentials and MUST NOT force a sign-in — an unreachable
  server is not a rejection. It MUST open as signed in, show a non-blocking
  notice that it could not reach the server, and offer to retry. Anything
  already on the device — above all an active workout
  ([0010](../0010-persist-active-workout/spec.md)) — MUST stay usable; screens
  that need the server fail individually. Distinguishing "rejected" from "unreachable" is a
  requirement, not an implementation detail: conflating them logs people out
  every time they open the app outside the private network.
- **EF-4.** When a session expires while an active workout holds logged sets,
  returning to the sign-in screen MUST NOT discard that workout. After
  re-authenticating *as the same user*, the user MUST be able to save it. Spec
  0010 extends this across an app restart (its FR-7) and discards the workout
  if a *different* user signs in; this spec relies on that behaviour.
- **EF-5.** When the reassignment in FR-9 cannot map a record to the target
  account, the migration MUST fail loudly rather than drop or orphan the record.

## Domain impact

Touches **User** and, indirectly, every user-owned concept (Routine,
WorkoutSession, Exercise when user-defined, Settings) because ownership stops
having an implicit default.

Retires the **dev user** concept — remove it from the glossary once this lands.
Introduces no new domain concept: session lifetime is a property of a
credential, not a training concept, and must not become an entity in the
training model.

## Acceptance criteria

- **AC-1.** Given no credentials, when any user-data operation is requested,
  then it is rejected and no data is returned.
- **AC-2.** Given expired credentials, when any user-data operation is
  requested, then it is rejected identically to the no-credentials case.
- **AC-3.** Given two users who each own data, when one requests any user-data
  operation, then only their own data is returned or affected.
- **AC-4.** Given valid stored credentials, when the app starts, then the
  user's own data is shown without a sign-in prompt.
- **AC-5.** Given credentials the server rejects, when the app starts, then the
  sign-in screen is shown and the stored credentials are gone.
- **AC-6.** Given a signed-in app, when its credentials are rejected
  mid-session, then it returns to the sign-in screen.
- **AC-7.** Given no credentials, when the liveness check is requested, then it
  answers successfully and contains no user data.
- **AC-8.** Given the app cannot reach the server at startup, when it starts,
  then the stored credentials survive, the app opens with a notice and a retry,
  and an active workout already on the device can be opened.
- **AC-9.** Given the legacy account's data, when the reassignment has run,
  then every one of those routines, workouts and settings is visible under the
  owner's real account, and nothing remains reachable without credentials.
- **AC-10.** Given no credentials, when the person signs in or creates an
  account, then the request is served.

## Non-functional requirements

- The startup credential check MUST NOT add a perceptible delay before the
  first screen; it may resolve concurrently with rendering a loading state.
- Existing clients running an older bundle will be rejected once this lands.
  `[ASSUMPTION: acceptable — the only installs are the owner's own devices, so
  no compatibility window is needed.]`

## Assumptions

- **[ASSUMPTION: the exercise catalog is user-data for this purpose]** — it is
  read behind the same boundary as everything else, even though system
  exercises are not owned by anyone. Confirmed by the decision that only the
  liveness check stays public.
- **[ASSUMPTION: a single credential kind is enough]** — one credential, no
  separate short-lived and long-lived pair, which the 90-day lifetime allows.

## Resolved decisions

Settled 2026-09-23. Recorded with their reasoning so they can be revisited
knowingly rather than rediscovered.

1. **Legacy account data → reassigned to the owner's real account.** Chosen
   over deletion (loses real training history, and a destructive migration has
   no rollback) and over orphaning (zero work now, but the rows sit in the
   database forever). Cost: a one-off operation run once against the existing
   database — not part of the schema history, which must keep working on a
   fresh database (constitution Article 5) — plus FR-9/EF-5.
   `TODO(sdd): the target account must be named before the migration is`
   `written. It is the owner's existing account — readable from the users table`
   `on the dev database, so this closes during planning, not now.`
2. **Session lifetime → 90 days, fixed, no renewal.** Delegated to the
   implementer; recorded here as the decision, not as an assumption. Reasoning:
   the only installs are the owner's own devices, so the exposure of a leaked
   credential is low, while a renewal mechanism would add real design (where a
   refresh credential lives, what happens if it expires mid-workout) for a
   benefit nobody would feel. 90 days keeps re-login to roughly four times a
   year — noticeable enough to prove the flow still works, rare enough not to
   be an irritation — and bounds a leak, which an indefinite credential does
   not. Revisit before any public distribution.
3. **Public surface → the liveness check, sign-in and registration.**
   Everything else requires credentials (FR-1, FR-8, FR-10). Chosen over also
   exposing the exercise catalog, which would open surface for a
   browse-before-signup screen that does not exist. (Amended 2026-09-24: the
   first version said "the liveness check only", which would have made signing
   in impossible.)
4. **Server-side invalidation → deferred, with follow-up work created.** No way
   to revoke a credential before it expires; with a 90-day lifetime that is a
   real, bounded risk, accepted knowingly. Tracked as
   [spec 0003](../0003-session-revocation/spec.md) rather than left as a note,
   and added to the roadmap checklist.
5. **Unreachable server at startup → open the app, with a notice.** Settled
   2026-09-24 when spec 0010 required the active workout to open without a
   connection. A blocking "could not connect" screen would have contradicted
   it. Recorded in EF-3 and AC-8.

## Related

- Roadmap: [03-auth-and-users.md](../../../roadmap/03-auth-and-users.md)
- Followed by: [0002 — Sign in with Apple](../0002-apple-sign-in/spec.md)
- Deferred from here: [0003 — Session revocation](../0003-session-revocation/spec.md)
- Retro-spec of current behaviour: [0009 — Accounts and sessions](../0009-retro-accounts-and-sessions/spec.md)
- Constitution articles engaged: 1, 3, 5, 6, 7, 8
