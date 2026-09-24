---
spec: 0010
status: draft        # awaiting review
created: 2026-09-24
---

# Tasks — Persist the active workout

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | Spec, plan and tasks; backlog entry | docs | links resolve | `docs(sdd): spec 0010 persist the active workout` |
| 2 | Draft ids that cannot collide after a restart (time-seeded) | mobile | unit test | `fix(workouts): draft ids stay unique across restarts` |
| 3 | Store subscription; `useActiveWorkout` via `useSyncExternalStore`; screen reads the draft from the store | mobile | unit test for subscribe/notify; manual smoke in app | `feat(workouts): observable active-workout store` |
| 4 | Open an existing draft without the network; `routineId` optional (`resolveActiveWorkoutEntry`) | mobile | unit test | `feat(workouts): resume the active workout without a network round-trip` |
| 5 | Stored envelope + parse; `tokenSubject`; `AuthContext` restores the real user id | mobile | unit tests | `feat(workouts): versioned, owner-scoped active-workout envelope` |
| 6 | AsyncStorage dependency; `ActiveWorkoutStorage` interface + implementations | mobile | typecheck; **[DEVICE: rebuild]** app launches | `chore(mobile): add active-workout storage` |
| 7 | Hydrate before routes; debounced save; flush on background; clear on finish/discard; confirm sign-out while active | mobile | unit tests (fake timers); **[DEVICE]** AC-1…AC-6 | `feat(workouts): keep the active workout across app restarts` |
| 8 | Close the 0005 gap; roadmap; backlog; spec status | docs | links resolve | `docs(sdd): close spec 0010` |

Tasks 6 and 7 need a device rebuild; they are not verifiable in CI. If spec
0012's native work lands first, the dependency from task 6 rides along with that
rebuild.

## Progress log

- 2026-09-24 — Spec written from decisions taken with the owner; tasks awaiting review.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/01-live-workout-logging.md` checklist and progress log updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] 0005's known gap marked closed
