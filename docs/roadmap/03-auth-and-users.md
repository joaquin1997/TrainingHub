# 3. Auth & users

Replace the hardcoded `user-development` with real authentication and per-user
data scoping.

Specified under SDD — see [../sdd/specs/](../sdd/backlog.md):
[0001 auth session hardening](../sdd/specs/0001-auth-session-hardening/spec.md) (`ready`),
[0002 Sign in with Apple](../sdd/specs/0002-apple-sign-in/spec.md) (`draft`),
[0003 session revocation](../sdd/specs/0003-session-revocation/spec.md) (`draft`),
and [0009 retro: accounts and sessions](../sdd/specs/0009-retro-accounts-and-sessions/spec.md)
for what exists today.

## Checklist
- [x] Email/password provider + JWT, `/auth/register` and `/auth/login`
- [x] API auth middleware available (`app.authenticate`)
- [x] Scope all repositories by the authenticated user
- [x] Mobile login/register flow, token behind `TokenStorage`, gating + logout
- [ ] Reject unauthenticated requests; remove the dev-user fallback — spec 0001
- [ ] Validate the stored session at startup (`/auth/me`) — spec 0001
- [ ] Expire sessions (90 days, decided 2026-09-23) — spec 0001
- [ ] Reassign the dev user's data to the owner's account — spec 0001
- [ ] Server-side session revocation — spec 0003, **before any distribution**
- [ ] Sign in with Apple — spec 0002
- [ ] Password reset / account recovery — unspecified; needs an email capability
- [x] Account / profile screen: name, bio, height, photo, body measurements
  with history (spec 0027 — migration, rebuild and photo check pending)

## Notes
- `packages/domain/src/auth.ts` already has provider contracts, and an Apple
  provider stub exists on the API side.
- Per-user scoping is built but **not enforced**: anonymous requests still fall
  back to a legacy account that is created on demand. That is what spec 0001
  closes; until then, multi-user is advisory.
- Tokens currently never expire, and there is no way to revoke one.
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
