---
id: 0009
title: "Retro: accounts and sessions"
status: retro
roadmap: docs/roadmap/03-auth-and-users.md
created: 2026-09-23
---

# Retro: accounts and sessions

> **Retro-spec.** Records the *current, transitional* state, which spec 0001
> then changes. Read this to understand what is there; read 0001 for where it
> is going.

## What exists

Email-and-password accounts with a bearer credential, plus per-user data
scoping — built and deployed, but with the boundary deliberately left open
during the transition to multi-user.

## Behaviour today

- A user can register and sign in with an email and a password. Both return a
  credential plus the user.
- The app stores that credential, restores it at startup, attaches it to every
  request, and signs the user out when a request is rejected.
- The credential is kept behind a storage interface (get/set/clear) with a
  platform-appropriate default implementation, so the same code works on iOS,
  Android and web.
- A sign-in screen gates the app; signing out is available in settings.
- Every repository is scoped by the acting user, so two accounts see different
  data.
- **But:** a request with no credential is still served, attributed to a legacy
  development account that is created on demand. And credentials never expire.

## Invariants worth protecting

- **The credential lives behind an interface** (Article 6). Feature code must
  never reach for the platform storage directly — that is what keeps the app
  buildable on three platforms.
- **Repositories are scoped by the acting user, always.** The scoping is
  parameter-driven rather than ambient, which is what makes it verifiable.
- **Passwords are hashed** using a primitive from the standard library, with no
  added dependency.
- **Secrets are injected at runtime, never committed or baked into an image**
  (Article 7).

## Known gaps

The gaps *are* spec 0001: no rejection of unauthenticated requests, a fallback
account that keeps accumulating data, credentials that never expire, and a
stored credential that is never validated at startup. Beyond that:

- No credential revocation — [spec 0003](../0003-session-revocation/spec.md).
- Apple as a sign-in provider — [spec 0002](../0002-apple-sign-in/spec.md);
  the provider contracts and a stub exist, the integration does not.
- No password reset, no email verification, no account deletion or export.
- An insecure development fallback for the signing secret is compiled in; if
  the environment variable is ever missing in production, credentials become
  forgeable.

`TODO(sdd): password reset needs an email-sending capability the project does`
`not have. Whether that is worth acquiring is a real decision, and it gates`
`account recovery entirely — right now a forgotten password means a lost`
`account.`

## Related

- Superseded in part by: [0001 — Auth session hardening](../0001-auth-session-hardening/spec.md)
- Glossary: User, dev user, TokenStorage, auth provider
- Constitution articles engaged: 3, 6, 7
