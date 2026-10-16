---
spec: 0017
status: in-progress  # self-approved 2026-10-16 under the owner's delegation
created: 2026-10-16
---

# Tasks — Visual redesign

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`) and
the app coherent: the shared style lands first, then one screen at a time.
Mobile only; no task needs a native rebuild or a redeploy.

Every screen task follows the same rule: **style and copy only** — handlers,
state and navigation are untouched, and the commit message lists the actions
and data the screen shows, so AC-11 (nothing lost) can be reviewed.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Spec, plan, tasks, reference mockups; glossary (primary action); backlog | docs | links resolve | `docs(sdd): spec 0017 visual redesign` |
| 2 | [x] Vendored Space Grotesk (Medium, Bold, OFL); font loading in the root layout with system-font fallback; typography tokens, `radii.pill`, restyled `commonStyles` and `screenHeader` | mobile | typecheck; app starts on web | `feat(ui): display typeface and typography tokens` |
| 3 | [x] `ScreenTitle`, `Chip`, `StatTile`, `StateView`; `Button` ghost variant + icon; `ActionSheet` restyle | mobile | typecheck | `feat(ui): shared redesign primitives` |
| 4 | [x] Tab bar icons and labels; tab roots without native header, `ScreenTitle` on Routines, Exercises, Progress, History, Settings; intro paragraphs removed | mobile | typecheck; visual (AC-3) | `feat(ui): redesigned tab bar and screen titles` |
| 5 | [x] `exerciseBlockLabels` (1 / 2A / 2B / 3, run start/end) + tests | mobile | unit tests (AC-5) | `feat(routines): superset block labels` |
| 6 | [x] Routines list (FR-13): active-workout card, folder sections, routine cards with chips, `StateView` | mobile | visual | `feat(routines): redesigned routines list` |
| 7 | [x] Routine detail (FR-14): header block, lock notice, numbered blocks with superset rail, set rows, rest chips, actions | mobile | visual (AC-5) | `feat(routines): redesigned routine detail` |
| 8 | [x] Active workout (FR-17): header card with clock / pause / progress, rest card, uniform set table, set-type markers, done green / failure orange, superset rail, footer actions | mobile | store tests; visual (AC-6, AC-7, AC-8); **[DEVICE]** start → log → pause → rest → finish | `feat(workouts): redesigned active workout` |
| 8b | [x] Active energy in the app (amendment): latest kcal published to a small store keyed by the workout identity, fed by the existing refresher; header tile on the active workout when known | mobile | unit test (store reset per workout, unknown stays hidden); **[DEVICE]** AC-13 | `feat(workouts): show active calories during the workout` |
| 9 | [x] Workout summary (FR-18): hero, stat tiles, sets per exercise, kg/lb not tonnes | mobile | visual (AC-9) | `feat(workouts): redesigned workout summary` |
| 10 | [x] History (FR-19) and workout detail (FR-20) | mobile | visual (AC-8) | `feat(workouts): redesigned history and workout detail` |
| 11 | [ ] Routine create / edit (FR-15): details card, numbered exercise cards, full-width set fields, single save with summary | mobile | visual (AC-10) | `feat(routines): redesigned routine editor` |
| 12 | [ ] Exercise picker and custom exercise (FR-16) | mobile | visual | `feat(exercises): redesigned exercise picker` |
| 13 | [ ] Exercises list and detail (FR-23) | mobile | visual | `feat(exercises): redesigned exercises list and detail` |
| 14 | [ ] Progress overview (FR-21) and exercise progress (FR-22), incl. chart, distribution and frequency components | mobile | visual | `feat(progress): redesigned progress screens` |
| 15 | [ ] Settings (FR-24) and sign-in (FR-25) | mobile | visual | `feat(settings): redesigned settings and sign-in` |
| 16 | [ ] Sweep: remove `EmptyState` and unused i18n keys; grep for hard-coded strings, stray colours and tonnes; spec status, backlog, progress log | mobile / docs | typecheck, tests, greps (AC-1, AC-2, AC-9) | `docs(sdd): close spec 0017 implementation` |

**[DEVICE]** for the owner's batch, after task 16: AC-2 in both languages,
AC-6 on an iPhone, AC-8 with a 40-character custom exercise, AC-12 at the
largest text size, AC-13 (kcal in the workout header vs the lock screen), and
the workout flow of task 8.

## Acceptance criteria → tasks

| AC | Task(s) |
|---|---|
| AC-1 colour meanings | 2, every screen task, 16 |
| AC-2 one language | every screen task, 16, [DEVICE] |
| AC-3 large title | 4 |
| AC-4 one primary action | every screen task |
| AC-5 1 / 2A / 2B / 3 | 5, 7, 8 |
| AC-6 workout top fold | 8, [DEVICE] |
| AC-7 done / failure colours | 8 |
| AC-8 long names wrap | 7, 8, 10, [DEVICE] |
| AC-9 lb, no tonnes | 9, 16 |
| AC-10 two-digit fields | 11 |
| AC-11 nothing lost | every screen task (commit message inventory) |
| AC-12 largest text size | [DEVICE] |
| AC-13 kcal in the app | 8b, [DEVICE] |

## Progress log

- 2026-10-16 — Spec, plan and tasks self-approved under the owner's
  delegation. Decided by the assistant (reviewable): keep the current palette
  (it *is* the Stitch canvas design system), adopt Space Grotesk for titles and
  figures only, done sets stay green.
- 2026-10-16 — Task 2. Fonts are the static Medium/Bold instances from the
  Space Grotesk project (OFL, copied from the `@expo-google-fonts` tarball, no
  dependency added). Visual checks run on the web build against a **local**
  API on a throwaway PGlite database seeded with the wger catalog and a
  preview account — nothing touches the home server. Found while looking:
  routine cards say "+2 more" in Spanish and History dates are English-style
  (FR-8, fixed in their screen tasks).

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Relevant `docs/roadmap/NN-*.md` checklist and progress log updated
      (cross-cutting: no area file; recorded in the backlog)
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] Constitution amended if this work settled a new invariant
