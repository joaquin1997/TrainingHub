---
spec: 0034
status: in-progress  # Phase A, self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Tasks — Visual polish (Phase A)

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
App-only: no domain contract, no migration, no API change. Three new native
modules (task 11, 12) ride the owner's next rebuild. Phase B's tasks are in
*Phase B* below, planned in [`plan-b.md`](plan-b.md).

Order (spec NFR: closed scales before the shared blocks that use them):
scales + check → contrast → migration by area → shared blocks → skeletons and
empty states → brand → haptics → motion → Dynamic Type → docs.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks for Phase A; spec status `in-progress` | docs | — | `docs(sdd): plan and tasks for 0034 phase A` |
| 2 | [x] `typeScale` (six styles), `radii.round`, `spacing.xxs/xxxl`, `layout`; `commonStyles` rebuilt on them; scanner `styleScale.ts` + `styleScale.test.ts` with a per-file baseline | mobile | unit tests (AC-5 scanner, AC-6) | `feat(ui): closed type, shape and spacing scales with a check` |
| 3 | [x] `contrast.ts` + test over the palette pairs; `textSubtle` lightened; `controlBorder` for the undone done box | mobile | unit test (AC-7) | `feat(ui): palette meets WCAG AA contrast` |
| 4 | [x] Shared UI, app shell and auth on the scales | mobile | check baseline shrinks; typecheck | `refactor(ui): shared components and shell on the closed scales` |
| 5 | [x] Workouts on the scales | mobile | idem | `refactor(ui): workouts on the closed scales` |
| 6 | [x] Routines on the scales | mobile | idem | `refactor(ui): routines on the closed scales` |
| 7 | [x] Progress and profile on the scales | mobile | idem | `refactor(ui): progress and profile on the closed scales` |
| 8 | [x] Exercises and settings on the scales; baseline deleted (check strict); `keyboardAppearance="dark"` on every input | mobile | check strict (AC-5) | `refactor(ui): exercises and settings on the closed scales` |
| 9 | [x] `CardHeader`, `ListRow`, `EmptyState`, `Skeleton` in `src/ui`; adopted for card headers and list rows across screens | mobile | typecheck; search (AC-10) | `feat(ui): shared card header, list row and empty state` |
| 10 | [x] Skeleton first load + designed empty states with one action on Progress, History, Routines, Exercises; i18n | mobile | web screenshots (AC-8, AC-9) | `feat(ui): skeletons and designed empty states on the list screens` |
| 11 | [x] Brand assets script + PNGs; `app.json` icon / adaptive icon / favicon / splash / dark appearance; `expo-splash-screen`, `expo-system-ui`; splash hand-over in the root layout | mobile | config unit test; web favicon (AC-1, AC-2 partly) — **native rebuild** | `feat(ui): app icon, splash and dark system appearance` |
| 12 | [x] `expo-haptics`; `ui/haptics.ts`; `tickFeedback`; wired to tick, rest over, destructive confirm, remove set, discard-and-start | mobile | unit tests (AC-3 logic, EF-1, EF-3) — **native rebuild** | `feat(ui): haptic language` |
| 13 | [x] `useReducedMotion`; done-set transition; record badge pop; rest bar drains smoothly | mobile | typecheck; web export (AC-4 partly) | `feat(ui): small motion that respects reduce motion` |
| 14 | [x] Dynamic Type caps on fixed-width figures and bars | mobile | typecheck | `feat(ui): dynamic type caps on fixed-width figures` |
| 15 | [x] Progress log, web export check, definition of done | docs | `expo export --platform web` | `docs(sdd): record 0034 phase A implementation` |
| 16 | [ ] [DEVICE] After a native rebuild: AC-1 icon on home screen / switcher / no prebuild icon warning (iOS + Android); AC-2 splash frame by frame; AC-3 four haptic patterns, none on untick/scroll/buttons; AC-4 motion with Reduce Motion off and on; AC-11 largest accessibility text on an SE-width iPhone (active workout with L/R + superset + generated warm-up, routines list, routine detail, summary, settings) | device | owner | — |

Not verifiable in CI: task 16 and the native halves of 11 and 12. Owner
step: `pnpm install`, then `expo prebuild` and a device build (new native
modules: `expo-haptics`, `expo-splash-screen`, `expo-system-ui`). No server
step.

### Acceptance criteria → tasks

