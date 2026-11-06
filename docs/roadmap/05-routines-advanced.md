# 5. Routines (advanced)

## Checklist
- [x] Reorder exercises in the routine builder (up/down, later drag&drop)
- [x] Inherit previous set values as ghosted placeholders in the builder
- [x] Supersets (group exercises by number; badge in detail + active workout)
  - [x] Supersets flow in rounds: one rest per round, next set highlighted,
    Superset / Tri-set / Giant set headers, join and split in the editor
    (spec 0029 — device check pending)
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
- (2026-10-18) Spec 0029 — superset flow. A round is set *n* of every
  exercise in the superset (warm-ups outside rounds); ticking a set
  mid-round starts no rest and moves to the next set, the rest starts when
  the round is complete with the last member's rest. The phone, the watch
  and the rest-over alert ("Next: exercise · set n") follow the rounds. The
  workout card shows "Round n of m", round markers and the next set; the
  editor drops the number field for join with next / take out, and keeps
  groups normalised on load and save. App only (no migration, no redeploy);
  device check on iPhone + Apple Watch pending.

## Notes
- Builder is `RoutineFormScreen`. Supersets need a grouping concept on
  RoutineExercise (schema addition).

## Spec review — 2026-11-03

- [0051](../sdd/specs/0051-offer-routine-update/spec.md) is ready: after saving
  training, optionally review and retain selected routine target/structure
  changes. Owner confirmed this meaning on 2026-11-03; no implementation.

- Planning update (2026-11-03): 0051 now have approved plans and
  ordered unchecked tasks. No implementation/rollout in this pass; consult
  [the execution sequence](../sdd/reviews/2026-11-03-workout-implementation-sequence.md)
  for dependencies and acceptance gates. Earlier ready-state entries above
  record the spec-review stage, not the current planning state.
