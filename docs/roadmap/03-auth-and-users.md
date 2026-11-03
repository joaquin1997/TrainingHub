# 3. Auth & users

Replace the hardcoded `user-development` with real authentication and per-user
data scoping.

Specified under SDD — see [../sdd/specs/](../sdd/backlog.md):
[0001 auth session hardening](../sdd/specs/0001-auth-session-hardening/spec.md) (`in-progress`, code complete locally; rollout pending),
[0002 Sign in with Apple](../sdd/specs/0002-apple-sign-in/spec.md) (`draft`),
[0003 session revocation](../sdd/specs/0003-session-revocation/spec.md) (`draft`),
and [0009 retro: accounts and sessions](../sdd/specs/0009-retro-accounts-and-sessions/spec.md)
for what exists today.

## Checklist
- [x] Email/password provider + JWT, `/auth/register` and `/auth/login`
- [x] API auth middleware available (`app.authenticate`)
- [x] Scope all repositories by the authenticated user
- [x] Mobile login/register flow, token behind `TokenStorage`, gating + logout
- [x] Reject unauthenticated requests; remove the dev-user fallback — spec 0001 (local code; deploy pending)
- [x] Validate the stored session at startup (`/auth/me`), offline notice/Retry — spec 0001 (local code; device check pending)
- [x] Expire sessions (90 days), including Google; reject old non-expiring tokens — spec 0001 (local code; deploy pending)
- [ ] Reassign the dev user's data to the owner's account — spec 0001
- [ ] Server-side session revocation — spec 0003, **before any distribution**
- [ ] Sign in with Apple — spec 0002 (deferred: needs a paid Apple developer account)
- [x] Sign in with Google — spec 0039 (code ready; active once the OAuth clients exist)
- [ ] Password reset / account recovery — unspecified; needs an email capability
- [x] Account / profile screen: name, bio, height, photo, body measurements
  with history (spec 0027 — migration, rebuild and photo check pending)

## Notes
- `packages/domain/src/auth.ts` already has provider contracts, and an Apple
  provider stub exists on the API side.
- Local code enforces per-user authentication and no longer creates a fallback
  account. The deployed API still needs the ordered 0001 rollout; do not infer
  server enforcement from the checked local implementation items.
- New credentials last 90 days after deployment. Revocation remains 0003.
- This area unblocks production (area 9) and social (area 7).

## Progress log
- (2026-05-31) Email/password + JWT end-to-end and deployed: backend endpoints,
  per-user scoping of every repository, mobile login/register with the token
  behind `TokenStorage`/SecureStore, gating and logout.
- (2026-09-23) Area brought under SDD. Four decisions settled while specifying
  0001: dev-user data gets **reassigned** to the owner's account (not deleted,
  not orphaned); sessions last **90 days**, fixed, with no renewal; only the
  liveness check stays public; revocation is **deferred to spec 0003** rather
  than dropped.
- (2026-10-16 → 2026-10-17) Spec 0027 — personal profile and body
  measurements. `User` gains bio, height (cm) and a photo; new
  `BodyMeasurement` entries (date plus any of weight, body fat %, muscle %,
  neck, chest, waist, hips, arm, forearm, thigh, calf), owner-scoped. API:
  `GET/PUT /profile`, `PUT/DELETE /profile/photo` (JPEG base64, 512 KB) and
  `GET/POST/PUT/DELETE /measurements` with range checks. Settings is now a
  stack: the account card (avatar + name) opens Profile, with edit (height in
  cm or ft + in), photo from the library (square, 512 px), BMI with its band
  and waist-to-height when height is known, latest value per measurement, an
  entry screen in the display unit and a history screen with chart and
  change. Lengths are canonical in cm (like kg). Needs the
  `add_profile_and_body_measurements` migration (redeploy before the new app
  build) and `expo prebuild` + a rebuild for `expo-image-picker` and
  `expo-image-manipulator`.

- (2026-11-03) Spec 0001 implemented locally: global default-deny auth,
  verified existing account, `/auth/me`, 90-day tokens for all implemented
  providers, no legacy fallback. Mobile validates before rendering user data,
  preserves offline identity/workout, shows a retry notice and guards late
  rejections from an old token. The one-off reassignment includes body
  measurements and detects collisions before deleting the legacy account.
  Typecheck/tests passed. Live reassignment, deploy and device checks remain
  open; configured database connection was unavailable during inspection.
