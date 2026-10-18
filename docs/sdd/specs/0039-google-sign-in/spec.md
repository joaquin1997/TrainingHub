---
id: 0039
title: Sign in with Google
status: in-progress
roadmap: docs/roadmap/03-auth-and-users.md
created: 2026-10-18
decided: 2026-10-18
---

# Sign in with Google

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

Signing in needs an email and a password. Most people already have a Google
account on their phone; inventing and remembering another password is the
main friction of the first minute, and the most common reason to give up
before the first workout.

## Why now

The owner asked for working Apple and Google sign-in (2026-10-18). Apple
needs a paid Apple developer account (the free one cannot sign the
capability — checked on 2026-10-18 by building with it), so the owner chose
**Google only for now** and Apple stays in 0002. The Google project
credentials do not exist yet: the owner chose to have **the code ready and
inactive until they are created**.

## Today

- Email and password only: sign-up (email, password, optional name), sign in,
  sign out, automatic sign-out on an expired session.
- An account is identified by its email; there is no record of other ways to
  sign in.

## Users and scenarios

- **New on iPhone.** Taps "Continue with Google", picks their Google account,
  and is in — with their Google name — without typing a password; the first
  run (0037) follows.
- **Existing email user.** Someone who signed up with
  `ana@gmail.com` and a password taps "Continue with Google" with the same
  address: they land in their existing account with all their workouts, and
  can still sign in with the password.
- **Changed mind.** Someone taps the button and closes the Google sheet: they
  are back on the sign-in screen, nothing changed.
- **Not configured.** On a build without the Google credentials, the button is
  not shown; email and password work as today.

## Scope

### In scope
- A "Continue with Google" action on the sign-in screen, on iPhone, Android
  and the web build, shown only when the app has the Google credentials.
- Creating an account from a Google identity, or signing in to the account it
  already belongs to.
- **Linking by verified email** (decided by the owner): a Google identity whose
  email Google confirms as verified, and that matches an existing account's
  email, signs in to that account and is remembered for it.
- The server refuses Google sign-in clearly when it is not configured.

### Out of scope
- **Sign in with Apple** — spec 0002, waiting for a paid Apple developer
  account (owner's call).
- Unlinking, managing linked sign-in methods, or adding a password to a
  Google-only account.
- Using Google data beyond name and email (no photo import, no contacts).
- Account deletion.

## Functional requirements

- **FR-1.** When the app has the Google credentials, the sign-in screen MUST
  offer "Continue with Google" (in the person's language), on both the
  sign-in and the create-account views; without them, it MUST NOT be shown.
- **FR-2.** Completing Google's sign-in MUST sign the person in exactly as an
  email sign-in does: the session is kept, the stored active workout rules of
  0010 apply, and the first run of 0037 is decided as after any sign-in.
- **FR-3.** The server MUST accept a Google identity only after checking with
  Google's published keys that it was issued by Google, for this app, and has
  not expired.
- **FR-4.** A Google identity seen before MUST sign in to the account it
  belongs to, even if its email changed since.
- **FR-5.** A new Google identity whose email is verified by Google and equal
  (ignoring case) to an existing account's email MUST be linked to that
  account and sign in to it (FR-4 from then on).
- **FR-6.** A new Google identity without such a match MUST create an account
  with Google's name (or the part of the email before "@" when there is no
  name) and email, and no password.
- **FR-7.** An account created with Google MUST NOT be reachable with an email
  and any password; the email sign-in answers as for a wrong password.

## Behaviour when things go wrong

- **EF-1. Cancelled.** Closing Google's sheet returns to the sign-in screen
  with no message and nothing changed.
- **EF-2. Offline or Google unreachable.** A one-line error on the sign-in
  screen; email sign-in still works.
- **EF-3. Rejected identity** (expired, wrong app, bad signature): the server
  refuses it and the app says that Google sign-in failed; nothing is created.
- **EF-4. Unverified email.** Never linked to an existing account; a new
  account is created only if no account uses that email, otherwise the
  sign-in is refused with "This email already has an account — sign in with
  its password" (no takeover of an account through an unverified address).
- **EF-5. Server not configured.** The server refuses with a clear "Google
  sign-in is not available" and the app shows it in one line.

## Domain impact

Touches **User** and a new **sign-in identity** (a provider and the provider's
id for a person, belonging to one account). Accounts may have no password.

## Acceptance criteria

- **AC-1.** Given a build without Google credentials, the sign-in screen shows
  no Google button.
- **AC-2.** Given a configured build and server, when a new person continues
  with Google, then an account with their Google name exists, they are signed
  in and the first run shows.
- **AC-3.** Given an email account `ana@gmail.com`, when Ana continues with
  the Google account `ana@gmail.com`, then she is in the same account (same
  workouts), and her password still works.
- **AC-4.** Given a Google-created account, when someone tries its email with
  any password, then the sign-in fails as for a wrong password.
- **AC-5.** Given the Google sheet, when it is closed, then the sign-in screen
  shows no error.
- **AC-6.** Given a server without Google configuration, when the app sends a
  Google identity, then the app shows "Google sign-in is not available".
- **AC-7.** Given an expired or foreign identity token, the server refuses it
  (automated test).

## Assumptions

- **[ASSUMPTION: the Google name becomes the display name; the photo is not
  imported]** — the profile photo stays the person's choice (0027).
- **[ASSUMPTION: the web build offers Google too]** when a web client id is
  configured; it is the preview, not a product surface.

## Open decisions

None blocking. Owner's step: create the OAuth clients (see `plan.md`, *Owner
steps*).

## Related

- 0002 (Apple, deferred), 0001 (session hardening), 0010 (workout on sign-in),
  0037 (first run).
- Constitution articles engaged: 1, 3, 5 (migration), 6 (provider behind the
  auth provider boundary), 7 (client ids are configuration, no secret in the
  app), 9 (Expo auth packages).
