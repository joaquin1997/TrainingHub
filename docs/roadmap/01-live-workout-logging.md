# 1. Live workout logging

Make the in-progress workout behave like Hevy: edit sets/exercises live, see
previous performance, set types, and persist completion.

## Checklist
- [x] Persist per-set completion (`completedAt`) + `isWarmup` in the API
- [x] Add / remove sets during a workout
- [x] Add / remove exercises during a workout
- [x] Reorder exercises and sets (up/down)
- [ ] Show "last time" per set (e.g. 60 kg × 8 from the previous workout)
- [ ] Set types (warmup / drop / failure) — UI + persistence

## Design notes
- Source of truth for the live session is the mobile `workoutDraftStore`
  (`activeWorkout`). Draft set = `WorkoutSetDraft` (reps/weightKg strings, `done`).
- The API `WorkoutSet` table already has `isWarmup`, `completedAt`, `durationSeconds`,
  `distanceMeters` columns — completion just needs wiring through the write DTO.
- "Last time": new API endpoint returning the most recent logged sets for an
  exercise (dev user), consumed when building/showing the active workout.
- Set types beyond warmup (drop/failure) need a `type` column on `WorkoutSet`
  (additive migration) + a field on the write DTO; warmup maps to `isWarmup`.
- Reorder: up/down buttons (drag&drop is deferred — heavier, needs a gesture lib).

## Progress log
(append commit hashes + notes as sub-points land)
