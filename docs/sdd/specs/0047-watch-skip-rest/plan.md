---
spec: 0047
status: approved
created: 2026-11-03
---

# Plan — Skip rest on the watch

Self-reviewed against the constitution and the owner's spec review. Design
only: no implementation, migration, external activation or device acceptance.

## Constitution check

| Article | Compliance |
|---|---|
| 1 | Skip only; no watch-owned workout plan or time adjustments. |
| 2 | No routine or logged measurement changes. |
| 3 | Event/snapshot contracts in domain; wire adapters have transport-only mirrors. |
| 4 | No new numeric weight payloads. |
| 5 | No database changes. |
| 6 | All traffic uses existing WatchWorkoutBridge. |
| 7 | No personal measurements in diagnostics. |
| 8 | Phone handling precedes watch controls; native acceptance separate. |
| 9 | No new library; native rebuild explicitly required. |
| 10 | Pending acknowledgements, old builds and offline alert limits explicit. |
| 11 | Same active owner/workout checks as existing watch events. |

## Current code and approach

`WatchWorkoutEvent`/`WatchEventWire` support done/pause/resume/finish/discard,
not skip. The watch locally starts rest on Done; the phone sends an absolute
end. Add specific-rest identity rather than a generic cancel command.
0046 establishes stable rest IDs/completion origin, independent of `endsAt`.

Extend snapshot with optional `restId`, `canSkipRest`, `lastProcessedSkipId`
and capability `restSkipVersion: 1`; add event `skipRest` carrying request ID,
workout ID, `restId` and event time. For a local rest started by watch Done,
use its existing unique Done event ID as the eventual rest ID; pass that ID
through `applyWatchEvent` into completion. Phone completions use fresh IDs.
This permits queued Done then Skip before the first context comes back.

Decode only well-formed events. Apply when current workout/rest IDs match and
workout is not paused; replay, expired rest and older-rest events are no-ops.
Use controller deduplication as an optimization, never the sole safeguard
(its 200-ID cache disappears after restart). Remove rest through the shared
state transition; runner cancels alert and live status refreshes. Return
`lastProcessedSkipId` even for an obsolete skip so the watch can stop waiting
and reconcile with authoritative state.

Wire fields remain optional in version 1; old watch decoders ignore them and
new watch hides Skip when the phone lacks the capability. Encode translated
Skip/waiting/unsupported labels through `WatchLabels`; mirror Swift keys and
extend wire parity tests. Native PhoneWatchLink forwards opaque JSON: inspect
it in implementation and change only if it validates event kinds.

On tap, suppress that rest locally, invalidate its timer and haptic, queue
the skip using the existing ordered WatchConnectivity event path. Track a
pending `{requestId, restId}` until the matching acknowledgement. An unrelated
metrics/context update must not resurrect a pending skipped rest. A newer
phone rest supersedes local suppression; an older `sentAtMs` context must not
replace newer state. Preserve Done/Skip order across reconnection/restart.

### Alternatives considered

- Send “skip current rest” without identity: delayed delivery cancels new rest.
- Treat missing countdown as acknowledgement: ambiguous during context races.
- Duplicate workout order on the watch: contradicts accepted 0045 design.

## Contracts, schema and API

Shared changes in `packages/domain/src/health.ts`. No backend route, database
migration or new provider. The TS wire adapter and Swift Codable declarations
mirror only transport keys; business ordering remains phone-owned.

## Pause clarification

0011's existing rest countdown continues while workout time is paused. Skip
is unavailable during pause; resume restores it if the rest is still active.
No independent rest-freezing behaviour is introduced. This corrects the
ambiguous “rest stays paused” wording in the earlier 0047 draft.

## Verification mapping

| Spec criteria | Checks |
|---|---|
| AC-1–AC-2 | Protocol/controller/runner cancellation plus locked-phone device check <=5 s and no later haptic/alert. |
| AC-3, AC-6 | Old rest ID, repeated skip, retick/new rest, invalid event, paused/no rest, old/new build capability matrix. |
| AC-4 | Done then immediate Skip offline, ordered queue, explicit pending ID, acknowledgement and fresh/newer context after reconnect/restart. |
| AC-5 | Superset/warm-up next set and reps preserved; no completion or measurement change. |
| EF-1–EF-4 | Phone alert limitation, natural expiry race, capability fallback and unchanged pause semantics. |

## Files to touch

- `packages/domain/src/health.ts`.
- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts`, `superset/rounds.ts` (0046 ID reuse).
- `apps/mobile/src/features/workouts/watch/{watchProtocol,watchWorkoutController}.ts`, tests.
- `apps/mobile/src/features/health/providers/{appleWatch,appleWatchWire}.ts`, wire tests.
- `apps/mobile/targets/watch/{WatchWire,WorkoutModel,WorkoutView}.swift`.
- `apps/mobile/modules/watch-workout/ios/PhoneWatchLink.swift` only if needed for transport.
- `apps/mobile/src/features/workouts/restTimer/restTimerRunner.test.ts`, ES/EN labels.
- `docs/sdd/specs/0047-watch-skip-rest/`, roadmap 2/8 and backlog.

## Risks and rollout

Native watch rebuild/install required; build the paired phone artifact for
wire/capability delivery. Deploy phone support before enabling new watch UI.
Test locked phone, disconnected phone, natural expiry and immediate Done/Skip.
No API deployment. Rollback watch/phone preserves old queue decoding; unknown
new events are ignored by old phone and the new watch must show unsupported
instead of claiming synchronization. 0045's battery/Health behaviour unchanged.
