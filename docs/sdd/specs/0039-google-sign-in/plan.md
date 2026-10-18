---
spec: 0039
status: approved     # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Plan — Sign in with Google

## Design

**Mobile** (`expo-auth-session` ~58.0.13, `expo-web-browser` ~58.0.6,
`expo-crypto` ~58.0.7 — the SDK 58 versions; Expo's own OAuth client, works
on iOS, Android and web; no Google SDK and no client secret in the app):

- `config/google.ts`: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`,
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Android follows the spec's TODO);
  `googleClientIdForPlatform()` and `isGoogleSignInConfigured()` (pure).
- `features/auth/providers/googleSignIn.ts`: authorization code + PKCE
  against Google's discovery document, redirect
  `com.googleusercontent.apps.<id>:/oauthredirect` on iOS, code exchanged for
  tokens (iOS clients are public, no secret), returns the `id_token`; the
  web build asks for the `id_token` directly with a nonce (Google web clients
  need a secret for the code exchange); cancel → `null` (EF-1).
- `AuthContext.signInWithGoogle(idToken)` → `authClient.google` →
  `persist` (FR-2). `AuthLandingScreen`: "Continue with Google" when
  configured (FR-1), one-line errors (EF-2, EF-3, EF-5).
- `app.config.js`: when `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is set, the
  reversed client id is added to `ios.infoPlist.CFBundleURLTypes` so the
  redirect returns to the app.

**API**:

- Migration `20261018180000_add_user_identities`: `UserIdentity (id,
  userId → User, provider, subject, email, createdAt)`, unique
  `(provider, subject)`.
- `features/auth/googleIdToken.ts`: verifies the RS256 signature with
  Google's JWKS (`https://www.googleapis.com/oauth2/v3/certs`, cached by
  `kid`, refetched on an unknown `kid`), `iss` ∈ {`accounts.google.com`,
  `https://accounts.google.com`}, `aud` ∈ `GOOGLE_CLIENT_IDS` (comma list of
  the iOS/Android/web client ids), `exp` in the future; returns `sub`,
  `email`, `email_verified`, `name`. `node:crypto` only (no dependency).
- `POST /auth/google { idToken }` → `{ token, user }` (same as login):
  identity found → its user (FR-4); else verified email match → link (FR-5);
  else email taken and unverified → 409 (EF-4); else create user without
  password + identity (FR-6). `GOOGLE_CLIENT_IDS` unset → 503 (EF-5).
- Email login already refuses users without a password hash (FR-7) — checked
  and covered by a test.

## Owner steps (to activate)

1. Google Cloud Console → APIs & Services → OAuth consent screen (External,
   app name TrainingHub, scopes `openid email profile`, add yourself as test
   user).
2. Credentials → Create OAuth client ID:
   - **iOS**: bundle id `com.joaquin.traininghub` → iOS client id.
   - **Web application** (for the web build; optional): authorised origin
     of the web preview.
3. `apps/mobile/.env`: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=…` (and the others);
   `apps/api/.env`: `GOOGLE_CLIENT_IDS=<ios id>,<web id>`; `scripts/run.sh`
   passes it to the container.
4. Deploy (migration + API), then a native rebuild.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 3 | yes | `GoogleSignInInput` in the domain; response is `AuthTokenResponse`. |
| 5 | yes | One additive migration. |
| 6 | yes | Google behind the client provider module and the server verifier. |
| 7 | yes | Only public client ids; no secret in the app; server ids via env. |
| 9 | yes | Three Expo SDK packages at the SDK's versions; native → rebuild. |
