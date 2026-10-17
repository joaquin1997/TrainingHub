---
spec: 0029
status: approved     # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Plan — Supersets that flow in rounds

Everything happens on the device. Rounds, the current round and the next set
are derived from the draft's set positions and done marks; the only new stored
thing is one optional field on the active-workout draft (the exercise ticked
last), so the phone and the watch agree on "next" (FR-11). No API change, no
migration, no native rebuild: the watch already starts the rest it is told by
`currentSet.restSeconds`, and that number becomes 0 for a tick that does not
finish its round.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Rounds, rest per round, round-order guidance, group header and round markers, join/leave in the routine editor, group-aware move/remove. Not built (spec out of scope): joining during a workout or in a workout without a routine, a transition timer, a rest on the superset itself, grouping in the saved workout / History, interleaved table, circuits. Exercises outside a superset keep `completeSet` unchanged (FR-6). |
| 2 — Template vs performed | yes | The routine keeps its `RoutineExercise.supersetGroup`; the draft keeps the copy it already makes. The saved `WorkoutSession` is unchanged — no grouping is sent (out of scope). The group helpers are generic over `{ supersetGroup?: number }` and used on two separate types (editor rows, draft exercises); no shared model. |
| 3 — Shared domain types | no | No contract changes. `WatchWorkoutSet.restSeconds` already means "the rest that ticking this set starts; 0 starts none" — the phone now fills it per round. The new draft field is mobile-only state. |
| 4 — Weight in kg | no | No weights touched. |
| 5 — Prisma migrations | no | None. Routines keep the numbers they store (EF-4); the editor saves normalised numbers through the existing field. |
| 6 — Integrations behind interfaces | yes | The watch goes through the existing `WatchWorkoutBridge` / `watchProtocol`; only the protocol's pure functions change. No Swift change. |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Five code commits (group helpers → round rules → wiring tick/watch/alert → active workout screen → routine editor), each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None. |
| 10 — TODOs over half-solutions | yes | Watch out-of-contact behaviour and the "rest start" estimate for late watch ticks are listed under Risks. |

## Current state (verified in the code, 2026-10-17)

- **Grouping.** `features/routines/utils/exerciseBlockLabels.ts` turns runs of
  ≥ 2 adjacent exercises with the same `supersetGroup` into a block (2A, 2B);
  a lone number or a repeated non-adjacent number is not joined (EF-4 is
  already how it is drawn). Routine detail and active workout render a block
  as one card with a `Superset N` chip and a rail.
- **Tick.** `completeSet` (`workoutDraftStore.ts`) toggles the set and starts
  `resolveRestSeconds(exercise)` via `startRest`, for every set. Called from
  `ActiveWorkoutScreen.handleToggleDone` and `watchProtocol.applyWatchEvent`.
  Un-ticking uses `toggleWorkoutSetDone` and leaves the rest alone.
  `skipRest` drops `draft.rest`; the runner (`restTimerRunner.ts`) then
  cancels the scheduled alert without vibrating — that is "end quietly".
- **Next set.** `restTimer/nextSetToDo.ts` — within the block the not-done set
  with the lowest `order`, ties to the first listed; after the block, the
  first not-done set after it, then before it. `order` counts warm-ups, so
  warm-ups of different members interleave by position (wrong for FR-9).
  Used when a rest ends (scroll in `ActiveWorkoutScreen`, rest-over alert in
  `useRestTimerRunner`) and by `watchProtocol.currentSetToDo`, which anchors
  on the rest's exercise or, with no rest, the first exercise with a set left.
- **Watch.** `toWatchSnapshot` sends `currentSet.restSeconds =
  resolveRestSeconds(exercise)`; `WorkoutModel.swift` starts a local countdown
  of that length on a tick. `applyWatchEvent` keeps a running rest that ends
  later than the one a late tick would start.
- **Moves.** `moveWorkoutExercise` swaps with the neighbour, keeping the
  number (can split or join). The editor's `moveExerciseRow` does the same.
  Removal keeps numbers, so removing a standalone exercise between two runs
  with the same number would silently merge them.
