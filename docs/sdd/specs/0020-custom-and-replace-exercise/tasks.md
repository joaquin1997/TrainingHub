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
| 3 | [ ] Exercises tab: "New" action in `ScreenTitle` → modal prefilled with the search; created exercise added, filters cleared, search set to its name; i18n | mobile | web preview: AC-1 | `feat(exercises): create a custom exercise from the Exercises tab` |
| 4 | [ ] `ExercisePickerModal`: "Create exercise" row always under the search (`Create "<text>"`), create step inline, created exercise joins the list and is chosen; routine editor offers create for any typed search; i18n | mobile | web preview: AC-2 | `feat(exercises): create a custom exercise from every picker` |
| 5 | [ ] `replaceExerciseInWorkout` + `countDoneSets` (tests); picker `title` + `confirm` step; `useExerciseReplacement`; "Replace" on each workout card; i18n | mobile | unit tests; web preview: AC-3, EF-1 | `feat(workouts): replace an exercise in the active workout` |
| 6 | [ ] `replaceRoutineRowExercise` (tests), used by `selectExercise`; "Replace" on each routine editor row with an exercise → picker; i18n | mobile | unit tests; web preview: AC-4 | `feat(routines): replace an exercise in the routine editor` |
| 7 | [ ] Progress log, definition of done, spec status | docs | — | `docs(sdd): close spec 0020 implementation` |

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

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Roadmap 06 checklist and log updated (coordinator)
- [ ] `spec.md` status set to `done`; `../backlog.md` updated (coordinator)
- [ ] Picker steps checked on the owner's iOS device
