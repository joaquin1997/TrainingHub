---
spec: 0031
status: in-progress  # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Tasks — Warm-up sets: preview, mark and undo

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Order: "last time" by kind (domain + API + mobile) → the workout side of the
mark, preview and toggle → the routine column and API → the routine editor.
One additive migration; no native rebuild. The API (with its migration) must
be deployed before saved routines keep the mark.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress`; 0024's "adding again replaces" assumption marked superseded | docs | — | `docs(sdd): plan and tasks for 0031` |
| 2 | [x] Domain `ExerciseLastSet.isWarmup`; API last performance sends it; `lastTimeByKind.ts` (`pairLastSets`, `pairedPerformance`, `targetPlaceholders`); `applyLastPerformance` pairs by kind and drops a lost pairing back to targets; active screen re-applies on draft change and pairs the previous column | domain + api + mobile | unit tests (AC-10, AC-11, FR-19, FR-20, EF-8) | `feat(workouts): pair last time by warm-up and working sets` |
| 3 | [x] `generatedWarmup` on draft sets, cleared on value or type change; `approachSetsDraft.ts` rewritten (`warmUpActionFor`, `previewApproachSets`, `confirmApproachSets`, `removeGeneratedWarmUps`); `ApproachSetsPreviewSheet`; toggle button and sheet on the active screen; generated mark on the set marker; i18n en/es | mobile | unit tests (AC-1–AC-8, AC-12, EF-1, EF-3, EF-4, EF-6) | `feat(workouts): preview, mark and undo warm-up sets in the active workout` |
| 4 | [x] Domain `isGeneratedWarmup` on routine sets; column + migration `20261018110000_add_routine_set_generated_warmup`; routines API reads/writes it (only with `isWarmup`); route test | domain + api | route test; `migrate diff` SQL | `feat(routines): routine sets remember generated warm-ups` |
| 5 | [x] Routine editor: `routineApproachSets.ts` rewritten around the toggle; mark in `RoutineSetTable`; button + preview sheet in `RoutineFormScreen`; load/save/clear the mark; duplicate copies it; workout from a routine carries it; i18n | mobile | unit tests (AC-9, FR-13, FR-14, FR-15) | `feat(routines): preview, mark and undo warm-up sets in the routine editor` |
| 6 | [ ] Progress log, definition of done | docs | — | `docs(sdd): close spec 0031 implementation` |
| 7 | [ ] [DEVICE] Preview sheet with one hand during a set; mark legible in light and dark; action reads add/remove (VoiceOver too); restart keeps the mark; routine saved and reopened keeps it; workout from that routine; History shows plain warm-ups; "last time" after inserting the ramp | device | owner, iOS | — |
| 8 | [ ] (owner: migration/deploy) Apply `20261018110000_add_routine_set_generated_warmup` and deploy the API | ops | `npm run db:deploy` | — |

Not verifiable in CI: tasks 7–8.

### Acceptance criteria → tasks

| AC | Tasks | How |
|---|---|---|
| AC-1 | 3, 7 | unit test (preview, draft unchanged); device |
| AC-2 | 3, 7 | unit test (preview is pure); device (cancel) |
| AC-3 | 3, 7 | unit test (confirm, marked, action `remove`); device (mark) |
| AC-4 | 3 | unit test (kept on add and remove, `keptWarmUps`) |
| AC-5 | 3 | unit test |
| AC-6 | 3 | unit test (edit clears the mark) |
| AC-7 | 3, 7 | unit test (JSON round-trip); device (restart) |
| AC-8 | 3, 7 | unit test (save input has no mark); device (History) |
| AC-9 | 4, 5, 7 | route test; unit tests (rows, duplicate, draft from routine); device |
| AC-10 | 2 | unit tests |
| AC-11 | 2 | unit test |
| AC-12 | 3 | unit test (lb) |

## Progress log

- 2026-10-17 — Plan and tasks written and self-approved under the owner's
  delegation. 0024's spec assumption "adding again replaces" marked
  superseded by 0031.
- 2026-10-17 — Task 2: the last-performance endpoint marks warm-ups
  (`isWarmupSet`, so both `type` and the legacy `isWarmup` column count).
  `pairLastSets` pairs by kind; `applyLastPerformance` flags the sets it
  fills (`lastTimePaired`) and puts a flagged set without counterpart back on
  its routine targets. The active screen now re-applies the fetched
  performances on every draft change (reference-stable, so one extra pass),
  and the "previous" column reads `pairedPerformance` — `previousSetLabel`
  itself is unchanged. The old "same reference" store test relied on
  order-matching and was rewritten for kinds.
- 2026-10-17 — Task 3: the store only gained the optional field and its
  clearing in `updateWorkoutSetDraft` (when the value actually changes) and
  `cycleWorkoutSetType`; everything else is in `approachSetsDraft.ts`
  (rewritten; the replace-on-add `addApproachSets` is gone). The toggle icon
  is a small shared `WarmUpActionButton` and the preview a shared
  `ApproachSetsPreviewSheet`, so the screen diff stays a handler, a state and
  the sheet. EF-1 is derived at render (the sheet hides when its exercise is
  gone or replaced) and enforced again in `confirmApproachSets`. Not done: a
  web preview of the sheet and mark (left to the device check, task 7).
- 2026-10-17 — Task 4: `RoutineExerciseSet.isGeneratedWarmup`; migration SQL
  produced with `prisma migrate diff --from-schema-datamodel` (old) →
  `--to-schema-datamodel` (new), one `ADD COLUMN … DEFAULT false`. The API
  stores the flag only for a literal `true` on a set that is also a warm-up,
  and the repository returns it only under the same condition. Not applied
  to a database here (owner, task 8).
- 2026-10-17 — Task 5: `routineApproachSets.ts` rewritten around the toggle
  (`routineWarmUpActionFor`, `previewRoutineApproachSets`,
  `confirmRoutineApproachSets`, `removeRoutineGeneratedWarmUps`, and
  `editRoutineSetValue`, which the editor's `updateSetField` now uses so a
  changed generated row loses its mark). The editor reuses the workout's
  `WarmUpActionButton` and `ApproachSetsPreviewSheet`; the preview is held
  per row and confirmed only if the row still has the same exercise (EF-1).
  `RoutineSetTable` shows the `W` with a sparkles badge and a spoken label
  for generated rows. The save sends `isGeneratedWarmup`, duplicate copies
  it, and `buildExerciseDrafts` turns a generated routine warm-up into a
  generated draft set (FR-15). Replacing a row's exercise keeps its rows and
  marks as they are (0020 behaviour, not changed here).

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Roadmap 01, backlog (incl. closing the 0023 follow-up) and glossary
      ("generated warm-up set") updates handed to the coordinator
- [ ] Checked on the owner's device (task 7)
- [ ] Migration applied on the server (task 8)
- [ ] `spec.md` status set to `done`
