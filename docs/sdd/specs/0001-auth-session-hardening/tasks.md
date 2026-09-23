---
spec: 0001
status: draft        # blocked: gate 2 (plan review) not passed
created: 2026-09-23
updated: 2026-09-23
---

# Tasks — Auth session hardening

> **Not started.** `plan.md` is written and concrete but pending review. Gate 3
> follows gate 2, and gate 2 is passed by a human, not by the author of the
> plan. The breakdown below is the proposal to review alongside it.

## Proposed task list

Ordering is load-bearing: the reassignment migration must land **before** the
boundary closes, or the legacy data is unreachable in the gap. Direction is
`packages/domain` → migration → API → mobile → docs (Article 8: tree green at
every step).

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | Identity DTO for the credential-validation operation, reusing the sign-in response's user shape | domain | `pnpm -r typecheck` | `feat(domain): identity contract for session validation` |
| 2 | Credential-validation operation on the API (additive, nothing breaks) | api | route test: valid token → identity; no/expired token → rejected | `feat(api): endpoint to validate the current session` |
| 3 | 90-day token lifetime at both signing sites; missing `JWT_SECRET` fatal outside development | api | route test with an expired token; start with no secret → refuses to boot | `feat(api): expire sessions after 90 days` |
| 4 | Hand-written data migration reassigning the legacy account's rows to the owner's account, then deleting it | api / data | apply to dev DB; every routine, workout and setting visible under the real account (AC-9) | `feat(api): reassign development-user data to the owner` |
| 5 | Extract the app's boot decision into a pure function (token + server outcome → signed-in / signed-out / offline) | mobile | unit tests covering AC-5 and AC-8 | `refactor(mobile): pure session-boot decision` |
| 6 | Boot validation in `AuthProvider`, distinguishing rejected from unreachable | mobile | `pnpm -r test`; manual: launch signed-in, with a bad token, and offline | `feat(mobile): validate the stored session at startup` |
| 7 | Keep the active-workout draft alive across a forced sign-out (EF-4) | mobile | manual: expire mid-workout, re-authenticate, save | `fix(mobile): keep the active workout across re-authentication` |
| 8 | Strict authentication: global hook + `GET /health` allowlist; `resolveUserPublicId` fails instead of falling back; delete `developmentUser.ts` | api | route tests for AC-1/2/3/7 | `feat(api): require authentication on every route` |
| 9 | Rework route tests that mock `resolveUserPublicId` so they authenticate for real | api | `pnpm -r test` | `test(api): authenticate route tests instead of mocking user context` |
| 10 | Update roadmap area 3, retire "dev user" from the glossary, set statuses in `../../backlog.md` | docs | links resolve | `docs(sdd): close spec 0001` |

Tasks 4, 6, 7 and 8 are **not verifiable in CI** — they need the dev database,
a deploy, or a device.

## Blocking item

`TODO(sdd): task 4 needs the target account named (the owner's existing`
`account, readable from the users table on the dev database). Everything else`
`can start without it.`

## Progress log

- 2026-09-23 — Spec reached `ready` (four decisions resolved). Plan written and
  awaiting review; this breakdown is a proposal, not an approved plan.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/03-auth-and-users.md` checklist and progress log updated
- [ ] `spec.md` status set to `done`; `../../backlog.md` updated
- [ ] Constitution amended with the invariant this settles: **there is no
      anonymous path and no fallback account**