- **Editor.** `RoutineFormScreen` has a free "Superset" number field per
  exercise (`supersetGroup: string`), parsed on save.
- **Rest bar.** `RestBar` shows the clock and ±15 s / Skip; no next set.

## Approach

### 1. Group helpers — `features/routines/utils/supersetGroups.ts`

Generic over `T extends { supersetGroup?: number }`, pure, return new arrays:

- `supersetRuns(items)` → `{ start, end, isSuperset }[]`, the same runs as
  `exerciseBlockLabels`.
- `normalizeSupersetGroups(items)` → runs of ≥ 2 numbered 1..k, everything
  else `undefined`. Unchanged items keep their identity. Applied before any
  edit, so a removal can never merge two runs that shared a number (EF-4).
- `moveInGroups(items, index, 'up' | 'down')`:
  - member, not at the edge in that direction → swap inside the run (FR-18);
  - first member moving up / last moving down → leaves the run in place
    (group cleared); a run left with one member is normal (FR-19);
  - standalone → jumps over the whole neighbouring block, never joins (FR-20).
- `joinWithNext(items, index)` → item and the next one share a run; joining
  to a member adds to its superset; two supersets meeting merge (FR-16).
- `leaveSuperset(items, index)` → first/last member detaches in place; a
  middle member moves to just after the run, so the run is not split (FR-16,
  FR-17).
- `removeKeepingGroups(items, index)` → normalise, remove, normalise (FR-21).
- `supersetKind(size)` → `superset` (2) · `triset` (3) · `giantset` (4+)
  (FR-12).

**[ASSUMPTION: moving the first member up (last down) takes it out of the
superset where it stands — it appears just above (below) the group, out of
the card — rather than also jumping over the block before it.]** One press,
one change; a second press moves it further.
**[ASSUMPTION: "take out of superset" on a middle member places it right after
the group.]** Detaching in place would split the superset in two.

### 2. Round rules — `features/workouts/superset/rounds.ts`

On `WorkoutExerciseDraft[]`:

- Working sets = entries not typed `warmup` (FR-1, FR-9); round *n* = the
  *n*-th working set of each member that has one.
- `roundIndexOf(exercise, setId)` (−1 for a warm-up),
  `roundStatus(members)` → `{ current: number | null, total }` (lowest round
  with a set not done, 1-based; `null` when all done — FR-13),
  `restOwner(members, round)` → last listed member with a set in that round
  (FR-3).
- `restAfterTick(draft, exId, setId, defaultRest)` → seconds the tick would
  start: the exercise's rest outside a superset or for a warm-up (FR-6, FR-9);
  in a round, 0 unless every other set of the round is done (FR-2, EF-2),
  then the owner's `resolveRestSeconds` (FR-3, EF-1).
- `completeSetInRounds(draft, exId, setId, defaultRest, now)` → outside a
  superset or a warm-up: `completeSet` as today. In a round: the set is ticked
  with `restSeconds` = the rest that starts; a completing tick `startRest`s
  with the owner's id; a non-completing tick `skipRest`s (FR-4). Always
  records `lastTickedExerciseId`. A done or missing set is a no-op.

`restTimer/nextSetToDo.ts` is rewritten on top of it (FR-7, FR-9):

- In the anchor's superset: first not-done warm-up, exercise by exercise in
  listed order; then the first listed member with a not-done set in the
  lowest unfinished round. A lone exercise: its first not-done set (as
  today). Then after the block, then before it (unchanged).
- `currentSetToDo(draft)` moves here from `watchProtocol` (re-exported there):
  anchor = `lastTickedExerciseId` ?? `rest.workoutExerciseId` ?? first
  exercise with a set left. The phone highlight, the rest bar, the alert and
  the watch all call it (FR-10, FR-11). A missing anchor (exercise removed)
  falls through to the first set left.

Draft: `WorkoutSessionDraft.lastTickedExerciseId?: string` — one optional
line in `workoutDraftStore.ts`; persisted with the draft, so a restored
workout resumes with the same "next" (EF-5). Older drafts lack it and fall
back to the rest's exercise.

