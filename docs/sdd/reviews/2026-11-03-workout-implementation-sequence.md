# Workout implementation sequence — 2026-11-03

The original planning pass prepared all reviewed work under delegated gates.
Current update (2026-11-03): 0043 implementation tasks 1–7 are complete locally;
rollout/acceptance remain pending. 0042 implementation tasks 1–7 are also
complete locally; its rollout/device acceptance remains open. 0046 tasks 1–4
were implemented locally 2026-11-04; bundle delivery and physical-device
acceptance remain pending. Other task
lists retain their own current implementation
status; the planning validation at the end records the earlier baseline.

The specs were committed in `c9f593b` on `docs/workout-improvements-planning`,
created from the same master baseline as the preceding documentation branch.
No push, pull request, deployment, database edit or external activation is
part of this planning pass.

## Implementation order

Preserve the previously agreed 0043 → 0042 priority. 0042 was outside the
original batch and is now implemented locally; its agreed place is after
0043 and before 0046.
Within the original batch the proposed sequence is:

| Order | Spec | Plan | Tasks | Dependency / purpose |
|---|---|---|---|---|
| 1 | 0043 warm-ups/types | [Plan](../specs/0043-smarter-warm-ups/plan.md) | [Tasks](../specs/0043-smarter-warm-ups/tasks.md) | Existing priority. Personal preferences, count/increment and explained types. |
| After 0043 | 0042 readable progress | [Plan](../specs/0042-readable-exercise-progress/plan.md) | [Tasks](../specs/0042-readable-exercise-progress/tasks.md) | Agreed priority. Coherent per-workout evidence, trained-exercise lookup and explicit metrics/periods; no migration/native module changes. |
| 2 | 0046 row/undo/Finish | [Plan](../specs/0046-set-rows-and-finish/plan.md) | [Tasks](../specs/0046-set-rows-and-finish/tasks.md) | Stable rest/completion identity supports 0047. |
| 3 | 0048 record feedback | [Plan](../specs/0048-trustworthy-live-records/plan.md) | [Tasks](../specs/0048-trustworthy-live-records/tasks.md) | Freeze comparison references, preserve existing PR definitions; investigate original defect separately. |
| 4 | 0047 watch skip | [Plan](../specs/0047-watch-skip-rest/plan.md) | [Tasks](../specs/0047-watch-skip-rest/tasks.md) | Requires 0046 rest identity; acknowledgement and native watch changes. |
| 5 | 0053 grouped records | [Plan](../specs/0053-records-grouped-by-exercise/plan.md) | [Tasks](../specs/0053-records-grouped-by-exercise/tasks.md) | Prefer final 0048 vocabulary; existing saved PR DTOs make this independently buildable. |
| 6 | 0050 saved corrections | [Plan](../specs/0050-correct-saved-workout/plan.md) | [Tasks](../specs/0050-correct-saved-workout/tasks.md) | Atomic scalar corrections, legacy completion normalization and refresh. |
| 7 | 0051 routine review | [Plan](../specs/0051-offer-routine-update/plan.md) | [Tasks](../specs/0051-offer-routine-update/tasks.md) | Source snapshot/edit provenance, revision-aware writes and stable history links. |
| 8 | 0049 side weights | [Plan](../specs/0049-weight-per-side/plan.md) | [Tasks](../specs/0049-weight-per-side/tasks.md) | Extends stable shared rules, 0050 allowlists and 0051 selected targets; capability guards before opt-in. |
| Separate track | 0052 monitoring | [Plan](../specs/0052-app-errors-and-service-monitoring/plan.md) | [Tasks](../specs/0052-app-errors-and-service-monitoring/tasks.md) | Diagnostic constraints harness first; external activation/configuration later. |

This is a dependency proposal for later implementation, not authorization to
start implementing every feature or to deploy infrastructure during planning.

## Cross-feature rules

