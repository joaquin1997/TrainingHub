---
spec: 0020
status: in-progress  # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Tasks — Create and replace exercises where they are needed

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Mobile only: no domain, migration or API task. No native rebuild.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status | docs | links resolve | `docs(sdd): plan and tasks for 0020` |
| 2 | [x] `CustomExerciseForm` extracted; `CustomExerciseModal` moved to `features/exercises/components/` as its wrapper; routine editor import updated (no behaviour change) | mobile | typecheck + tests | `refactor(exercises): share the custom exercise form` |
| 3 | [x] Exercises tab: "New" action in `ScreenTitle` → modal prefilled with the search; created exercise added, filters cleared, search set to its name; i18n | mobile | web preview: AC-1 | `feat(exercises): create a custom exercise from the Exercises tab` |
| 4 | [x] `ExercisePickerModal`: "Create exercise" row always under the search (`Create "<text>"`), create step inline, created exercise joins the list and is chosen; routine editor offers create for any typed search; i18n | mobile | web preview: AC-2 | `feat(exercises): create a custom exercise from every picker` |
| 5 | [x] `replaceExerciseInWorkout` + `countDoneSets` (tests); picker `title` + `confirm` step; `useExerciseReplacement`; "Replace" on each workout card; i18n | mobile | unit tests; web preview: AC-3, EF-1 | `feat(workouts): replace an exercise in the active workout` |
| 6 | [x] `replaceRoutineRowExercise` (tests), used by `selectExercise`; "Replace" on each routine editor row with an exercise → picker; i18n | mobile | unit tests; web preview: AC-4 | `feat(routines): replace an exercise in the routine editor` |
| 7 | [x] Progress log, definition of done, spec status | docs | — | `docs(sdd): close spec 0020 implementation` |

Not verifiable in CI: the picker's create and confirm steps inside the iOS
page sheet (owner's device batch, Metro reload).

### Acceptance criteria → tasks

| AC | Task | How |
|---|---|---|
| AC-1 | 3 | Web preview |
| AC-2 | 4 | Web preview |
| AC-3 | 5 | Unit test + web preview |
| AC-4 | 6 | Unit test + web preview |

## Progress log

- 2026-10-16 — Plan and tasks written and self-approved under the owner's
  delegation.
- 2026-10-17 — Task 2: `CustomExerciseForm` extracted (loads muscle groups
  once per mount); `CustomExerciseModal` moved to `features/exercises/` as a
  thin wrapper. No behaviour change.
- 2026-10-17 — Task 3: "New exercise" pill on the Exercises tab. Web preview
  (local API on PGlite, wger catalog): search "Press Landmine" → New → chest →
  Save → the list shows it, filters cleared (AC-1).
- 2026-10-17 — Task 4: the picker shows `Create "<text>"` under the search at
  all times and swaps to the form inside the same modal; the routine editor
  offers create for any search, matches or not. Web preview: active workout →
  Add exercise → "Landmine Row" → Create → lats → Save → added to the workout,
  picker closed (AC-2); routine editor search "Prensa" shows matches and the
  create button.
- 2026-10-17 — Task 5: `replaceExerciseInWorkout` (10 unit tests). The
  picker gained `title`, `confirm` (question inside the modal) and now clears
  its search on every opening, since add and replace share it. "Replace" is
  an icon button (⇄) between "Add set" and "Remove exercise": a labelled
  button did not fit an indented superset card; `cardActions` also wraps as
  a safety for longer labels. Web preview: leg press (3 empty sets, 1A)
  replaced by hack squat → 3 sets, still 1A (AC-3); Prensa Smith with 1 done
  set → the picker asks "Replace Prensa Smith with …?" with keep (default)
  / drop / cancel; keep → Prensa Smith stays as 1B with its done set and the
  replacement follows as 1C (EF-1).
- 2026-10-17 — Task 6: `replaceRoutineRowExercise` (2 unit tests), also used
  by the inline search. Web preview: edit Pierna A → ⇄ on row 1 → hack squat
  → Save; the API returns it at order 1 with rest 120, superset 1 and the same
  3 × 8–10 @ 100 kg targets (AC-4).
- 2026-10-17 — Task 7: spec stays `in-progress` until the picker steps are
  checked on the owner's iOS device. Backlog, roadmap 06 and glossary updates
  handed to the coordinator.

## Definition of done

- [x] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Roadmap 06 checklist and log updated (coordinator)
- [ ] `spec.md` status set to `done`; `../backlog.md` updated (coordinator)
- [ ] Picker steps checked on the owner's iOS device
