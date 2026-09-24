---
spec: 0001
status: draft        # blocked: gate 2 (plan review) not passed
created: 2026-09-23
updated: 2026-09-24
---

# Tasks — Auth session hardening

> **Not started.** `plan.md` is written and concrete but pending review. Gate 3
> follows gate 2, and gate 2 is passed by a human, not by the author of the
> plan. The breakdown below is the proposal to review alongside it.

## Proposed task list

Ordering is load-bearing: the reassignment script must run **before** the
boundary closes, or the legacy data is unreachable in the gap. Direction is
`packages/domain` → API → data script → mobile → docs (Article 8: tree green at
every step).

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | Identity DTO for the credential-validation operation, reusing the sign-in response's user shape | domain | `pnpm -r typecheck` | `feat(domain): identity contract for session validation` |
| 2 | Credential-validation operation on the API (additive, nothing breaks) | api | route test: valid token → identity; no/expired token → rejected | `feat(api): endpoint to validate the current session` |
| 3 | 90-day token lifetime at both signing sites; missing `JWT_SECRET` fatal outside development | api | route test with an expired token; start with no secret → refuses to boot | `feat(api): expire sessions after 90 days` |
| 4 | One-off script reassigning the legacy account's rows to the owner's account, then deleting it (`--dry-run` default, `--apply`) | api / data | dry-run counts; apply to dev DB; every routine, workout and setting visible under the real account (AC-9) | `feat(api): script to reassign development-user data to the owner` |
| 5 | Extract the app's boot decision into a pure function (token + server outcome → signed-in / signed-out / offline) | mobile | unit tests covering AC-5 and AC-8 | `refactor(mobile): pure session-boot decision` |
| 6 | Boot validation in `AuthProvider`, distinguishing rejected from unreachable; `offline` renders the app with a non-blocking notice and retry | mobile | `pnpm -r test`; manual: launch signed-in, with a bad token, and offline (active workout opens) | `feat(mobile): validate the stored session at startup` |
| 7 | ~~Keep the active-workout draft alive across a forced sign-out~~ — covered by spec 0010 (FR-7); verify only | — | manual: expire mid-workout, re-authenticate as the same user, save | — |
| 8 | Strict authentication: global hook + allowlist (`GET /health`, `POST /auth/login`, `POST /auth/register`); `resolveUserPublicId` fails instead of falling back; delete `developmentUser.ts` | api | route tests for AC-1/2/3/7/10 | `feat(api): require authentication on every route` |
| 9 | Rework route tests that mock `resolveUserPublicId` so they authenticate for real | api | `pnpm -r test` | `test(api): authenticate route tests instead of mocking user context` |
| 10 | Update roadmap area 3, retire "dev user" from the glossary, set statuses in `../../backlog.md` | docs | links resolve | `docs(sdd): close spec 0001` |

Tasks 4, 6, 7 and 8 are **not verifiable in CI** — they need the dev database,
a deploy, or a device.

Execution order across specs (agreed 2026-09-24): this spec comes after 0010,
0011 and 0012, and before 0015.

## Blocking item

`TODO(sdd): running task 4 needs the target account named (the owner's`
`existing account, readable from the users table on the dev database).`
`Everything else, including writing the script, can start without it.`

## Progress log

- 2026-09-23 — Spec reached `ready` (four decisions resolved). Plan written and
  awaiting review; this breakdown is a proposal, not an approved plan.
- 2026-09-24 — Amended after a review against the code: login/register stay
  public, offline start opens the app, reassignment is a script, task 7 folded
  into spec 0010. Still awaiting gate 2.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/03-auth-and-users.md` checklist and progress log updated
- [ ] `spec.md` status set to `done`; `../../backlog.md` updated
- [ ] Constitution amended with the invariant this settles: **there is no
      anonymous path and no fallback account**
