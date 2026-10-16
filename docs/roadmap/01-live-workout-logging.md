# 1. Live workout logging

Make the in-progress workout behave like Hevy: edit sets/exercises live, see
previous performance, set types, and persist completion.

## Checklist
- [x] Persist per-set completion (`completedAt`) + `isWarmup` in the API
- [x] Add / remove sets during a workout
- [x] Add / remove exercises during a workout
- [x] Reorder exercises and sets (up/down)
- [x] Show "last time" per set (e.g. 60 kg × 8 from the previous workout)
- [x] Set types (warmup / drop / failure) — UI + persistence
- [x] Ghosted previous/target values as input placeholders (Hevy-style): unedited
  sets still log their default; edited values switch to normal text
- [x] Safe save (spec 0014): retries never duplicate, a deleted routine never
  blocks the save, the active workout's routine is locked from deletion

## Design notes
- Source of truth for the live session is the mobile `workoutDraftStore`
  (`activeWorkout`). Draft set = `WorkoutSetDraft` (reps/weightKg strings, `done`).
- The API `WorkoutSet` table already has `isWarmup`, `completedAt`, `durationSeconds`,
  `distanceMeters` columns — completion just needs wiring through the write DTO.
- "Last time": new API endpoint returning the most recent logged sets for an
  exercise (for the acting user), consumed when building/showing the active workout.
- Set types beyond warmup (drop/failure) need a `type` column on `WorkoutSet`
  (additive migration) + a field on the write DTO; warmup maps to `isWarmup`.
- Reorder: up/down buttons (drag&drop is deferred — heavier, needs a gesture lib).

## Progress log
- All sub-points landed (2026-05-30). Persisted completion + set types via an
  additive migration; live add/remove/reorder of sets & exercises; "last time"
  per set via GET /workouts/exercises/:id/last. **Point 1 complete.**
- (2026-05-31) Hevy-style placeholders: each set ghosts its previous/target
  values (`repsPlaceholder`/`weightPlaceholder`) as translucent input
  placeholders. Empty fields fall back to the placeholder on save
  (`effectiveSetValue`), so an unedited set logs its default; typing switches the
  field to normal text. New `applyLastPerformance` seeds placeholders from the
  last-performance fetch.
- (2026-10-16) Spec 0014 — workout save integrity. Each workout carries a
  device-chosen `clientId`; the API returns the first save for a repeated one
  (200), including a concurrent duplicate (unique `userId + clientId`).
  Routine and routine-slot links are optional provenance, kept only when they
  are the user's own; unknown exercises and unreadable or inverted times are
  refused with a reason. The routines list and detail no longer offer edit or
  delete for the active workout's routine, and the detail confirms deletes.
  Needs the `add_workout_session_client_id` migration applied before the API
  redeploy.
