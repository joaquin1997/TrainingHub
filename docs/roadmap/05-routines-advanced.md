# 5. Routines (advanced)

## Checklist
- [x] Reorder exercises in the routine builder (up/down, later drag&drop)
- [x] Inherit previous set values as ghosted placeholders in the builder
- [x] Supersets (group exercises by number; badge in detail + active workout)
- [x] Duplicate routine
- [x] Folders / organization (folder label + grouped list)
- [x] Per-exercise rest time config

## Progress log
- Duplicate routine (client-side copy via the create endpoint) and up/down
  reorder of exercises in the builder. Supersets/folders/rest-config still todo.
- (2026-05-31) Builder sets now ghost the previous set's values as placeholders
  (`routineSetInheritance`), matching the active-workout behaviour: an unedited
  field saves the inherited value. Pure helpers, unit-tested.
- (2026-05-31) Remaining sub-points landed: per-exercise rest time
  (`b84514b`), folders with a grouped list (`cec462e`) and supersets grouped
  by number with a badge in detail + active workout (`73987d4`). **Point 5
  complete**; drag&drop reorder stays deferred (needs a gesture lib).

## Notes
- Builder is `RoutineFormScreen`. Supersets need a grouping concept on
  RoutineExercise (schema addition).