| AC | Tasks | How |
|---|---|---|
| AC-1 | 11, 16 | config test; device |
| AC-2 | 11, 16 | device |
| AC-3 | 12, 16 | unit tests; device |
| AC-4 | 13, 16 | web export; device |
| AC-5 | 2, 4–8 | strict check |
| AC-6 | 2 | unit test |
| AC-7 | 3 | unit test |
| AC-8 | 9, 10 | web screenshots; device |
| AC-9 | 9, 10 | web screenshots |
| AC-10 | 9, 10 | search |
| AC-11 | 14, 16 | device |

## Progress log

- 2026-10-18 — Plan and tasks for Phase A written and self-approved under the
  owner's delegation.
- 2026-10-18 — Task 2: the tokens moved to a pure `ui/tokens.ts` so tests can
  read them (`theme.ts` pulls in React Native and the font files). The check
  reads `src/` through Vite's raw glob (the app has no Node types). It
  started with a per-file baseline of 48 files / 246 violations
  (size, radius, spacing, missing dark keyboard; no colour literal existed).
- 2026-10-18 — Task 3: the spec's suggested `#8390A3` reaches only 3.98:1 on
  the done tint (the binding surface); `#8E9BAE` is the darkest grey of that
  hue at ≥ 4.5:1 everywhere (4.56 on lime soft, 4.57 on the done tint).
  Danger on the done tint is 4.64:1, so every accent pair passes.
- 2026-10-18 — Tasks 4–8: most literals moved by a mechanical pass
  (caption/body sizes, spacing, radii), figures, headings and titles by
  hand. The first web screenshots showed "PREVIOUS" truncated in its 64 pt
  column at the new 13 pt minimum (Spanish "SERIE" never fit its 36 pt
  column); table column headers became a sentence-case `columnLabel` role.
  Baseline deleted in task 8: the check is strict.
- 2026-10-18 — Tasks 9–10: card headers of 15 screens/components and the list
  rows of 5 go through `CardHeader` / `ListRow`; `StateView` delegates empty
  to `EmptyState`. Table-style data rows are not list rows (plan, As built).
  Skeleton, empty (new account) and error states checked in the web export
  with a mock API (screenshots listed in the report).