- Keep one owner-scoped active envelope, version 1 with validated optional
  additions. None of the specs may discard older active workouts to simplify
  hydration. Changes to preference/reference/snapshot fields must compose.
- 0046 owns stable rest identity; 0047 reuses it and derives a watch-started
  rest's identity from the Done request so immediate Done → Skip can queue.
- 0011 pauses workout time, not the rest countdown. Skip remains unavailable
  while the workout is paused; do not add an unrequested rest-freeze mechanism.
- Existing historical reps-at-weight considers that weight or heavier.
  Last-session improvement in 0048 compares exactly the same weight. Explain
  both scopes; do not silently redefine personal records.
- Performed warm-ups remain included in existing general volume but excluded
  from working-set PRs/comparison totals where those already exclude them.
  Shared multiplication helpers must not unify these distinct eligibility rules.
- 0050 normalizes legacy completion only on explicit correction, preserving
  previously performed values. It never bulk-migrates personal training rows.
- 0051 stores an immutable source snapshot and explicitly edited targets;
  last-time suggestions, completion and generated approach additions are not
  routine edits. Routine archive/revision work must preserve saved history links.
- 0049 extends side-pair rules end to end. Older clients must be asked to
  update rather than receive a fictitious shared load or erase side fields.

## Delivery and acceptance gates

| Spec | Migration / API | Native / operational acceptance |
|---|---|---|
| 0043 | Personal preference table and authenticated read/write before bundle | Both preview contexts, two users/devices, configurable steps/counts and explained types. |
| 0046 | None | Actual connected-watch cancel after undo; unresolved native issue stays pending until paired fix. |
| 0047 | None | Rebuild/install paired phone/watch; locked phone, natural expiry, disconnected queue and acknowledgement. |
| 0048 | Batched authenticated reference read, no schema migration | Original expected-vs-observed record case must be reproduced/fixed or explicitly checked by owner before closure. |
| 0049 | Additive side fields/mode snapshots and capability guards before opt-in | Round trips, shared legacy results, actual display/shares/watch and safe older-client rejection. |
| 0050 | Revision/idempotency fields and atomic owner-scoped correction | Real database concurrency/rollback/legacy tests plus navigation, focus refresh and widget. |
| 0051 | Revision/mutation/archive fields and stable-ID transaction writer | Ordinary-editor conflict, next-workout targets, archived links and finish-and-start review path. |
| 0052 | No training-data migration or public telemetry route | Pinned SDK/native redaction and cache expiry proof; 30-day project retention; actual private probe host, maintainer notification destination and independent heartbeat/mute expiry. Native watch crash gap explicit. |
| 0053 | None | Summary in both languages/themes at 320 pt, large text and accessible reading order. |

All rollout/device tasks are unchecked. Credentials, concrete operational
hosts and destinations must be supplied/configured before activating services;
no paid vendor plan, account, recipient or notification is created here.

## Verification for the planning artifacts

Validate local links, front matter/spec IDs/statuses, complete AC mappings,
unchecked implementation tasks and absence of conflicting rest-pause wording.
Run repository-required typecheck/tests before documentation commits. These
checks validate existing source and the documentation; they do not prove any
new feature has been implemented or accepted on devices.

Validation completed: all nine plan/task pairs, 57 unchecked tasks, complete
AC mappings, 131 changed-document relative links and whitespace checks pass.
`pnpm -r typecheck` passed; `pnpm -r test` passed 1,242 tests (795 mobile,
447 API). These are baseline code checks; none of the new feature tests or
operational/device acceptance tasks has been executed yet.

## Delivery update — 2026-11-04

0042/0043 API and paired Release app delivery, plus 0046 app delivery, are
complete. Feature-specific physical acceptance remains open. The owner’s
0045 locked-phone regression is reopened; its initial-mirror retry and
immediate-event fallback are included in both installed apps. See each
spec’s verification/tasks for the distinction between delivery and acceptance.
