---
spec: 0039
status: in-progress  # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Tasks — Sign in with Google

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Spec, plan and tasks | docs | — | `docs(sdd): spec 0039 google sign-in` |
| 2 | [x] API: identities migration, ID token verifier, `POST /auth/google` with linking | api | api tests | `feat(auth): google sign-in on the api` |
| 3 | [x] Mobile: config, Google flow, AuthContext, button; URL scheme in app config | mobile | unit tests; web | `feat(auth): continue with google` |
| 4 | [x] Docs: backlog, roadmap, 0002 decisions | docs | — | `docs(sdd): record 0039 implementation` |
| 5 | [ ] [OWNER] Create the OAuth clients and set the env (plan, *Owner steps*) | owner | — | — |
| 6 | [ ] [DEPLOY] migration `add_user_identities`, API redeploy with `GOOGLE_CLIENT_IDS` | server | owner | — |
| 7 | [ ] [DEVICE] AC-2 – AC-6 on the iPhone | device | owner | — |

## Progress log

- (2026-10-18) Tasks 1–4 done. Decisions by the owner: Google only for now
  (Apple needs a paid team — verified by building with the entitlement),
  code ready and inactive until the OAuth clients exist, and linking by
  verified email. **API**: migration `20261018180000_add_user_identities`
  (`UserIdentity`, unique provider + subject); `googleIdToken.ts` verifies
  RS256 with Google's JWKS (cached by `kid`), issuer, audience in
  `GOOGLE_CLIENT_IDS`, expiry — tested with locally generated keys;
  `googleSignIn.ts` decides existing / link / create / conflict (tested);
  `POST /auth/google` → `{ token, user }`, 503 when not configured, 409 for an
  unverified email that has an account; route tests cover each path and
  that email login refuses a password-less account. `scripts/run.sh` passes
  `GOOGLE_CLIENT_IDS` to the container. **Mobile**: `expo-auth-session`,
  `expo-web-browser`, `expo-crypto` at the SDK 58 versions; `config/google.ts`
  (tested); `providers/googleSignIn.ts` — iOS: code + PKCE to the reversed
  client id, exchanged without a secret; web: ID token with a nonce;
  `AuthContext.signInWithGoogle`; "Continue with Google" under an "or"
  divider only when the platform's client id is set; errors in the app's
  language. `app.config.js` registers the reversed client id as a URL scheme
  when set. Android stays a TODO in the spec. 757 mobile + 396 API tests.
