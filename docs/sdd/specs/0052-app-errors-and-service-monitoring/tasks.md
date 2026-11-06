---
spec: 0052
status: draft
created: 2026-11-03
---

# Tasks — Diagnostics and service monitoring

Task gate self-reviewed; implementation not started. Every unchecked row is
one independently committable change with its own verification. Additive
contracts land before consumers; no task requires committing broken callers.
Run `pnpm -r typecheck` and `pnpm -r test` before every implementation commit.
Rollout/device rows record acceptance evidence in a documentation commit;
they are not claims that deployment happened during planning.

## Dependencies and order

No dependency on training-schema changes. Task 1 is a mandatory technical gate: if native expiry/privacy or provider semantics fail, revise the plan before task 3/activation. 0048 investigation can use safe diagnostics only after deployment, not during this planning pass.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [ ] Build a disabled/local harness proving pinned SDK support, native/JS sanitizer and bounded 30-day cache expiry; record exact provider compatibility and stop if requirements fail. | spike/docs | AC-1, AC-5–AC-7; actual Expo/RN build/web, synthetic canaries and stale native envelope before upload. No external DSN enabled. | `test(monitoring): verify diagnostic adapter constraints` |
| 2 | [ ] Add Diagnostics/no-op contract, pure allowlist sanitizer and bounded queue with fake delivery tests. | domain/mobile | AC-1, AC-5–AC-6; 50 events/256 KiB, oldest eviction, expiry, nonrecursive failure, no user/notes/body/headers. | `feat(monitoring): define safe diagnostic reporting` |
| 3 | [ ] Integrate the verified SDK adapter/root boundary and operation captures behind disabled-by-default config; remove raw-body API logs and redact authorization. | mobile/api | AC-1, AC-5–AC-6; grouping/operation/release, expected offline/validation silent, raw event audit incl native path; old native build fallback. | `feat(monitoring): capture redacted app failures` |
| 4 | [ ] Implement private probe pure state machine/provider adapter/atomic state, lock, status CLI and systemd templates. | ops | AC-2–AC-5; fake clock/fetch for 3 failures/2 successes, DB-vs-network, no overlap, retries and stale/unknown state. | `feat(ops): monitor private service availability` |
| 5 | [ ] Prepare maintainer setup/runbook for projects, email destination, 30-day retention, independent heartbeat and timed mute, without activating accounts or sending alerts. | docs/ops | AC-4, AC-7; env shapes only, 60+240 s heartbeat, failure domains, native watch gap and expiry/unmute test procedure. | `docs(ops): document monitoring activation and recovery` |
| 6 | [ ] After concrete maintainer configuration/activation authorization, verify actual retention/redaction, diagnostic grouping, observer outage/recovery and timed mute; rebuild/install native app. | docs/acceptance | AC-1–AC-7 and all technical stop gates; observer remains independent, no duplicate outage emails, stale reporting visible, sample errors and 30-day-expiry fixtures. | `docs(sdd): record operational monitoring acceptance` |

## Rollout and device acceptance

One new native diagnostic SDK requires release native rebuild/reinstall and symbol-map checks; web tested separately. No external account creation, payment, recipient configuration or test notification in this task breakdown itself. Exact runtime credentials, probe host and maintainer destination must exist before acceptance; native watch crashes explicitly uncovered initially.

## Definition of done

- [ ] All spec FR/EF/AC cases satisfied; unresolved investigations remain explicit.
- [ ] Required typecheck/tests pass; backward compatibility and ownership checked.
- [ ] Required migrations, API/bundle delivery and native rebuilds recorded separately.
- [ ] Physical-device/operational checks have evidence, not inferred from unit tests.
- [ ] Roadmap/backlog updated; mark spec/plan/tasks done only after acceptance.

## Progress log

- 2026-11-03 — Implementation plan and task breakdown prepared and self-reviewed.
  No implementation task completed; no deployment or device acceptance in this pass.
