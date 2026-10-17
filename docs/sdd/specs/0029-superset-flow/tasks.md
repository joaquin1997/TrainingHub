---
spec: 0029
status: in-progress  # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Tasks — Supersets that flow in rounds

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
App-only: no domain contract, no migration, no API change, no native rebuild.
Order: pure helpers → round rules → wiring (phone tick, watch, alert) →
active workout screen → routine editor → docs.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | — | `docs(sdd): plan and tasks for 0029` |
| 2 | [x] `supersetGroups.ts`: runs, normalise, move in groups, join with next, leave, remove keeping groups, kind by size | mobile | unit tests (AC-4 kind, AC-8, AC-9, AC-10, AC-12, FR-16–21) | `feat(routines): superset grouping helpers` |
| 3 | [x] `rounds.ts` (round index, status, rest owner, `restAfterTick`, `completeSetInRounds`); `nextSetToDo` in round order with warm-ups first; `currentSetToDo` with `lastTickedExerciseId` on the draft | mobile | unit tests (AC-1–6, AC-11, FR-2–9, EF-1–3, EF-5) | `feat(workouts): supersets rest once per round` |
| 4 | [x] Wire it: phone tick, watch tick (quiet end vs late tick), watch snapshot (next set, rest per round), rest-over alert names the set | mobile | unit tests (AC-7, FR-10, FR-11, EF-6) | `feat(workouts): phone and watch follow superset rounds` |
| 5 | [x] Active workout: `SupersetHeader` (Superset / Tri-set / Giant set, round N of M, complete) also in the routine detail; round markers; next set highlighted; scroll right after a tick with no rest; rest bar names the next set; group-aware move/remove (`groupedDraft.ts`); i18n | mobile | unit tests (`groupedDraft`); typecheck | `feat(workouts): rounds and next set in the active workout` |
| 6 | [x] Routine editor: grouped like the detail; join with next / take out of superset; number field removed; group-aware move/remove; normalised groups on load and save; i18n | mobile | typecheck; helpers' unit tests | `feat(routines): join and split supersets in the editor` |
| 7 | [x] Progress log, definition of done | docs | — | `docs(sdd): close spec 0029 implementation` |
| 8 | [ ] [DEVICE] AC-1–AC-12 on the phone: no rest mid-round, rest after the round with the last member's rest, rest bar and alert name the next set, highlight and scroll, header labels and round markers at phone width, editor join/split, moves; AC-7 with the phone locked and the watch only | device | owner, iOS + Apple Watch | — |

Not verifiable in CI: task 8. No owner server step (no migration, no
redeploy).

### Acceptance criteria → tasks

| AC | Tasks | How |
|---|---|---|
| AC-1 | 3, 4, 5 | unit tests; device |
| AC-2 | 3 | unit test |
| AC-3 | 3, 5 | unit test; device |
| AC-4 | 2, 3, 5 | unit tests; device |
| AC-5 | 3 | unit test |
| AC-6 | 3 | unit test |
| AC-7 | 4, 8 | unit test; device |
| AC-8 | 2, 6 | unit test; device |
| AC-9 | 2, 5 | unit tests; device |
| AC-10 | 2, 5, 6 | unit tests; device |
| AC-11 | 3 | unit test |
| AC-12 | 2, 6 | unit test |

## Progress log

- 2026-10-17 — Plan and tasks written and self-approved under the owner's
  delegation.
- 2026-10-17 — Task 2: `supersetGroups.ts` works on any list with an optional
  `supersetGroup` (editor rows and draft exercises). Every edit normalises
  first (runs of ≥ 2 numbered 1..k, everything else cleared), so removing an
  exercise can never merge two runs that happened to share a number.
- 2026-10-17 — Task 3: `completeSetInRounds` wraps the store's `completeSet`
  instead of changing it; the store gained only the optional
  `lastTickedExerciseId`. `nextSetToDo` pairs sets by working-set position
  (warm-ups excluded), not by `order`, which fixes warm-ups interleaving
  across members. `currentSetToDo` moved from `watchProtocol` (re-exported
  there). A set ticked mid-round is saved with `restSeconds: 0`.
- 2026-10-17 — Task 4: the watch snapshot's `currentSet.restSeconds` is now
  what the tick would start (0 mid-round), so the watch shows no countdown
  without any Swift change. A late watch tick that ends a rest mid-round
  keeps a rest that started after the tick (start estimated as
  `endsAt − totalSeconds`; see plan Risks). The rest-over alert reads
  "Next: {exercise} · set {n}" ("· warm-up" for a warm-up).
- 2026-10-17 — Task 5: the superset card header is a shared
  `SupersetHeader` (Superset / Tri-set / Giant set; in the workout also
  "Round n of m" or "Complete"); the routine detail uses it too, dropping
  the "Superset N" number. Round tags ("R2") sit on the rail in the existing
  gutter and the next set gets a lime ring drawn over the row, so
  `WorkoutSetRow` is untouched. A tick that starts no rest scrolls the next
  set into view at once. The rest bar shows "Next: …".
- 2026-10-17 — Task 6: the editor's number field is gone; link / unlink icons
  in each card's action row join with the next exercise or take it out.
  Supersets are wrapped with the same header and a rail, badges read 2A/2B.
  Stored numbers are normalised on load and on save (AC-12). The unused
  strings `routineForm.supersetGroup`, `supersetPlaceholder`,
  `supersetWholeNumber` and `routineDetail.superset` were left in the locale
  files to keep the diff off lines other specs edit; safe to delete later.
  Checked: `expo export --platform web` bundles; screens not exercised in a
  browser (needs the API and a session) — left to task 8.

## Definition of done

- [x] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Roadmap 05/02, backlog and glossary updates handed to the coordinator
- [ ] Checked on the owner's device (task 8)
- [ ] `spec.md` status set to `done`