**[ASSUMPTION: a set ticked mid-round records `restSeconds: 0` on the saved
set — the rest that actually followed it.]**

### 3. Wiring

- `ActiveWorkoutScreen.handleToggleDone` → `completeSetInRounds`.
- `watchProtocol.applyWatchEvent` → `completeSetInRounds` (FR-11). Its
  keep-the-later-rest rule gains the quiet end: when the tick ended the rest
  (FR-4), the rest is kept only if it started after the tick's instant (a
  late-delivered tick must not end a newer rest — EF-6). Start =
  `endsAt − totalSeconds`.
- `toWatchSnapshot` → `currentSetToDo`, `restSeconds = restAfterTick(...)`, so
  the watch shows no countdown after a mid-round tick (AC-7).
- `useRestTimerRunner.restOverContent` → "Next: {exercise} · set {n}" from
  `currentSetToDo` (FR-10).

### 4. Active workout screen

- `routines/components/SupersetHeader.tsx` (new): the chip ("Superset" /
  "Tri-set" / "Giant set") plus an optional status ("Round 2 of 4" or
  "Complete", tone done). Used by the routine detail and the editor too.
- Round markers: inside a superset each working set row gets a small "R2"
  node in the existing 36 px gutter, on the rail; warm-ups get none (FR-14).
  Drawn in the screen's row wrapper; `WorkoutSetRow` is not touched.
- Next set: the row of `currentSetToDo` gets an accent outline (FR-8, FR-14),
  for every exercise.
- Scroll: a tick that starts no rest scrolls the next set into view at once;
  a tick that starts one scrolls when the rest ends (existing effect, now
  aimed at `currentSetToDo`) (FR-8, EF-1).
- `RestBar` gains an optional `next` line ("Next: Barbell row · set 2")
  (FR-10).
