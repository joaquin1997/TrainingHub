---
id: 0002
title: Sign in with Apple
status: draft
roadmap: docs/roadmap/03-auth-and-users.md
created: 2026-09-23
---

# Sign in with Apple

> **Skeleton.** Included to show the shape of a spec that is mostly unknown,
> rather than left out of the backlog. Most sections are open on purpose — the
> gaps below are the actual work of specifying this.

## Problem

Signing in requires an email and a password. On iOS — the primary platform —
that is the friction-heaviest option available, and Apple was the intended
first provider from the start; email/password only shipped first because it was
simpler. `[NEEDS DECISION: is Apple wanted for convenience, or because App
Store distribution requires it? If the latter, this becomes a prerequisite of
roadmap area 9 rather than an improvement.]`

## Why now

Depends on the answer above, and on spec 0001 — hardening the session boundary
first means this adds a provider to a closed system rather than a second path
into an open one.

## Users and scenarios

- **New user on iOS.** Wants an account without inventing a password.
- **Existing email/password user who signs in with Apple.** Expects to reach
  the same account, not a second empty one. `[NEEDS DECISION: is account
  linking in scope, or is one identity per sign-in method acceptable for now?]`

`TODO(sdd): the Android and web story is missing. The app runs on all three;`
`Apple sign-in does not. Needs a statement of what those platforms do — keep`
`email/password only, or is a third provider implied?`

## Scope

### In scope
- `TODO(sdd): blocked on the questions above.`

### Out of scope
- Additional providers (Google, self-hosted OIDC) — architecture stays open to
  them, per constitution Article 6, but none is implemented here.
- `TODO(sdd): complete once in-scope is known.`

## Functional requirements

`TODO(sdd): cannot be written before the account-linking and platform-coverage`
`decisions — they change what the system must do, not how.`

## Behaviour when things go wrong

`TODO(sdd): needs the failure modes of the provider flow: user cancels,`
`provider is unreachable, the provider returns an identity with no email (Apple`
`private relay), the same provider identity arrives twice. The private-relay`
`case is the one most likely to be missed and hardest to fix later.`

## Domain impact

Touches **User** and **auth provider**. The provider contracts already exist in
`packages/domain/src/auth.ts` and a stub provider exists on the API side, so
this is expected to fill in a prepared seam rather than reshape the domain.

## Acceptance criteria

`TODO(sdd): follows from the requirements.`

## Open decisions

- **[NEEDS DECISION: convenience or App Store requirement?]** Sets the priority.
- **[NEEDS DECISION: account linking, or one account per sign-in method?]**
  The harder of the two; retrofitting linking later means migrating accounts
  people are already using.
- **[NEEDS DECISION: what do Android and web do?]**
- **[NEEDS DECISION: is an Apple Developer account and the associated
  configuration already in place?]** Sign in with Apple needs real provider
  configuration; without it this cannot be verified end to end, only stubbed.

## Related

- Depends on: [0001 — Auth session hardening](../0001-auth-session-hardening/spec.md)
- Roadmap: [03-auth-and-users.md](../../../roadmap/03-auth-and-users.md)
- Constitution articles engaged: 1, 3, 6
