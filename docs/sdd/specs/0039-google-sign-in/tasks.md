---
spec: 0039
status: in-progress  # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Tasks — Sign in with Google

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [ ] Spec, plan and tasks | docs | — | `docs(sdd): spec 0039 google sign-in` |
| 2 | [ ] API: identities migration, ID token verifier, `POST /auth/google` with linking | api | api tests | `feat(auth): google sign-in on the api` |
| 3 | [ ] Mobile: config, Google flow, AuthContext, button; URL scheme in app config | mobile | unit tests; web | `feat(auth): continue with google` |
| 4 | [ ] Docs: backlog, roadmap, 0002 decisions | docs | — | `docs(sdd): record 0039 implementation` |
| 5 | [ ] [OWNER] Create the OAuth clients and set the env (plan, *Owner steps*) | owner | — | — |
| 6 | [ ] [DEPLOY] migration `add_user_identities`, API redeploy with `GOOGLE_CLIENT_IDS` | server | owner | — |
| 7 | [ ] [DEVICE] AC-2 – AC-6 on the iPhone | device | owner | — |

## Progress log
