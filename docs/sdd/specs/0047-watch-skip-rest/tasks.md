---
spec: 0047
status: in-progress
created: 2026-11-03
---

# Tasks — Skip rest from the watch

Task gate self-reviewed; implementation tasks 1–4 completed locally 2026-11-04. Every unchecked row is
one independently committable change with its own verification. Additive
contracts land before consumers; no task requires committing broken callers.
Run `pnpm -r typecheck` and `pnpm -r test` before every implementation commit.
Rollout/device rows record acceptance evidence in a documentation commit;
they are not claims that deployment happened during planning.

## Dependencies and order

0046 stable rest/completion identity is required first. Keep optional wire version 1 additions; ship phone capability before new watch UI.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Add optional rest identity/capability/acknowledgement snapshot fields and skip event to domain; existing consumers remain valid. | domain | Typecheck old callers; no required fields added to existing snapshots. | `feat(domain): define watch rest skip protocol` |
| 2 | [x] Encode/decode new wire fields and apply matching-rest skip on phone with state/controller deduplication. | mobile/protocol | AC-1–AC-3, AC-5–AC-6; malformed/stale/newer rest, paused/no rest, same-set retick, event acknowledgement and runner alert cancellation. | `feat(mobile): handle watch requests to skip a rest` |
| 3 | [x] Update Swift wire/model queue with Done-derived rest ID, local suppression and explicit pending acknowledgement. | watch | AC-3–AC-4, EF-1–EF-3; Done then immediate Skip before context, old context, queue reconnect/restart, capability absent. Compile watch target. | `feat(watch): queue and reconcile specific rest skips` |
| 4 | [x] Add accessible translated Skip control and pending state without affecting Done or workout order. | watch/mobile | AC-1, AC-4–AC-6; enabled only when supported/unpaused/running; 44 pt and no extra confirmation. | `feat(watch): skip rests from the wrist` |
| 5 | [ ] Rebuild/install phone and watch and document physical locked/offline/expiry checks. | docs/device | AC-1–AC-6; <=5 s connected cancellation, no former alert, old/new version matrix and no 0045 regression. | `docs(sdd): record watch rest skip acceptance` |

## Rollout and device acceptance

Native watch and paired phone build/install required. No API migration. Physical testing must cover locked phone, phone out of contact, queue replay, natural-expiry race, supersets/warm-ups, and unchanged accepted 0045 Health/battery behaviour.

## Definition of done

- [ ] All spec FR/EF/AC cases satisfied; unresolved investigations remain explicit.
- [ ] Required typecheck/tests pass; backward compatibility and ownership checked.
- [ ] Required migrations, API/bundle delivery and native rebuilds recorded separately.
- [ ] Physical-device/operational checks have evidence, not inferred from unit tests.
- [ ] Roadmap/backlog updated; mark spec/plan/tasks done only after acceptance.

## Progress log

- 2026-11-03 — Implementation plan and task breakdown prepared and self-reviewed.
  No implementation task completed; no deployment or device acceptance in this pass.

- 2026-11-04 — Tasks 1–4 implemented with shared optional wire fields, phone
  identity/ack handling, durable native suppression/pending state and ES/EN
  accessible control. Native typecheck and Release build pass; task 5 remains
  open for installation/physical acceptance. See verification.md.

- 2026-11-04 — API-first rollout and paired phone/Watch Release installation
  completed from source 6655b1f; both apps launched. Delivery part of the
  final task is complete; physical cases remain unchecked. See verification.md.