- Moves and removal use `moveWorkoutExerciseInGroups` /
  `removeWorkoutExerciseInGroups` (new `superset/groupedDraft.ts`, built on
  the helpers + the store's renumbering by `order`) (FR-18–21). Adding an
  exercise stays `addExerciseToWorkout` (no group, FR-24); replacing keeps
  the slot's group (0020, FR-22); adding/removing sets needs nothing —
  rounds are derived (FR-23).

### 5. Routine editor

- `EditableRoutineExercise.supersetGroup` becomes `number | undefined`,
  normalised on load (EF-4, AC-12); the number field is gone.
- Per exercise: "Join with next" (link icon, not on the last row) and
  "Take out of superset" (unlink icon, only on members) (FR-16, FR-17).
- Rows render in blocks: a superset is wrapped with the `SupersetHeader`, a
  rail and the lettered badges from `exerciseBlockLabels` (FR-15).
- Move and remove use the helpers (FR-18–20). Save sends the normalised
  numbers (`orderIndex` as today).

### Alternatives considered

- **A `supersetId` / rest on a new superset entity.** Needs a migration and an
  API change for something the spec says is not stored. Rejected (spec
  assumption: rest of the last member).
- **Change `completeSet` in the store.** Callers and tests of 0018/0025 rely
  on it; and four other specs are editing the store. A new module that wraps
  it keeps the store diff to one line. Rejected.
- **Anchor "next" only on the rest.** With no rest after a mid-round tick
  there is nothing to anchor on; the first exercise with a set left would
  jump back to an earlier unfinished exercise. Rejected for the stored
  `lastTickedExerciseId`.
- **Compute rounds on the watch.** Would duplicate the rules in Swift and need
  a rebuild. Rejected: the phone sends the next set and the rest to start.
- **Interleaved set table.** Out of scope (spec assumption).

## Shared contracts (`packages/domain`)

None.

## Data model and migrations

None. No backfill: stored numbers are read as drawn today (EF-4).

## API surface (`apps/api`)

None.

## Mobile surface (`apps/mobile`)

- `features/routines/utils/supersetGroups.ts` (+ test) — new
- `features/routines/components/SupersetHeader.tsx` — new
- `features/workouts/superset/rounds.ts`, `groupedDraft.ts` (+ tests) — new
- `features/workouts/restTimer/nextSetToDo.ts` (+ test) — rewritten
- `features/workouts/restTimer/useRestTimerRunner.ts` — alert text
- `features/workouts/watch/watchProtocol.ts` (+ test)
- `features/workouts/state/workoutDraftStore.ts` — one optional field
- `features/workouts/components/RestBar.tsx` — optional `next` line
- `features/workouts/screens/ActiveWorkoutScreen.tsx`
- `features/routines/screens/RoutineFormScreen.tsx`, `RoutineDetailScreen.tsx`
- `i18n/locales/en.ts`, `es.ts`
- No native rebuild; Metro reload.

## Testing strategy

| Spec AC | Verified by |
|---|---|
| AC-1 | `rounds.test.ts`: bench 1 → no rest, row 1 next; row 1 → 60 s rest owned by row, next bench 2. |
| AC-2 | `rounds.test.ts`: four rounds in order → exactly four rests started. |
| AC-3 | `rounds.test.ts`: 4 + 3 sets → 1:00 after rounds 1–3, 1:30 after curls 4; `roundStatus` → complete. |
| AC-4 | `rounds.test.ts` (tri-set: no rest after A1, B1; C's rest after C1; round 2 of N); `supersetGroups.test.ts` (`supersetKind(3)` = triset). |
| AC-5 | `rounds.test.ts`: row 1 then bench 1 → row's rest. |
| AC-6 | `rounds.test.ts`: bench 2 during the rest → no rest, next row 2. |
| AC-7 | `watchProtocol.test.ts`: snapshot after A1 offers B1 with `restSeconds` 0, no `restEndsAt`; watch tick of B1 starts the rest and offers A2. Device: task 8. |
| AC-8 | `supersetGroups.test.ts` (`joinWithNext`, normalised numbers); device. |
| AC-9 | `supersetGroups.test.ts` / `groupedDraft.test.ts`: first member up → both normal; `rounds.test.ts` FR-6 path. |
| AC-10 | `supersetGroups.test.ts`: standalone below a superset moves above the whole group, members kept. |
| AC-11 | `rounds.test.ts`: warm-ups start their own rest; next set after them is the first working set; round 1 starts there. |
| AC-12 | `supersetGroups.test.ts`: `[1, 1, x, 1]` normalises to one superset + two normal. |
| FR-5, FR-6, EF-2, EF-3, EF-5 | `rounds.test.ts` / `nextSetToDo.test.ts` (un-tick, lone exercise unchanged, out-of-order, last tick, restored draft with `lastTickedExerciseId`). |
| EF-6 | `watchProtocol.test.ts`: late tick does not end a newer rest. |

## Risks and open questions

- **Watch out of contact.** The watch does not compute the next set; after a
  tick it waits for the phone's next snapshot (unchanged from 0025). With the
  phone app suspended, AC-7 depends on the phone receiving the event in the
  background — device check (task 8).
- **Rest start estimate.** `RunningRest` has no start; `endsAt − totalSeconds`
  is exact until ±15 s is used. A late watch tick near an adjusted rest may
  keep or end it wrongly by up to the adjustment. `TODO(sdd): add
  RunningRest.startedAt if the device check shows it matters.`
- **Parallel specs.** 0031, 0032, 0030 and 0015 edit `ActiveWorkoutScreen`
  and the draft store. This plan keeps logic in new modules; the screen diff
  is the tick handler, move/remove handlers, the row wrapper, the block
  header and the rest bar props. `WorkoutSetRow` is untouched.
- **Owner confirmation pending** (spec): whose rest applies after a round, and
  round markers vs an interleaved table.

## Rollout

App-only. Metro reload or JS update; no rebuild, no migration, no redeploy.
An older app reading a routine saved by the new editor sees the same groups
(normalised numbers are valid numbers). Roll back by reverting.
