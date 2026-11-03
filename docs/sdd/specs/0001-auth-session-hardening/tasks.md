---
spec: 0001
status: in-progress
created: 2026-09-23
updated: 2026-11-03
---

# Tasks — Auth session hardening

Approved by the owner's implementation request on 2026-11-03, under the
previously delegated gates. Code complete locally; rollout is separate and
must preserve the order below. No server ownership changes or deploy yet.

| # | Task | Area | Verification |
|---|---|---|---|
| 1 | [x] Shared identity DTO reusing the sign-in user | domain | typecheck |
| 2 | [x] Read-only credential validation and existing-account check | API | identity, unknown account and database failure route tests |
| 3 | [x] 90-day expiry for email and Google; secret required outside development/test; reject non-expiring legacy credentials | API | expiry, uniform rejection and secret tests |
| 4 | [x] Reassignment script, dry-run default, explicit target, serializable transaction, counts/IDs, favorites dedupe, measurements, collision checks and idempotency | data | script unit tests; live application is task 11 |
| 5 | [x] Pure signed-in/signed-out/offline startup decision | mobile | startup decision tests |
| 6 | [x] Boot identity validation, timeout, offline notice/Retry, late-response protection | mobile | typecheck, HTTP/startup tests; device acceptance is task 13 |
| 7 | [x] Keep existing 0010 persistence and foreign-account protections | mobile | existing persister/owner suites; device acceptance is task 13 |
| 8 | [x] Global strict authentication; exact public credential/health allowlist; remove development-user fallback and creation | API | anonymous feature operations, bad credentials and future-route tests |
| 9 | [x] Route tests use real signed tokens and real user resolution, mocking persistence only | tests | full API suite |
| 10 | [x] Update roadmap, glossary, constitution and spec/backlog status honestly | docs | diff/link review |
| 11 | [ ] **[ROLLOUT]** Back up, identify owner, dry-run/review/apply reassignment, verify all owned data is accessible as owner | server | apply report and counts; before strict API deploy |
| 12 | [ ] **[DEPLOY]** Confirm secret configured, deploy API then app bundle; anonymous health works, anonymous data fails, new login works | server/mobile | live requests |
| 13 | [ ] **[DEVICE]** Cold start valid/rejected/offline; notice/Retry; mid-session rejection with active workout, same-user sign-in and save; different-user isolation | owner | AC-4–AC-6, AC-8, EF-4 |

## Progress log

- 2026-09-23/24 — Original spec/plan and proposed task breakdown.
- 2026-11-03 — Implementation requested. Plan refreshed against current code:
  Google remains a public credential operation; body measurements join the
  reassignment; unknown accounts and non-expiring legacy tokens are rejected.
  Tasks 1–10 complete locally. `pnpm -r typecheck` and `pnpm -r test` passed.
  Database unavailable through the configured local connection during a
  read-only inspection attempt; no live rows were changed. Tasks 11–13 remain.

## Definition of done

- [x] Local implementation and automated checks cover the accepted behaviour
- [x] Roadmap/glossary/backlog updated; strict-boundary invariant recorded
- [ ] Legacy data reassigned and verified on the server (AC-9)
- [ ] API and app deployed; public/protected boundary checked live
- [ ] Device acceptance and active-workout reauthentication checked
- [ ] `spec.md` / backlog set to `done` only after rollout and acceptance
