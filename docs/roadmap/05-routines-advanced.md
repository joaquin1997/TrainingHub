# 5. Routines (advanced)

## Checklist
- [x] Reorder exercises in the routine builder (up/down, later drag&drop)
- [x] Inherit previous set values as ghosted placeholders in the builder
- [ ] Supersets (group exercises)
- [x] Duplicate routine
- [x] Folders / organization (folder label + grouped list)
- [x] Per-exercise rest time config

## Progress log
- Duplicate routine (client-side copy via the create endpoint) and up/down
  reorder of exercises in the builder. Supersets/folders/rest-config still todo.
- (2026-05-31) Builder sets now ghost the previous set's values as placeholders
  (`routineSetInheritance`), matching the active-workout behaviour: an unedited
  field saves the inherited value. Pure helpers, unit-tested.

## Notes
- Builder is `RoutineFormScreen`. Supersets need a grouping concept on
  RoutineExercise (schema addition).