- 2026-10-18 — Task 11: `expo install` fails in the sandbox (no route to
  Expo's API); modules pinned from SDK 55's `bundledNativeModules.json`. The
  icon set is generated from the vendored Ionicons font with headless
  Chromium (`scripts/brand-assets.mjs`).
- 2026-10-18 — Tasks 12–14: `tickFeedback` reuses `recordNotice`, so the
  record pattern follows exactly the badge rules of 0032 (no starting
  records → tap only; late records → nothing). The rest bar's `scaleX` +
  `transformOrigin: 'left'` drains correctly on web too. Dynamic Type caps
  could not be exercised (react-native-web ignores the system text size).
- 2026-10-18 — Task 15: `expo export --platform web` bundles and emits the
  favicon. **Native rebuild needed** for the icon, splash, dark system UI
  and haptics (`pnpm install`, `expo prebuild`, device build).

## Definition of done (Phase A)

- [x] Every Phase A requirement and acceptance criterion is met or deferred
      to a [DEVICE] check
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [x] Web bundle exports
- [ ] Checked on the owner's device (task 16)
- [x] Phase B planned (`plan-b.md`, tasks below)

---

# Phase B — tasks

Plan: [`plan-b.md`](plan-b.md). Self-approved under the delegated gates,
2026-10-18. Three **independent workstreams** (B1, B2, B3): each can be
implemented by a different agent on its own branch, in parallel, and merged
in any order. Within a workstream the tasks are ordered (domain → API →
mobile → docs, as SDD asks); across workstreams there is no ordering.

Every task leaves the tree green (`pnpm -r typecheck`, `pnpm -r test` —
including the strict style-scale and contrast checks of Phase A). Each
workstream's last task also runs
`pnpm --filter @workout/mobile exec expo export --platform web`.

Shared-file rules (details in `plan-b.md`, *Parallel delivery*): i18n keys
are added only at each workstream's named spot; `package.json` /
`pnpm-lock.yaml` change in one commit per workstream and lockfile conflicts
are resolved by re-running `pnpm install`; `ui/tokens.ts` and
`ui/contrast.test.ts` are B1's only; in this file each workstream ticks only
its own rows and appends only to its own progress log.

## B1 — Active workout: set row, status area, sticky header

Owns: `features/workouts/components/{WorkoutSetRow,SetStatusArea,StickyWorkoutHeader}.tsx`,
`features/workouts/utils/{setStatus,stickyHeader}.ts(+test)`,
`features/workouts/screens/ActiveWorkoutScreen.tsx`,
`features/workouts/liveRecords/{RecordNotice,RecordBadge}.tsx`.
Shared: `ui/tokens.ts` (`figureLarge` only), `ui/contrast.test.ts` (own
block), i18n (end of `workouts`). No dependency, no API, no migration, no
native rebuild.

| # | Task | Verify | Commit message |
|---|---|---|---|
| B1.1 | [ ] `setStatus` + `setStatusLabel` (five states by priority) and `stickyHeaderModel` (up next via `currentSetToDo`, round via `roundStatus`, target values) — pure, with tests | unit tests (AC-13, AC-14 logic) | `feat(workouts): set status and sticky header models` |
| B1.2 | [ ] `figureLarge` 40/46 → 30/36; `SetStatusArea` (44 × 44, five looks, done fade and record pop moved into it); two-line `WorkoutSetRow` (marker secondary with 44 pt hit, inputs in Figure large, line 2 "Last …" + record label, remove and timer hit areas 44 pt); `WorkoutSetHeader` without "Previous"; status-area contrast pairs; i18n `workouts.setStatus` | unit + contrast tests; web screenshot at 375 pt: "102.5 × 8", L/R + weight, time row (AC-12); fallback 28/34 recorded if it clips | `feat(workouts): set row hierarchy with one status area` |
| B1.3 | [ ] `ActiveWorkoutScreen`: pass `hasRecord` / `isUpNext` to rows; delete the up-next ring and the per-set `RecordBadge` chip; round tag stays on the rail | typecheck; web screenshot with a done record set, up next and an undone generated warm-up (AC-13) | `refactor(workouts): set status lives in the row` |
| B1.4 | [ ] `StickyWorkoutHeader` (clock / paused, round chip, up next with target, tap → `scrollToSet`); threshold from the header card's layout, boolean state only on crossing; fade, instant under Reduce Motion; `RecordNotice` offset below it; i18n `workouts.stickyHeader` | unit tests; web export: scroll a superset workout, tap up next (AC-14) | `feat(workouts): sticky workout header` |
| B1.5 | [ ] B1 progress log, `plan-b.md` *As built* (B1), web export | `expo export --platform web` | `docs(sdd): record 0034 phase B1` |
| B1.6 | [ ] [DEVICE] AC-12 hit areas and figure size on an iPhone; AC-13; AC-14 in a real superset; EF-8 / AC-11 re-run of the active workout at the largest accessibility size on an SE-width iPhone; ticking and scrolling a 10-exercise workout stay smooth (NFR) | owner | — |

## B2 — Progress charts

Owns: `features/progress/components/{ProgressChart,ProgressBars}.tsx`,
`features/progress/utils/{chartData,linePath}.ts(+test)`, the four chart
call sites (`ExerciseProgressDetailScreen`, `ProgressOverviewScreen`,
`TimedProgress`, `profile/screens/MeasurementHistoryScreen` — props only),
`packages/domain/src/entities.ts` (`ExerciseProgressPoint.isRecord`),
`apps/api/src/features/progress/aggregate.ts(+test)`.
Shared: `apps/mobile/package.json` + `pnpm-lock.yaml` (`react-native-svg`
15.16.0), i18n (end of `progress`). API: additive field. Migration: none.
**Native rebuild**: yes (guarded — bars until then).

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| B2.1 | [ ] `ExerciseProgressPoint.isRecord?: true` (domain); `aggregate.ts` keeps each point's session index and flags points whose session beat a record; tests (flag set, absent when none, two entries in one workout) | domain + api | `pnpm -r test` | `feat(progress): flag record sessions on progress points` |
| B2.2 | [ ] `chartData`: `ChartPoint { date, value, isRecord, x, y }`, `positiveOnly`, one point centred, windows unchanged; `linePath`: `monotonePath`, `areaPath`, `nearestIndex`; point labels — pure, with tests (AC-15/16 logic, EF-7, 100 points) | mobile | unit tests | `feat(progress): line chart geometry` |
| B2.3 | [ ] Add `react-native-svg` 15.16.0; `ProgressChart` drawn as smooth line + gradient area + points (records orange) + first/last dates + min/max; one point → dot and value; current bars moved to `ProgressBars` as the old-binary fallback (`hasViewManagerConfig('RNSVGPath')`) | mobile | typecheck; web export screenshots of the four screens — **native rebuild** | `feat(progress): smooth line charts with record points` |
| B2.4 | [ ] Tap and drag (`PanResponder`, nearest point, guide line, readout in the header "date · value unit · Record"); per-point accessible columns; i18n `progress.chart`; call sites pass `isRecord` / `positiveOnly` / `formatValue` | mobile | unit tests (labels); web export: tap the 5th of 8 points (AC-15) | `feat(progress): read a chart point by tap or screen reader` |
| B2.5 | [ ] B2 progress log, `plan-b.md` *As built* (B2), web export; constitution amendment-log line for Article 9's reversed `react-native-svg` example | docs | `expo export --platform web` | `docs(sdd): record 0034 phase B2` |
| B2.6 | [ ] [DEVICE] After the rebuild and an API deploy: AC-15 on iPhone and Android (line, area, two orange points, tap and drag readout, VoiceOver and TalkBack read every point in order); AC-16; a 100-point chart draws without visible delay; before the rebuild the bars still show | device | owner | — |

## B3 — Summary comparison and share card

Owns: `features/workouts/screens/{WorkoutSummaryScreen,WorkoutSessionDetailScreen}.tsx`,
`features/workouts/utils/{workoutComparison,shareCard}.ts(+test)`,
`features/workouts/hooks/useWorkoutComparison.ts`,
`features/workouts/components/{ShareCard,ShareSheet}.tsx`,
`features/workouts/share/shareImage.ts`,
`features/progress/components/RecordsCard.tsx` (`variant="highlight"`).
Shared: `apps/mobile/package.json` + `pnpm-lock.yaml`
(`react-native-view-shot` 6.1.1, `expo-sharing` ~58.0.19), i18n (inside and
right after `workouts.share`; `progress.records.today`). **API: none** —
`GET /workouts` suffices (plan-b, *Decision*). Migration: none (reserved
range `2026101816xxxx`, unused). **Native rebuild**: yes (guarded — text
share until then).

| # | Task | Verify | Commit message |
|---|---|---|---|
| B3.1 | [x] `compareWithPrevious` (routine: previous saved workout of the same routine strictly before; per exercise: its last earlier session; up/down/same; null without an earlier session or with a previous volume of 0) and `useWorkoutComparison` (one `workoutsClient.list()`, failure → null) — with tests | unit tests (AC-17 logic, EF-5) | `feat(workouts): compare a finished workout with the previous one` |
| B3.2 | [x] Summary: records of the day as a highlighted block above the tiles (`RecordsCard variant="highlight"`), volume tile caption with the routine comparison (arrow + word), per-exercise comparison chip; nothing shown without data; i18n `workouts.comparison`, `progress.records.today` | typecheck; web export with a mock API: routine done before + two records; first workout (AC-17); list failing (EF-5) | `feat(workouts): summary leads with records and compares with last time` |
| B3.3 | [x] `buildShareCard` (stats, up to 3 records, up to 5 exercises with their best set, display unit, language) — pure, with tests; `ShareCard` view (360 × 450, tokens, app mark, no font scaling) | unit tests; web screenshot of the card in English/kg and Spanish/lb | `feat(workouts): workout share card` |
| B3.4 | [ ] Add `react-native-view-shot` 6.1.1 and `expo-sharing` ~58.0.19; `share/shareImage.ts` (availability with lazy `require`, capture 1080 × 1350 PNG, share sheet, failure result); `ShareSheet` (preview, Share image, Share as text, one-line failure); summary and session detail open the sheet; i18n inside `workouts.share` | typecheck; web export: image action hidden, text share works (EF-6) — **native rebuild** | `feat(workouts): share a workout as an image` |
| B3.5 | [ ] B3 progress log, `plan-b.md` *As built* (B3), web export | `expo export --platform web` | `docs(sdd): record 0034 phase B3` |
| B3.6 | [ ] [DEVICE] After the rebuild: AC-18 — share the image card to Messages / WhatsApp on iPhone and Android, in Spanish with lb, and the text share still offered; AC-17 on real data (routine done before with less volume); summary offline (EF-5) | owner | — |

## Phase B close-out (after B1–B3 are merged)

| # | Task | Verify | Commit message |
|---|---|---|---|
| B4 | [ ] Merge check (`pnpm install`, typecheck, test, web export on the merged tree); spec status `done` once tasks 16, B1.6, B2.6, B3.6 pass; `backlog.md`; spec *Related* follow-up (light theme) unchanged | CI + web export | `docs(sdd): close 0034 visual polish` |

Owner steps for Phase B: `pnpm install`; API redeploy (B2's `isRecord`, any
order); `expo prebuild` and a device build for `react-native-svg`,
`react-native-view-shot`, `expo-sharing`. No migration.

### Acceptance criteria → tasks (Phase B)

| AC / EF | Tasks | How |
|---|---|---|
| AC-12 | B1.1, B1.2, B1.6 | unit tests; web screenshot; device |
| AC-13 | B1.1, B1.3 | unit tests; web screenshot |
| AC-14 | B1.1, B1.4, B1.6 | unit tests; web export; device |
| AC-15 | B2.1 – B2.4, B2.6 | API + unit tests; web export; device (screen readers) |
| AC-16 | B2.2, B2.3 | unit tests; web export |
| AC-17 | B3.1, B3.2, B3.6 | unit tests; web export with mock API; device |
| AC-18 | B3.3, B3.4, B3.6 | unit tests; web; device |
| EF-5 | B3.1, B3.2 | unit test; web export with failing list |
| EF-6 | B3.4 | web export (unavailable path) |
| EF-7 | B2.2 | unit tests |
| EF-8 | B1.2, B1.4, B1.6 | web zoom proxy; device |

## Progress log (Phase B)

- 2026-10-18 — Phase B planned in `plan-b.md` and split into B1 / B2 / B3;
  self-approved under the owner's delegation. The tree moved to Expo SDK 58
  (RN 0.88) while planning; versions pinned from `expo@58.0.14`'s
  `bundledNativeModules.json` (`react-native-svg` 15.16.0,
  `react-native-view-shot` 6.1.1, `expo-sharing` ~58.0.19), all three
  resolved on npm from the sandbox. No migration in any workstream;
  B2 adds one optional field to progress points; B3 needs no API change.

### B1 log

### B2 log

### B3 log

- 2026-10-18 — B3.1: `utils/workoutComparison.ts` (`compareWithPrevious`,
  `loadWorkoutComparison`, `describeComparison`) and
  `hooks/useWorkoutComparison.ts`. Routine: latest saved workout with the same
  `routineId` started strictly before; per exercise: latest earlier workout of
  any routine containing it (entries summed); `same` when the delta rounds to
  0 in the display unit; null without an earlier session or with a previous
  volume of 0. Cancelled sessions are skipped **[ASSUMPTION]**. The load
  helper turns any rejection or non-array payload into null (EF-5); tested as
  a pure function since the mobile tests run in node.
- 2026-10-18 — B3.2: summary order hero → records of the day
  (`RecordsCard variant="highlight"`: `accentSoft` fill, `accent` edge, title
  `progress.records.today`; it replaces the old "records beaten" card lower
  down) → tiles (volume caption = routine comparison, arrow icon + sentence,
  green only when up) → exercises (trailing `Chip` with arrow + "+1250 kg" /
  "−…" / "Same", the full sentence as its accessibility label) → actions.
  The caption needed an icon and a tone, so `ui/StatTile.tsx` gained two
  optional props (`captionIcon`, `captionTone`, default unchanged) — a file
  outside B3's list, additive only. i18n `workouts.comparison` (after
  `share`) and `progress.records.today` (after `beaten`, away from B2's
  insertion point at the end of `progress`).
