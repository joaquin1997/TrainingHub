---
spec: 0010
status: in-progress  # self-approved 2026-10-16 under the owner's delegation
created: 2026-09-24
---

# Tasks — Persist the active workout

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Spec, plan and tasks; backlog entry | docs | links resolve | `docs(sdd): spec 0010 persist the active workout` |
| 2 | [x] Draft ids that cannot collide after a restart (time-seeded) | mobile | unit test | `fix(workouts): draft ids stay unique across restarts` |
| 3 | [x] Store subscription; `useActiveWorkout` via `useSyncExternalStore`; screen reads the draft from the store | mobile | unit test for subscribe/notify; manual smoke in app | `feat(workouts): observable active-workout store` |
| 4 | [x] Open an existing draft without the network; `routineId` optional (`resolveActiveWorkoutEntry`) | mobile | unit test | `feat(workouts): resume the active workout without a network round-trip` |
| 5 | [x] Stored envelope + parse; `tokenSubject`; `AuthContext` restores the real user id; owner kept in the store; `discardActiveWorkoutIfForeign` on sign-in (FR-8) | mobile | unit tests | `feat(workouts): versioned, owner-scoped active-workout envelope` |
| 6 | [x] AsyncStorage dependency; `ActiveWorkoutStorage` interface + implementations | mobile | typecheck; **[DEVICE: rebuild]** app launches | `chore(mobile): add active-workout storage` |
| 7 | Hydrate before routes (or after the next sign-in, EF-6); debounced save; flush on background; clear on finish/discard; confirm sign-out while active. **Requires spec 0014 deployed.** | mobile | unit tests (fake timers); **[DEVICE]** AC-1…AC-7, AC-9 | `feat(workouts): keep the active workout across app restarts` |
| 8 | `ApiError` with status in `lib/http.ts`; on a permanent rejection at finish, show the reason and offer to discard (EF-5) | mobile | unit tests; **[DEVICE]** AC-8 | `feat(workouts): let a refused workout be discarded` |
| 9 | Close the 0005 gap; glossary (`WorkoutSessionDraft`, active workout); roadmap; backlog; spec status | docs | links resolve | `docs(sdd): close spec 0010` |

Tasks 6 and 7 need a device rebuild; they are not verifiable in CI. If spec
0012's native work lands first, the dependency from task 6 rides along with that
rebuild.

## Progress log

- 2026-09-24 — Spec written from decisions taken with the owner; tasks awaiting review.
- 2026-09-24 — Amended after review: FR-8 (discard a foreign draft on sign-in),
  EF-5 (discard a refused workout), EF-6 (hydrate after sign-in); task 8 added;
  dependency on spec 0014 before task 7.
- 2026-10-16 — Tasks self-approved under the owner's delegation. Spec 0014 is
  implemented on the same branch; "deployed before task 7" becomes a deploy
  order: the API with 0014's migration goes out before (or with) the app build
  that carries task 7.
- 2026-10-16 — Task 2: generated ids carry a per-launch time seed
  (`-gen-<seed>-<n>`). Unit test re-imports the store at two clock times.
- 2026-10-16 — Task 3: `subscribeActiveWorkout` (notifies on new draft, set,
  clear-when-present); `useActiveWorkout` is `useSyncExternalStore`, so the
  routines list and detail update live too; the active screen has no local
  copy. Finish now `replace`s to the summary, so Back no longer shows the
  finished workout. 2 unit tests. Manual smoke pending (device batch).
- 2026-10-16 — Task 4: `resolveActiveWorkoutEntry` → `resume | fetch | none`;
  the screen opens an active workout synchronously, with no fetch, so it works
  offline and from a link without `routineId` (0012's entry point). Decided:
  an active workout is resumed even when the link names another routine —
  before, that path overwrote the logged sets with a fresh draft. 4 unit tests.
- 2026-10-16 — Task 5: `activeWorkoutEnvelope.ts` (`{ v: 1, ownerId, savedAt,
  draft }`, parse → ok/foreign/invalid/empty; 4 tests), `tokenSubject` (3
  tests), owner kept in the store (`startActiveWorkout(..., ownerId)`,
  `hydrateActiveWorkout`), `discardActiveWorkoutIfForeign` on every sign-in
  (4 tests). Decided: a draft with no recorded owner is adopted by whoever
  signs in rather than dropped — it cannot be shown to be someone else's, and
  it only arises if a workout starts with no user known.
- 2026-10-16 — Task 6: `@react-native-async-storage/async-storage` 2.2.0 via
  `expo install` (SDK 55 pin; native → rebuild, batched with 0012's).
  `ActiveWorkoutStorage` interface + in-memory impl (node-testable) and the
  AsyncStorage impl in its own file. Not wired yet.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/01-live-workout-logging.md` checklist and progress log updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] 0005's known gap marked closed
- [ ] Glossary updated
