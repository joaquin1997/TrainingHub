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
- [x] Active workout survives the app being closed (spec 0010)
- [x] Pause / resume the workout; durations are active time (spec 0011)
- [x] Safe save (spec 0014): retries never duplicate, a deleted routine never
  blocks the save, the active workout's routine is locked from deletion
- [x] Workout bar on every screen; starting another routine asks to finish the
  current one first; fields stay above the keyboard (spec 0019 — keyboard
  pending the device check; the bar's rest countdown landed with 0018)
- [x] Timed and distance sets: exercises carry a tracking type (weight & reps,
  reps, time, weight & time, distance & time) with the matching columns, a
  set timer, and time/distance in routines, history and progress (spec 0021 —
  migration, catalog script and device check pending)
- [x] Unilateral exercises: left and right reps in one set row, shown in
  History, share and the watch (spec 0022 — migration and device check pending)
- [x] Warm-up sets: approach sets worked out from the working weight, in the
  workout and the routine editor; a warm-up block (mobility, cardio) ticked in
  the workout (spec 0024 — migrations and device check pending)
  - [x] The warm-up button previews before adding, marks generated warm-ups
    and removes them again; "last time" pairs warm-ups with warm-ups
    (spec 0031 — migration and device check pending)

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
- (2026-10-16) Spec 0010 — the active workout is kept on the device
  (AsyncStorage, native → rebuild) in a versioned envelope with its owner,
  written 300 ms after each change and on leaving the foreground, restored
  before any screen reads it (or right after sign-in when the app starts signed
  out). A different person signing in discards it; an expired session keeps
  it. The store is observable (`useSyncExternalStore`), an active workout opens
  without the network, discarding and logging out with a workout in progress
  ask first, and a workout the server refuses can be discarded.
- (2026-10-16) Spec 0011 — pause. The draft keeps `pausedAt` (current pause)
  and `pausedSeconds` (ended pauses); finishing while paused counts the ongoing
  pause. The API stores `pausedSeconds` (default 0, so older workouts read as
  before) and refuses more paused time than the workout lasted. Every duration
  on screen is active duration. Needs the `add_workout_session_paused_seconds`
  migration before the API redeploy.
- (2026-10-16) Spec 0019 — always at hand. A workout bar (routine, clock,
  paused state) sits above the tab bar and under the history detail; tapping it
  opens the workout. Starting another routine asks, naming both: "finish and
  start" saves the current one when a set is done (no summary) or discards it,
  then starts the new one; a failed save leaves the current workout with the
  finish error. The Routines card is gone (the bar replaces it). The workout
  list insets for the keyboard on iOS; needs the owner's device check.
- (2026-10-17) Spec 0021 — timed and distance sets. `Exercise.trackingType`
  (default weight & reps, so existing exercises and workouts are unchanged)
  picks the set columns: reps only, time, weight & time, distance & time.
  Routines store time/distance targets; the workout ghosts them and last
  time's values, accepts "60" or "1:00" for time, and a per-set timer counts
  the target down (or up) and fills the time when stopped. Save sends only the
  type's fields. Summary, History, exercise detail and progress show time and
  distance; volume counts only weight × reps; records gain longest time and
  distance. Custom exercises choose their type. Needs the
  `add_exercise_tracking_type` migration (redeploy), then
  `pnpm run catalog:tracking-types` on the server to mark the timed and
  distance exercises of the wger catalog (44 locally; idempotent). No
  rebuild; timed rows, timer vibration and keyboard pending the device check.
  (The catalog script is superseded by 0030's sweep.)
- (2026-10-17) Spec 0022 — unilateral exercises. `Exercise.isUnilateral`
  (switch on the custom exercise form and the exercise detail, through
  `PUT /exercises/:id/unilateral`) and `repsLeft` / `repsRight` on a set; the
  API stores `reps` as their sum. The row shows L and R side by side, saved
  sets read `20 kg × 10 L / 8 R`, share text and the watch target carry both
  sides. Records read the better side, volume both. Needs the
  `add_unilateral_exercises` migration (redeploy); no rebuild; row layout and
  switches pending the device check.
- (2026-10-17) Spec 0024 — warm-up sets. A flame button works out approach
  sets from the working weight (140 kg → 20 × 10, 55 × 5, 85 × 3, 105 × 2,
  125 × 1; lb steps; none at the bar) in the active workout and the routine
  editor; routine sets can be warm-ups (`W`, working sets numbered alone).
  Routines carry a warm-up block (name, target time or reps) shown as a
  checklist first in the workout and in the History detail; never sets,
  volume or records. Needs the `add_routine_set_warmup` and
  `add_warm_up_blocks` migrations (redeploy); device check pending.
- (2026-10-18) Spec 0031 — warm-up button: preview, mark and undo. The
  button opens a preview sheet first; confirmed sets are marked as generated
  (cleared when a value or the type is edited) and the button turns into
  "remove", which takes out only generated ones. Routine sets keep the mark
  (`isGeneratedWarmup`) and a workout from that routine carries it; the saved
  workout stores plain warm-ups. "Last time" now pairs warm-ups with
  warm-ups and working sets with working sets (closes the 0023 follow-up).
  Needs the `add_routine_set_generated_warmup` migration (redeploy); device
  check pending.
