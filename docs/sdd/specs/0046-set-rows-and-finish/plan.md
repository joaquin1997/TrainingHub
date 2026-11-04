---
spec: 0046
status: approved
created: 2026-11-03
---

# Plan — Completed values, undo selection and top Finish

Self-reviewed against the constitution and the owner's spec review. Implementation tasks 1–4 completed locally on 2026-11-04;
see verification.md. No migration or external activation. Physical-device
acceptance and mobile bundle delivery remain pending.

## Constitution check

| Article | Compliance |
|---|---|
| 1 | Bounded workout presentation/undo changes; no new record or rest-length rules. |
| 2 | Only active performed draft changes; routines untouched. |
| 3 | No duplicated API entities; existing bridge interfaces retained. |
| 4 | No weight conversion/storage changes. |
| 5 | No schema changes; optional local envelope fields. |
| 6 | Use existing rest alerts, live/watch interfaces. |
| 7 | No credentials or user values logged. |
| 8 | State, selector, UI and acceptance slices remain independently verifiable. |
| 9 | No new packages; native correction only if required by device evidence. |
| 10 | Legacy missing-origin fallback and pause semantics explicit. |
| 11 | Preserve owner-scoped hydration and 0001 save recovery. |

## Current code and approach

`WorkoutSetRow` sets placeholder color independently of `done`; change only
its rendered placeholder color to `colors.text` while done, including each
side/time/distance field. Do not materialize suggestions into input strings:
undo must recover ghosted values and preserve typed ones.

`currentSetToDo` anchors to last ticked exercise; add an optional draft
`undoSelection: { workoutExerciseId, workoutSetId }`. Prefer that exact set
when still unfinished, except that `nextInSuperset` resolves its block's lowest
unfinished round. Clear on subsequent completion or removal; validate on
hydrate and on every resolution. Keep all surfaces on this one selector.

A RunningRest currently has an exercise but no originating set. Add optional
`id`, `originSetId`, `originExerciseId`, and `originCompletionId`; give each
new successful completion a fresh local completion token. `startRest` accepts
origin context, and `completeSetInRounds` passes the actual triggering set,
not `restOwner` (which may be another member). Undo compares completion token
before clearing it and calling the existing skip path. Adjusting seconds
preserves rest identity. Old restores without origin are never guessed.
ID generation uses a collision-safe existing helper, including after hydration.

Route phone undo through one state transition that preserves values, sets
selection and conditionally clears rest. The runner already cancels scheduled
alerts on absent rest; live/watch controllers already subscribe to draft
changes. A disconnected watch may buzz before receipt; do not promise remote
cancellation without delivery. Native acknowledgement coverage is shared with
0047; no new watch button in this slice.

Add top Finish in the existing header surface, using the same in-flight guard
and finish handler as the bottom action. Confirm before the top action only;
check no completed sets first. Render failure near the visible header and
retain current reauthentication/permanent-rejection actions. Check the draft
identity again when asynchronous confirmation resolves so it cannot finish
a replacement workout. At most one filled primary action: top action uses a
secondary header treatment. Never duplicate save logic or summary navigation.

### Alternatives considered

- Reset to first unfinished exercise: loses the explicit latest undo.
- Anchor only to exercise: cannot select a later undone set or distinguish
  unrelated rests within one exercise.
- Cancel by rest end time: +/- rest changes time and breaks identity.
- Write suggested values on completion: changes undo semantics unnecessarily.

## Contracts, schema and API

Draft-only selection/origin fields; no Prisma migration or API change.
Store them in the existing owner-scoped envelope as optional validated fields;
keep version 1 and ignore malformed additions, preserving old workouts.
No shared watch shape change required for 0046: clearing `restEndsAt` and
sending up-next follows existing interfaces. 0047 adds explicit rest identity.

## Pause clarification

0011 pauses workout elapsed time, not the independent rest countdown; current
`pauseWorkout` does not freeze rest. Spec language about a paused rest is
interpreted as a rest while the workout is paused. Undo cancels it by origin
under the same rule; this plan does not add rest-timer pause functionality.

## Verification mapping

| Spec criteria | Checks |
|---|---|
| AC-1–AC-2 | Done placeholder vs typed values across tracking types/sides; visual dark/light checks. |
| AC-3–AC-4, AC-8 | Exact undo selection, multiple undos, superset precedence, remove/hydrate round trip and all surface labels. |
| AC-5–AC-7 | Header reachability, confirm/cancel, no-set guard, double tap and visible failed-save recovery. |
| AC-9–AC-11 | Same-set cancellation; another set in same exercise untouched; actual round trigger differs from rest owner; old origin absent; retick/replayed cancellation never affects newer completion. |
| EF-1–EF-5 | Error/confirmation identity races, paused workout with rest, watch disconnect/reconnect. |

Use pure state/selector, runner and controller suites. Actual layout, haptics
and locked-phone watch cancellation require physical-device checks.

## Files to touch

- `apps/mobile/src/features/workouts/state/workoutDraftStore.ts` and tests.
- `apps/mobile/src/features/workouts/superset/rounds.ts` and tests.
- `apps/mobile/src/features/workouts/restTimer/nextSetToDo.ts`, runner tests.
- `apps/mobile/src/features/workouts/persistence/activeWorkoutEnvelope.ts`, tests.
- `apps/mobile/src/features/workouts/components/WorkoutSetRow.tsx`, `StickyWorkoutHeader.tsx`.
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx`.
- `apps/mobile/src/features/workouts/watch/watchProtocol.test.ts`, controller tests.
- `apps/mobile/src/i18n/locales/{en,es}.ts`, `docs/sdd/glossary.md`, roadmap/backlog.

## Risks and rollout

No native dependency. Deliver the mobile bundle after state/runner regressions
pass; verify the installed watch consumes a cleared rest context, otherwise
include its correction in the 0047 native rebuild. Preserve 0045 background
behaviour. Roll back bundle; optional envelope additions remain readable.
Do not mark done until the connected-watch cancellation has been observed.
