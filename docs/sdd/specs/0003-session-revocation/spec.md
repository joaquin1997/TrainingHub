---
id: 0003
title: Session revocation
status: draft
roadmap: docs/roadmap/03-auth-and-users.md
created: 2026-09-23
---

# Session revocation

> Created because spec 0001 **deferred** this deliberately rather than leaving
> it as a footnote. Deferred means scheduled, not forgotten.

## Problem

Once spec 0001 lands, a credential is valid for 90 days and there is no way to
end it early. Three consequences:

- A credential that leaks (a stolen device, a token pasted somewhere) stays
  usable until it expires, and nobody can do anything about it.
- Signing out only forgets the credential locally. The credential itself
  remains valid, so "sign out" is a client-side illusion.
- A lost or sold device cannot be cut off.

Accepted knowingly in 0001, on the grounds that the only installs are the
owner's own devices. That reasoning stops holding the moment the app reaches
anyone else, which makes this a prerequisite for distribution.

## Why now

It is not "now" — it is *before distribution*. Deferring further is fine while
the install base is the owner's devices; shipping to anyone else without it is
not. Roadmap area 9 (production readiness) and spec 0002 (Apple sign-in, if it
is driven by App Store distribution) are the triggers.

## Users and scenarios

- **Owner loses a phone.** Wants every session on that device dead, from
  another device.
- **Owner signs out.** Expects the credential to stop working, not merely to be
  forgotten locally.
- **Owner changes their password.** `[NEEDS DECISION: should changing a
  password end every existing session? Most products say yes, and it is the
  main reason people expect revocation to exist — but the project has no
  password-change flow yet, so this may belong with that work instead.]`

## Scope

### In scope
- Ending a session server-side, before it expires.

### Out of scope
- Session *listing* and per-device management (naming devices, seeing what is
  signed in) — a product surface, not a security primitive. Would be its own
  spec.
- `TODO(sdd): complete once the decisions below land.`

## Functional requirements

- **FR-1.** The system MUST be able to make an issued credential stop being
  valid before it expires.
- **FR-2.** Signing out MUST end the session server-side, not only locally.

`TODO(sdd): further requirements depend on the granularity decision below —`
`"end all my sessions" and "end this one session" are different features with`
`different storage costs.`

## Behaviour when things go wrong

`TODO(sdd): needs the failure modes — what a client does when its credential is`
`revoked mid-action, and specifically the active-workout case that EF-4 of spec`
`0001 already had to handle.`

## Domain impact

Touches **User**. Introduces the notion of a credential that can be invalidated
— the first piece of session state the system would hold. Keep it out of the
training model entirely.

## Acceptance criteria

`TODO(sdd): follows from the requirements.`

## Open decisions

- **[NEEDS DECISION: granularity — all sessions at once, or one at a time?]**
  A single counter on the user ("everything issued before N is dead") is cheap,
  needs no session storage, and covers sign-out and the lost-device case by
  killing every session. Per-session revocation needs a stored record per
  session, and only pays off once there is a UI listing them.
- **[NEEDS DECISION: does a password change end all sessions?]** See above.
- **[NEEDS DECISION: is the per-request cost acceptable?]** Any revocation
  scheme means checking something on every authenticated request. With a
  counter on the user it is a read the request often needs anyway; worth
  confirming against how `resolveUserPublicId` ends up working after 0001.

## Related

- Deferred from: [0001 — Auth session hardening](../0001-auth-session-hardening/spec.md)
- Roadmap: [03-auth-and-users.md](../../../roadmap/03-auth-and-users.md)
- Constitution articles engaged: 1, 3, 6