- 2026-10-18 — B3.3: `utils/shareCard.ts` (`buildShareCard`, `bestSet`) from
  the text share's input (translator with options): duration (when known),
  volume, sets done, ≤ 3 records + "+n more", ≤ 5 exercises in workout order
  that have a performed set, each with its best set (longest distance → longest
  time → heaviest weight then reps → most reps; warm-ups only when nothing
  else). A reps-only best set reads "12 reps" rather than the text share's
  "– kg × 12". `components/ShareCard.tsx`: 360 × 450 frame, `surface` panel,
  lime `pulse` mark, title/date, three stats, records in `accent`, exercise
  lines, footer; `allowFontScaling={false}` on every text; ref as a prop
  (React 19). i18n `workouts.share.cardFooter`, `moreRecords` added here (the
  card needs them); the sheet's keys come with B3.4.

## Definition of done (Phase B)

- [ ] Every Phase B requirement and acceptance criterion is met or deferred
      to a [DEVICE] check
- [ ] `pnpm -r typecheck` and `pnpm -r test` green on the merged tree
- [ ] Web bundle exports
- [ ] Checked on the owner's device (B1.6, B2.6, B3.6) after the native
      rebuild and API deploy
- [ ] `spec.md` status `done`; `../backlog.md` updated; constitution
      amendment-log line for Article 9 (B2.5)
