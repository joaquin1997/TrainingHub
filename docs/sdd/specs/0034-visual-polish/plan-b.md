---
spec: 0034
status: approved     # Phase B, self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Plan — Visual polish (Phase B)

How Phase B of `spec.md` (FR-19 – FR-25, AC-12 – AC-18, EF-5 – EF-7, and
EF-8 for the new set row) gets built. Phase A is in `plan.md` and shipped
(its *As built* section is the starting point here). The light theme is not
part of this plan: it is its own follow-up spec (spec assumption).

Phase B is split into **three independent workstreams** that different
agents can implement in parallel, on separate branches, with almost no file
overlap:

| | Workstream | Spec | Native deps | API change |
|---|---|---|---|---|
| **B1** | Active workout: set row, status area, sticky header | FR-19 – FR-21, AC-12 – AC-14, EF-8 | none | none |
| **B2** | Progress charts | FR-22, FR-23, AC-15, AC-16, EF-7 | `react-native-svg` | additive field on progress points |
| **B3** | Summary comparison and share card | FR-24, FR-25, AC-17, AC-18, EF-5, EF-6 | `react-native-view-shot`, `expo-sharing` | none |

Shared files and how each workstream keeps its edits small are listed under
*Workstreams* below; the merge rules are under *Parallel delivery*.

## Current state (verified in the code, 2026-10-18)

### Active workout (B1)

- `features/workouts/components/WorkoutSetRow.tsx` draws one row: type
  marker 36 × 36 (number, or W/D/F; dashed accent outline plus a 14 pt
  `sparkles` badge for a generated warm-up, 0031) · previous 64 pt (48 when
  compact), Caption muted · one `TextInput` per column at **Figure (20 pt)**,
  Body (16) when compact · done box 44 × 44 (`controlBorder` outline, green
  fill animated in, Phase A) · remove 20 pt wide with `hitSlop` 6 (≈ 32 pt hit
  area, under 44). A time cell holds a 28 pt timer button (`hitSlop` 4 →
  36 pt). Compact = more than two columns, or a time column with another one.
  `WorkoutSetHeader` draws the column labels with the same widths.
- `screens/ActiveWorkoutScreen.tsx` (1293 lines) wraps each row in a `View`
  (its ref feeds the "scroll the next set into view" of 0018) and draws three
  more status marks *outside* the row: the superset **round tag** on the rail
  (`roundTagSlot`, 0029), a lime **up-next ring** over the whole row
  (`upNextRing`, from `currentSetToDo`), and a **`RecordBadge` chip under the
  row** (`liveRecords.badges.bySet[set.id]`, popping when
  `recordPopSetId === set.id`). An exercise's session-volume badge sits in its
  `CardHeader`.
- **Up next** today is `restTimer/nextSetToDo.currentSetToDo(draft)`: the next
  set after the last one ticked (or after the running rest's exercise, else
  the first set left), in round order inside a superset. The rest bar, the
  rest-over alert and the watch use the same function (0025, 0029).
- The **header card** (live dot, routine name, clock + pause, kcal, sets
  done + progress track, autosave hint) is the first child of the
  `ScrollView` and scrolls away. `RestBar` is pinned below the list (0018).
  `RecordNotice` is an absolute overlay at `top: spacing.md`.
- `superset/rounds.ts` has `roundStatus(members)` → `{ current, total }` and
  `supersetAround`; `routines/utils/supersetGroups.runAt` finds an
  exercise's block.
- Type scale (Phase A, `ui/tokens.ts`): `figureLarge` 40/46 is used by the
  workout clock, the Settings rest stepper and the measurement "latest"
  figure; `figure` 20/26 by the set inputs and tiles.

### Progress charts (B2)

- `features/progress/components/ProgressChart.tsx`: dependency-free bars
  from `View`s, 120 pt tall, a value above every bar, a date under every bar,
  latest bar lime, the range in the `CardHeader`. Input: `ChartSeries` from
  `utils/chartData.ts` (`scaleSeries` keeps the last `maxPoints` — 12 per
  exercise, 8 weeks — and pre-scales heights; `buildProgressSeries` already
  **skips points without the metric**, but keeps zeros).
- Four uses: `ProgressOverviewScreen` (weekly volume, display unit),
  `ExerciseProgressDetailScreen` (estimated 1RM, else volume per session),
  `TimedProgress` (longest time or distance), `profile/screens/
  MeasurementHistoryScreen` (a measurement's trend, one decimal).
  `FrequencySummary` and `MuscleDistribution` draw their own bars (FR-23).
- **No per-point record flag reaches the phone.** The API derives the
  records each session beat (`apps/api/src/features/progress/records.ts`
  `deriveExerciseRecords().hits[i]`, sessions merged per workout) and only
  exposes "the last session was a record" (`isRecordSession`) and the bests.
  `ExerciseProgressPoint` (domain) is `{ date, bestWeightKg?, bestReps?,
  totalVolume, estimatedOneRepMax?, bestDurationSeconds?,
  bestDistanceMeters? }`; points are one per workout *exercise entry*
  (`buildAccumulators`), records one per workout.
- `react-native-svg` is **not installed** (constitution Article 9 cites it as
  the dependency deliberately deferred by roadmap area 4).

### Summary and share (B3)

- `screens/WorkoutSummaryScreen.tsx` renders from the local
  `getLatestCompletedWorkout()` draft: hero (trophy, routine name, "saved"
  chip) · tiles (duration, volume, sets; time/distance) · `RecordsCard`
  "records beaten" (from `progressClient.sessionRecords()` matched by
  `clientId`, failure ignored) · exercise cards with their sets · actions
  (back to routines, **Share**, history, start again).
- Share (0028): `utils/shareText.formatWorkoutShareText` (pure, tested) +
  `utils/shareWorkout.shareWorkoutText` (`Share.share({ message })`). Used by
  the summary and by `WorkoutSessionDetailScreen` (history detail).
- **Comparison data already exists**: `GET /workouts` (`workoutsClient.list`)
  returns every saved session of the user, newest first, with `routineId`
  (optional provenance, 0014), `startedAt`, exercises and sets with the
  server-derived `performed` flag (0013). `utils/sessionStats` has
  `summarizeSession` (volume of performed sets, kg) and `exerciseVolumeKg`.
  `GET /workouts/exercises/:id/last` cannot serve "last time" at the summary:
  the workout just saved *is* the last performance by then.
- No image capture or file-sharing module is installed.
- **The app is on Expo SDK 58** (`expo ~58.0.14`, React Native 0.88, React
  19.3 — merged into the task branch on 2026-10-18 while this plan was
  written; the request said SDK 55, the tree says 58, the tree wins). The
  `bundledNativeModules.json` of `expo@58.0.14` (read from the npm tarball;
  the registry is reachable from the sandbox, `expo install` / Expo's API
  were not in Phase A) pins `react-native-svg` **15.16.0**,
  `react-native-view-shot` **6.1.1** (peers `react-native >= 0.80`;
  `html2canvas-pro` optional, for web only) and `expo-sharing` **~58.0.19**.
  Not chosen: `react-native-gesture-handler`, `react-native-reanimated`,
  `expo-file-system`.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Only FR-19 – FR-25. No light theme, no new derivations beyond FR-24's comparison (computed on the phone, never stored), no new chart types; frequency and muscle bars only restyled where they already use the scales (they do since Phase A — nothing to change). The share card is a *second* option; text share stays. No change to what the active workout does: remove, type cycling, timer, tick keep their behaviour, only their place and size. |
| 2 — Template vs performed | yes (B3) | "Previous workout of the same routine" reads the saved `WorkoutSession.routineId` provenance; nothing writes to a routine or links a template to a performed session beyond what 0014 already stores. |
| 3 — Shared domain types | yes (B2) | `ExerciseProgressPoint.isRecord?: true` added in `packages/domain` only; API sets it, mobile reads it. No shape duplicated in an app. B3's comparison types are mobile-only view models, not contracts. |
| 4 — Weight in kg | yes | Comparison deltas, chart values and card figures are computed in kg and formatted with `lib/weight.ts` in the display unit at the edge (the summary's session unit; progress screens' settings unit, as today). Chart series are converted before scaling, as today. |
| 5 — Prisma migrations | no | No schema change. `isRecord` is derived on read. Reserved range if a workstream ever needs one: B3 `2026101816xxxx`; none is planned. |
| 6 — Integrations behind interfaces | yes (B3) | Image capture and the system share sheet sit behind `features/workouts/share/shareImage.ts` (`shareImageAvailable()`, `captureAndShare(ref)`); screens never import `react-native-view-shot` or `expo-sharing`. Chart drawing is a presentation library, reached only from `ProgressChart`. |
| 7 — Secrets | no | — |
| 8 — Committable + verified | yes | Each workstream is a short sequence of green commits (tasks.md, Phase B). Workstreams merge in any order; each leaves `pnpm -r typecheck` and `pnpm -r test` green on its own and after merging the others. |
| 9 — Dependencies | yes | Three **native** packages, each the standard Expo SDK 58 choice, pinned to SDK 58's `bundledNativeModules.json`. **`react-native-svg` 15.16.0** (B2): the only practical way to draw a smooth curve and a filled area on iOS, Android and web; dependency-free `View`s cannot draw a Bézier path (Article 9's own example: line charts were deferred exactly for this). **`react-native-view-shot` 6.1.1** (B3): renders a laid-out view to a PNG file; the alternative — drawing the card twice, once in views and once in SVG text for `toDataURL` — duplicates the card and loses the app's fonts. **`expo-sharing` ~58.0.19** (B3): opens the system share sheet for a *file*; React Native's `Share` cannot share a file on Android. All three need `expo prebuild` and a device build; each is guarded so the JS update runs on the old binary (see Risks). Rejected: a chart library (victory-native, gifted-charts) — more weight than one path builder; `react-native-gesture-handler` / `reanimated` — `PanResponder` is enough for tap-and-drag on one view; `expo-file-system` — view-shot already writes the temp file. |
| 10 — TODOs over half-solutions | yes | Device-only checks are [DEVICE] tasks. Two unknowns are stated with their check (figure fit at 375 pt, view-shot on web); see Risks. |

## Workstreams

### B1 — Active workout: set row, status area, sticky header

**Set row (FR-19, AC-12, EF-8).** The row becomes two lines in one bordered
row (`WorkoutSetRow`):

```
┌────────────────────────────────────────────────────────┐
│ [2]   [  102.5  ] [   8   ]                [status] [×] │  line 1: 44 pt high
│       Last 100 × 8 · Heaviest weight 102.5 kg            │  line 2: Caption
└────────────────────────────────────────────────────────┘
```

- **Line 1**: type marker · value inputs · **status area** · remove.
  - *Marker*: 32 × 32 visual, Body size digit, `textMuted` (the set number;
    W/D/F for typed sets, `accent` for failure as today) — secondary.
    `hitSlop` to a 44 pt hit area. Tap still cycles the type.
  - *Inputs*: **Figure large** for every value column, normal *and* compact
    rows (weight, reps, both L/R sides, time, distance). Inputs flex to share
    the width left. No previous column any more.
  - *Status area*: the done target **is** the status area — one 44 × 44
    `SetStatusArea` at a fixed place, always tappable to tick/untick. It shows
    exactly one state, by priority (FR-19):

    | State | Look (shape + colour, FR-17) | Accessibility state/label |
    |---|---|---|
    | `record` | `accent` fill, `trophy` in `onPrimary` | checked; "Done, record" + badge label |
    | `done` | `success` fill, `checkmark` in `onPrimary` (Phase A fade) | checked; "Done" |
    | `generatedWarmup` | dashed `accent` outline, `sparkles` in `accent` | unchecked; "Generated warm-up, not done" |
    | `upNext` | 2 pt `primary` outline, `checkmark` in `primary` | unchecked; "Up next" |
    | `none` | `controlBorder` outline, `checkmark` in `controlBorder` | unchecked |

    The Phase A animations move with it: the done fill fades (FR-6), the
    trophy pops once when the tick earned it (FR-7, same
    `recordPopSetId` trigger). Reduce Motion as in Phase A.
  - *Remove*: 32 pt wide, 44 pt tall, `hitSlop` `{ left: 4, right: 8 }` →
    44 × 44 hit area that never overlaps the status area (the row gap is
    8 pt). Icon 18 pt `textMuted`.
  - *Timer button* (time cell): 32 pt visual, `hitSlop` 6 → 44 pt.
- **Line 2** (Caption, `textMuted`, wraps — EF-8): "Last 100 × 8" (the
  existing `previousSetLabel`, prefixed with a short "Last"), then, when the
  set has a record badge, its label in `accent` (`recordBadgeLabel`). This is
  where badge text that does not fit the status area stays readable (FR-19);
  it never overlaps line 1. Line 2 is omitted when there is nothing to say
  ("–" and no record) so short rows stay short.
- **Out of the row**: the up-next ring (`upNextRing`) and the per-set
  `RecordBadge` chip under the row are deleted from `ActiveWorkoutScreen`;
  the generated-warm-up badge and dashed outline leave the marker. The
  superset **round tag stays on the rail** (FR-19). The done-row tint stays
  (it is the row's done look of FR-6, not a second indicator). The
  exercise-level session-volume `RecordBadge` in the card header stays (it
  is not a set's status).
- `WorkoutSetHeader`: labels over marker ("Set"), each value column (unit,
  "Reps", "L", "R", "Time", "Dist."), nothing over status/remove. No
  "Previous" header (line 2 is self-describing).
- **Type scale**: `figureLarge` is retuned **40/46 → 30/36**
  **[ASSUMPTION]**. At 40 pt a five-character weight ("102.5") cannot fit a
  value column of a 375 pt-wide phone (≈ 85 pt per column for two columns
  once marker, status and remove take theirs); 30 pt fits with margin in the
  normal row. The clock, the Settings rest stepper and the measurement
  "latest" figure follow (still the largest figure on their screens).
  Compact rows (three columns, or time + timer) keep Figure large; a value
  wider than its column scrolls inside its field rather than clip —
  **[ASSUMPTION]**, checked on the web export with "102.5 × 10 / 10" (L/R +
  weight) and on the device; if it reads badly the fallback is one token
  (28/34) and is recorded in *As built*. `fontScaleCap.fixedColumn` (1.3)
  stays on the inputs; line 2 is not capped (it wraps).
- **Pure logic** — `features/workouts/utils/setStatus.ts`:
  `setStatus(set, { hasRecord, isUpNext })` → the five states by priority;
  `setStatusLabel(status, t)` for the accessibility label. Unit-tested
  against AC-13 (done + record → record; first undone → up next; undone
  generated warm-up → its mark; done generated warm-up → done; up-next that
  is an undone generated warm-up → generated warm-up, per the priority).

**Up next (FR-20).** The single source stays `currentSetToDo(draft)` — the
same set the rest bar names, the rest-over alert announces and the watch
shows. **[ASSUMPTION: FR-20's "first set in workout order not done" is
read as `currentSetToDo`]**: they coincide when sets are done in order (and
in round order inside a superset, AC-14); when someone skips ahead, the set
after the last tick is "up next" everywhere at once instead of the phone
and the rest bar disagreeing. Exactly one set or none, as FR-20 requires.

**Sticky header (FR-21, AC-14).** New `components/StickyWorkoutHeader.tsx`,
an absolutely positioned bar at the top of the screen (above the
`ScrollView`, below nothing — `RecordNotice` moves below it, see shared
files) that appears when the full header card has scrolled out of view:

- The screen measures the header card's height (`onLayout`) and listens to
  `onScroll` (`scrollEventThrottle={16}`), keeping one boolean state
  `compactHeader` that only changes when the threshold is crossed, so
  scrolling does not re-render the list (NFR performance). Fade in/out
  150 ms, instant under Reduce Motion.
- Content, one row (wraps to two at large text, EF-8): **clock** (`figure`
  size, `primary`, paused → `textMuted` + "Paused" word) · **round** chip
  "Round 2 of 3" when the up-next set is in a superset (`roundStatus` of its
  block) · **up next** "B · Set 2 · 60 kg × 8" (exercise name truncated to
  one line, set number as the row shows it, a warm-up says so, target = the
  set's typed values, else its placeholders, in the session unit) with a
  chevron. All sets done → "All sets done" and no tap.
- Tapping the up-next part scrolls to that set — the existing
  "measure the row, scroll it to a third of the viewport" code is extracted
  into a local `scrollToSet(setId)` in the screen and reused by the rest-end
  effect and the header. The whole up-next part is the button (≥ 44 pt
  tall).
- The full header card is unchanged (0017 FR-17) and shows when scrolled to
  the top. The rest bar stays at the bottom (0018).
- **Pure logic** — `features/workouts/utils/stickyHeader.ts`:
  `stickyHeaderModel(draft)` → `{ upNext: { workoutSetId, exerciseName,
  blockLabel, setNumber, isWarmup, values } | null, round: { current, total }
  | null }`, reusing `currentSetToDo`, `exerciseBlockLabels`, `runAt`,
  `roundStatus`, `effectiveSetValue`. Unit-tested on AC-14's case (A/B
  superset, round 2, A2 done → round 2, B2).

**Files owned by B1** (no other workstream edits them):

- `apps/mobile/src/features/workouts/components/WorkoutSetRow.tsx` — two-line row, header.
- `apps/mobile/src/features/workouts/components/SetStatusArea.tsx` — new.
- `apps/mobile/src/features/workouts/components/StickyWorkoutHeader.tsx` — new.
- `apps/mobile/src/features/workouts/utils/setStatus.ts` + `.test.ts` — new.
- `apps/mobile/src/features/workouts/utils/stickyHeader.ts` + `.test.ts` — new.
- `apps/mobile/src/features/workouts/screens/ActiveWorkoutScreen.tsx` — wire status/up next into rows, delete ring and per-set chip, sticky header, `scrollToSet`.
- `apps/mobile/src/features/workouts/liveRecords/RecordNotice.tsx` — `top` offset prop so it sits under the sticky header.
- `apps/mobile/src/features/workouts/liveRecords/RecordBadge.tsx` — only if its pop animation is extracted for reuse by the status area (e.g. `usePop(pop)`); behaviour unchanged.

**Shared files B1 may touch**

- `apps/mobile/src/ui/tokens.ts` — **B1 only** among the workstreams: the
  one-line `figureLarge` retune (and nothing else). B2/B3 use existing tokens.
- `apps/mobile/src/ui/contrast.test.ts` — B1 adds the status-area pairs
  (`onPrimary` on `accent`, `primary` outline on `surface`/`surfaceRaised`
  ≥ 3:1) in its own `describe` block. B2/B3 do not edit it.
- `apps/mobile/src/i18n/locales/{en,es}.ts` — new keys only, in new objects
  `workouts.setStatus` and `workouts.stickyHeader` inserted **at the end of
  the `workouts` block** (just before `progress:`). Changed strings: none
  except `workouts.colPrev` becoming unused (left in place, as Phase A did).

**Migrations**: none. **API**: none. **Native rebuild**: none.

### B2 — Progress charts

**Drawing.** `ProgressChart` keeps its name, its place in the four screens
and its card (`CardHeader` + body), and is redrawn with `react-native-svg`:

- Chart area: full card width (`onLayout`) × 140 pt, a module constant (the
  style check scans sizes of type, radius and spacing, not heights; tokens
  stay B1's), y-domain = data min…max padded by 10 % (not zero-based: a 1RM
  trend from 100 to 110 kg must be readable), x evenly spaced by session
  order (dates are labels, not a time axis).
- **Line**: monotone cubic (Fritsch–Carlson) through the points — smooth,
  and never overshooting below the lowest or above the highest value, so the
  curve cannot dip toward zero (EF-7). 2.5 pt `primary` stroke.
- **Area**: the same path closed to the bottom, filled with an SVG
  `LinearGradient` from `primary` at 0.28 opacity to 0 — colours from the
  palette with `stopOpacity`, never a colour literal (the style check bans
  them).
- **Points**: one dot per session point, 3.5 pt radius `primary` on a
  `surface` ring; **record points** 5 pt `accent` (FR-22, orange). The latest
  point is not specially coloured any more (the readout carries it).
- **Axis labels**: first and last date under the chart (Caption,
  `textMuted`); min and max value at the left edge (Caption, `textSubtle`).
- **One point** (AC-16): one dot at mid-height, centred, no line, no area,
  and its value shown in the readout. **Gaps** (EF-7): series are built from
  points that *have* the metric and, for 1RM and volume, a value > 0
  **[ASSUMPTION: a session volume of 0 — reps-only or timed sets — is "no
  value", not a zero]**; the line joins what exists.

**Tap and drag (FR-22).** A `PanResponder` on the chart area: touch start
and move select the nearest point by x (`nearestIndex`, pure); release keeps
the selection; a tap outside the plot or on the same point clears it. The
selected point gets a vertical guide (hairline `borderStrong`) and a larger
dot. The **readout** replaces the range in the `CardHeader` trailing slot
while a point is selected: "12 Oct · 102.5 kg" (+ "· Record" with a trophy
when it is one), in the screen's display unit and `formatValue`; with no
selection it shows the range as today. On web, mouse down/move work through
react-native-web's responder system.

**Accessibility (FR-22, AC-15).** Over the plot, one transparent `View` per
point (absolutely positioned column, `accessible`, `accessibilityLabel` =
"date, value unit[, record]", `accessibilityRole="button"`,
`onAccessibilityTap` selects it). VoiceOver and TalkBack swipe through the
points in order. The columns sit *under* the pan layer, so touch goes to the
`PanResponder` while the columns serve only the accessibility tree; the pan
layer and the SVG are hidden from it (`accessibilityElementsHidden`,
`importantForAccessibility="no-hide-descendants"`).

**Records on points (API, additive).** `ExerciseProgressPoint.isRecord?:
true` in `packages/domain` — "this session beat at least one of the
exercise's records (0023)", present only when true so older payloads and
existing `toEqual` expectations without records stay valid.
`apps/api/src/features/progress/aggregate.ts`: `buildAccumulators` keeps,
per point, the index of its session in the chronological list (internal,
not in the payload); `buildExerciseProgressDetail` sets `isRecord` on a
point when `records.history.hits[position]` for that session index is
non-empty (`sessionIndexes.indexOf(sessionIndex)`). An exercise logged twice
in one workout gives two points of the same date; both carry the flag (the
records are per workout). Older servers send no flag → no orange points,
nothing else changes. Weekly volume and measurements have no records.
**[ASSUMPTION: "sessions that set a personal record" = beat any record
type]**, the same rule as the "recent PR" chip (`isRecordSession`), not
only the charted metric.

**Pure logic** — `features/progress/utils/`:

- `chartData.ts`: `buildProgressSeries` keeps a point's `isRecord` and gains
  `{ positiveOnly }` (used for 1RM and volume); `ChartBar` becomes
  `ChartPoint { date, value, isRecord, x, y }` with `x`, `y` in 0..1;
  `scaleSeries` keeps its windows (12 sessions, 8 weeks) **[ASSUMPTION:
  windows unchanged]**; one point → `{ x: 0.5, y: 0.5 }`.
- `linePath.ts` (new): `monotonePath(points, width, height)` → SVG `d` for
  the line, `areaPath(...)` for the fill, `nearestIndex(points, x, width)`.
  Tests: monotone (no y outside [min, max]), one point → no path, 100 points
  build under a few ms (NFR), nearest index at edges and midpoints.
- `chartData.test.ts` updated; `chartA11y.ts` (or inside `chartData.ts`):
  `pointLabel(point, formatDate, formatValue, unit, t)` tested.

**Old binary guard.** `ProgressChart` renders the SVG only when the native
SVG view is registered (`UIManager.hasViewManagerConfig('RNSVGPath')` on
native, always on web); otherwise it falls back to the current bars, kept as
`ProgressBars` in the same folder. An app update that reaches a phone before
the rebuild therefore keeps today's charts instead of crashing.

**Files owned by B2**

- `apps/mobile/src/features/progress/components/ProgressChart.tsx` — SVG line chart, readout, a11y columns, guard.
- `apps/mobile/src/features/progress/components/ProgressBars.tsx` — new, the current bars moved (fallback only).
- `apps/mobile/src/features/progress/utils/chartData.ts` + `.test.ts`.
- `apps/mobile/src/features/progress/utils/linePath.ts` + `.test.ts` — new.
- `apps/mobile/src/features/progress/screens/ExerciseProgressDetailScreen.tsx`, `ProgressOverviewScreen.tsx`, `components/TimedProgress.tsx`, `apps/mobile/src/features/profile/screens/MeasurementHistoryScreen.tsx` — props only (series builder options, record points); each a few lines.
- `packages/domain/src/entities.ts` — `isRecord?: true` on `ExerciseProgressPoint` (one field + doc comment).
- `apps/api/src/features/progress/aggregate.ts` + `aggregate.test.ts` — the flag and its tests.

**Shared files B2 may touch**

- `apps/mobile/package.json` + `pnpm-lock.yaml` — add `react-native-svg`
  `15.16.0` (exact, as SDK 58's `bundledNativeModules.json`) in its own commit. On a
  lockfile conflict with B3, take either side and re-run `pnpm install`
  (never hand-merge the lockfile).
- `apps/mobile/src/i18n/locales/{en,es}.ts` — new object `progress.chart`
  (`readout`, `record`, `pointLabel`, `pointLabelRecord`) inserted **at the
  end of the `progress` block** (after `records`).

**Migrations**: none. **API**: additive, deploy order free (older app
ignores the flag; newer app without it shows no orange points). **Native
rebuild**: yes (`react-native-svg`); guarded until then.

### B3 — Summary comparison and share card

**Comparison (FR-24, AC-17, EF-5).** No API change: `GET /workouts`
already returns everything needed (decision below).

- `features/workouts/utils/workoutComparison.ts` (pure):
  `compareWithPrevious(current, saved)` where `current` = `{ routineId?,
  startedAt, exercises: [{ exerciseId, sets (with performed) }] }` and
  `saved` = `WorkoutSession[]`:
  - **Routine**: `previous` = the most recent saved session with the same
    `routineId` and `startedAt` strictly before the current one (the just
    saved workout has the same `startedAt` and is never its own previous).
    No `routineId` on the current workout (0014 link lost, or none) → no
    routine comparison, per-exercise only (spec assumption).
  - **Per exercise**: for each exercise of today (entries of the same
    exercise summed), the most recent earlier saved session that contains
    it, any routine (0013 "last time"); its volume = `exerciseVolumeKg` over
    performed sets.
  - Each comparison: `{ deltaKg, direction: 'up' | 'down' | 'same',
    previousDate }`; `same` when the delta rounds to 0 in the display unit.
    **No comparison** (null) when there is no earlier session, or when the
    earlier volume is 0 **[ASSUMPTION: a previous volume of 0 — reps-only or
    timed — has nothing to compare with]**; never "0" or a percentage.
  - Tests: AC-17's case (more volume today → up, delta), first workout of
    the routine → null, lost link → per exercise only, equal → same,
    exercise new today → null, warm-ups counted as in `summarizeSession`,
    legacy session (no `performed`, falls back as `isPerformedSet` does).
- `features/workouts/hooks/useWorkoutComparison.ts`: `workoutsClient.list()`
  once when the summary opens; any failure → `null` and nothing shown, no
  banner (EF-5).
- **Summary layout** (`WorkoutSummaryScreen`): hero → **records of the day**
  (when any, a highlighted block: `RecordsCard` with `variant="highlight"`,
  `accentSoft` card with an `accent` hairline, title "Records today") →
  tiles, where the volume tile's caption becomes the comparison
  ("▲ 1,250 kg vs 12 Oct" / "▼ …" / "= same as 12 Oct", arrow icon + word,
  not colour alone — FR-17; `success` up, `textMuted` same, `textMuted`
  down — down is not an error) → exercises, each card header with a small
  trailing comparison chip (same rule) → actions. Records still load
  asynchronously; the block appears when they arrive.

**Share card (FR-25, AC-18, EF-6).**

- `features/workouts/utils/shareCard.ts` (pure): `buildShareCard(input)` from
  the same `ShareWorkoutInput` the text share uses (title, date, duration,
  volume, sets done, records) → `{ title, date, stats[], records[] (max 3,
  "+n more"), exercises[] (max 5, in workout order, each with its **best
  set**) }`. Best set = the performed working set (warm-ups excluded unless
  the exercise has only warm-ups) with the highest weight, then most reps;
  time → longest; distance → longest; reps-only → most reps; formatted with
  `formatSetValues` in the display unit. Nothing else: no notes, no body
  measurements, no email (FR-25). Tests cover each tracking type, > 5
  exercises, no records, unit lb, Spanish labels via a fake `t`.
- `features/workouts/components/ShareCard.tsx`: a fixed 360 × 450 pt view
  (4:5), `background` with a `surface` panel, the app mark (Ionicons
  `pulse` in a lime tile, as the sign-in screen and the icon), routine name
  (`title`), date (`caption`), three stat figures (duration, volume, sets),
  the records block (trophy, `accent`), up to five exercise rows (name +
  best set), and a small "TrainingHub" footer. Uses only tokens; Dynamic Type
  is **disabled inside the card** (`allowFontScaling={false}`) so the image
  is the same for everyone **[ASSUMPTION]**.
- `features/workouts/share/shareImage.ts` (the interface, Article 6):
  `shareImageAvailable()` (false on web and when the native modules are
  missing — lazy `require` inside `try`, so an old binary does not crash at
  import) and `captureAndShare(ref, { dialogTitle })` → `captureRef(ref,
  { format: 'png', quality: 1, width: 1080, height: 1350, result:
  'tmpfile' })` then `Sharing.shareAsync(uri, { mimeType: 'image/png', UTI:
  'public.png' })`; resolves `'shared' | 'failed'`; cancelling is `shared`.
- `features/workouts/components/ShareSheet.tsx`: the Share button now opens a
  bottom sheet (`Modal`, like `ui/ActionSheet`) with the card preview
  (scaled to fit the screen width; the captured view is the unscaled card
  inside it, `collapsable={false}`) and two actions: **Share image** (primary;
  hidden when `shareImageAvailable()` is false) and **Share as text** (the
  0028 text, unchanged). A failed capture/share shows one line in the sheet
  ("Couldn't create the image — share as text instead") and leaves the text
  action working (EF-6).
- Used by `WorkoutSummaryScreen` and `WorkoutSessionDetailScreen` (both
  share today); the detail screen only swaps its share call for the sheet.

**Decision: no API change for the comparison.**

- *Chosen*: derive on the phone from `GET /workouts`. Pure and fully
  unit-testable, works against every server version (the endpoint, its
  `routineId` and `performed` exist since 0013/0014), offline → no
  comparison (EF-5). Cost: the summary downloads the whole history once —
  the History tab already does exactly this.
- *Rejected*: `GET /workouts/:id/comparison` (server-side) — a new route,
  route tests and a deploy-order constraint for one screen; reconsider only
  if history payloads grow large (TODO in Risks).
- *Rejected*: `/workouts/exercises/:id/last` per exercise — after saving it
  returns today's workout itself; making it accept a `before` parameter is
  still an API change, and it cannot give the routine comparison.

**Files owned by B3**

- `apps/mobile/src/features/workouts/screens/WorkoutSummaryScreen.tsx` — layout, comparison, sheet.
- `apps/mobile/src/features/workouts/screens/WorkoutSessionDetailScreen.tsx` — share button opens the sheet (a few lines).
- `apps/mobile/src/features/workouts/utils/workoutComparison.ts` + `.test.ts` — new.
- `apps/mobile/src/features/workouts/hooks/useWorkoutComparison.ts` — new.
- `apps/mobile/src/features/workouts/utils/shareCard.ts` + `.test.ts` — new.
- `apps/mobile/src/features/workouts/components/ShareCard.tsx`, `ShareSheet.tsx` — new.
- `apps/mobile/src/features/workouts/share/shareImage.ts` — new.
- `apps/mobile/src/features/progress/components/RecordsCard.tsx` — optional `variant="highlight"` (default unchanged; B2 does not edit this file).

**Shared files B3 may touch**

- `apps/mobile/package.json` + `pnpm-lock.yaml` — add
  `react-native-view-shot` `6.1.1` and `expo-sharing` `~58.0.19` in one
  commit (not `html2canvas-pro`: the image action is not offered on web); lockfile conflicts as for B2 (re-run `pnpm install`).
- `apps/mobile/src/i18n/locales/{en,es}.ts` — new keys **inside the existing
  `workouts.share` object** (`image`, `asText`, `sheetTitle`, `imageFailed`,
  `cardFooter`, `moreRecords`) and a new `workouts.comparison` object
  inserted **right after `share`**; `progress.records.today` inside
  `progress.records`. B1 inserts at the end of `workouts`, B2 at the end of
  `progress`, so the hunks do not touch.
- `apps/mobile/src/features/workouts/utils/shareText.ts` — only if the card
  builder needs a type exported from it (`ShareWorkoutInput` already is);
  no behaviour change to the text.

**Migrations**: none planned (reserved range `2026101816xxxx` if a later
change needs one). **API**: none. **Native rebuild**: yes (view-shot,
sharing); until then the image action is hidden and the text share works.

## Parallel delivery

- One branch per workstream off the Phase A tree, e.g.
  `feat/sdd-0034b1`, `feat/sdd-0034b2`, `feat/sdd-0034b3`, merged into the
  task branch in any order.
- **Exclusive files**: listed per workstream above. No file is owned by two
  workstreams.
- **Shared files** and their rule:

  | File | B1 | B2 | B3 | Rule |
  |---|---|---|---|---|
  | `i18n/locales/en.ts`, `es.ts` | end of `workouts` | end of `progress` | inside/after `workouts.share`, inside `progress.records` | additions only, at the named spot |
  | `apps/mobile/package.json`, `pnpm-lock.yaml` | — | svg | view-shot, sharing | one commit each; lockfile conflicts resolved by `pnpm install` |
  | `ui/tokens.ts` | `figureLarge` | — | — | B1 only |
  | `ui/contrast.test.ts` | own `describe` | — | — | B1 only |
  | `docs/sdd/specs/0034-visual-polish/tasks.md` | B1 rows + B1 log | B2 rows + B2 log | B3 rows + B3 log | tick only own rows; append to own log subsection |
  | `plan-b.md` *As built* | B1 bullets | B2 bullets | B3 bullets | own subsection |

- Every workstream runs `pnpm -r typecheck`, `pnpm -r test` (includes the
  strict style-scale and contrast checks) and
  `pnpm --filter @workout/mobile exec expo export --platform web` before its
  last commit, and again after merging if another workstream landed first.

## Testing strategy

| Spec AC / EF | Verified by |
|---|---|
| AC-12 set row | `setStatus` tests; code review of sizes (inputs on `typeScale.figureLarge`, line 2 on `caption`); web screenshot at 375 pt with "102.5 × 8", an L/R + weight row and a time row; hit areas measured on the device — [DEVICE] |
| AC-13 one status | `setStatus` priority tests; web screenshot of a workout with a done record set, an up-next set and an undone generated warm-up |
| AC-14 sticky header | `stickyHeaderModel` tests (A/B superset, round 2, A2 done → round 2, B2; all done → null); scroll + tap in the web export; iPhone — [DEVICE] |
| AC-15 chart | `linePath` / `chartData` tests (8 points, 2 records, nearest index of the 5th, labels); API `aggregate.test.ts` for `isRecord`; web export: line, area, orange points, tap readout; VoiceOver and TalkBack swipe — [DEVICE] |
| AC-16 one point / gaps | `chartData` tests (one point centred, no path; 1RM gaps skipped; zero volume skipped) |
| AC-17 summary | `workoutComparison` tests; web export with a mock API (two workouts of one routine, records today; then a first workout) |
| AC-18 share card | `shareCard` tests; web: image action hidden, text share works (EF-6); iPhone and Android: share the image to another app in Spanish with lb — [DEVICE] |
| EF-5 | `useWorkoutComparison` returns null on a rejected list; web export with the list endpoint failing |
| EF-6 | `captureAndShare` failure path → one line, text still offered (web export forces the unavailable path) |
| EF-7 | `chartData` / `linePath` tests (monotone: no value below the minimum) |
| EF-8 | Web export at 200 % browser zoom as a proxy; largest accessibility size on an SE-width iPhone — [DEVICE] |
| NFR performance | `linePath` 100-point test; ticking and scrolling a 10-exercise workout on the phone — [DEVICE] |

## Files to touch (all workstreams)

B1, B2 and B3 lists above, plus:

- `docs/sdd/specs/0034-visual-polish/{plan,plan-b,tasks}.md` — plan, tasks,
  progress logs, *As built*.
- `docs/sdd/specs/0034-visual-polish/spec.md` — status `done` at the end
  (after the device checks).
- `docs/sdd/backlog.md` — 0034 status.
- `docs/sdd/constitution.md` — Article 9's example ("line charts were
  deferred rather than pull in `react-native-svg`") gets an amendment-log
  line once B2 ships, since that deferral is now reversed by this spec.

## Risks and open questions

- **Figure fit (B1).** The 30 pt Figure large is an estimate from glyph
  widths, not a measurement. Checked first thing in B1 on the web export at
  375 pt; fallback 28/34 (one token). Compact rows with long values may
  scroll inside their field — accepted for the rare five-character
  dumbbell weight; recorded in *As built* if seen.
- **Up next definition (B1).** Using `currentSetToDo` (anchored on the last
  tick) instead of a literal "first undone set in order" is an
  interpretation of FR-20; reversible in one call site, but the rest bar and
  watch would then disagree with the row.
- **Sticky header overlap (B1).** The compact header covers the top ~56 pt
  of the list while shown; `scrollToSet` already places the target at a
  third of the viewport, below it. `RecordNotice` moves below the header.
  The keyboard (`automaticallyAdjustKeyboardInsets`) is unaffected.
- **Old binaries.** svg (B2) and view-shot / sharing (B3) are guarded:
  bars fallback and a hidden image action. On React Native 0.88 (New
  Architecture, bridgeless) `UIManager.hasViewManagerConfig` goes through the
  interop layer; B2.3 must confirm on the web export *and* in the unit of its
  guard that it answers `false` for an unknown component name rather than
  throwing. If the view-manager check proves
  unreliable on one platform, the fallback is to ship B2/B3 only with the
  rebuild — noted in the progress log, not hidden.
- **react-native-view-shot on web.** Not supported reliably; the image action
  is simply not offered on web (EF-6 "told in one line" applies to a
  failure, not to an absent option). **[ASSUMPTION]**
- **Accessibility of SVG.** RN-SVG elements are not reliable accessibility
  nodes; the transparent per-point columns are the accessible elements.
  Whether VoiceOver and TalkBack order them left-to-right is a [DEVICE]
  check.
- **Style check vs SVG props.** The scanner flags numeric literals on
  spacing/radius/font keys and any colour literal. SVG `strokeWidth`, `r`,
  `stopOpacity` are not scanned keys; colours come from `colors.*`. If the
  scanner flags something legitimate in SVG, the fix is in the scanner's
  key list with a test, not a baseline.
- **History payload (B3).** `GET /workouts` returns the full history; fine
  today (the History tab loads it). `TODO(sdd): if history grows past a few
  hundred workouts, add a bounded comparison endpoint — unblocked by a
  measured payload size on the owner's account.`
- **Two points on one date (B2).** An exercise logged twice in one workout
  gives two points; both are flagged as records when the workout beat one.
  Pre-existing shape, unchanged.

## Rollout

- **B1** is JS-only: ships with any app update.
- **B2** needs the API deployed for orange points (any order — the field is
  optional both ways) and a native rebuild for the line chart (bars until
  then).
- **B3** is app-only; the image card needs the native rebuild (text share
  until then).
- Owner step after merge: `pnpm install`, `expo prebuild`, device build (new
  native modules: `react-native-svg`, `react-native-view-shot`,
  `expo-sharing`), API redeploy for `isRecord`. No migration.
- Rollback: revert a workstream's commits; none depends on another.

## As built (Phase B)

Filled in by each workstream as it lands (own subsection).

### B1

- **Figure large is 28/34, not 30/36.** Measured on the web export at
  375 pt: a two-column row leaves each value 78 pt; "102.5" needs 81 pt at
  30 pt and 75 pt at 28 pt. The clock, the Settings rest stepper and the
  measurement "latest" figure follow; the clock now shares its size with the
  set values (still the largest figure in its card).
- **Compact rows** (L/R + weight, weight + time, distance + time) keep Figure
  large, with a 4 pt gap between inputs instead of 8 (each input has its own
  edge). Measured fits at 375 pt: "1:30" / "7:45" in the time column, two
  digits of reps per side. Does **not** fit, and scrolls inside its field:
  a 4–5 character weight beside L/R ("32.5", "102.5" in 51 pt), "102.5"
  beside a time (64 pt), a 4-digit distance (64 pt), and "102.5" in a
  superset-indented two-column row (60 pt). The pre-B1 row already clipped
  "102.5" at 20 pt (47 pt column). `TODO(sdd): decide whether compact and
  indented rows may drop to Figure (20 pt) for values wider than their
  column — needs an owner call on FR-19 ("in Figure large") for those rows,
  informed by the device check (B1.6).`
- **Row geometry**: marker 32 × 32 (`hitSlop` 6 → 44 × 44) in a 44 pt slot;
  inputs 44 pt tall with no inner padding; status area 44 × 44; remove
  32 × 44 with `hitSlop` `{ left: 4, right: 8 }` → 44 × 44; timer 32
  (`hitSlop` 6 → 44). The row has a hairline `border` outline; line 2 sits
  under the inputs (marker on the left of both lines), Caption, unclamped.
  `layout.setMarker` (36) is unchanged: it is the superset indent and the
  round-tag slot, not the marker any more.
- **Status area**: `SetStatusArea` owns the done fade (`useDoneTransition`,
  moved from the row; the row's tint uses it too) and the record pop
  (`usePop`, extracted from `RecordBadge` — the badge's behaviour is
  unchanged, the hook also replays when `pop` turns true again). An untick
  of a record set fades out the orange fill, not a green one. The
  accessibility label of a record reads "Done, record: Heaviest weight, …"
  (every record beaten).
- **Line 2** uses `previousSetLabel`, now spaced ("100 × 8", "500m · 1:45");
  the record part is `recordBadgeLabel` in `accent`, bold.
- **Sticky header**: threshold = the header card's bottom in the list
  (`onLayout` y + height + the list's top padding); `onScroll` at 16 ms
  flips one boolean only on crossing. Clock and round chip stack on the
  left; the up-next button (≥ 44 pt, chevron) holds the exercise name on one
  line and "Up next · 2B · Set 2 · 60 kg × 8" (non-breaking inside the
  target, so a wrap never splits "60 kg"). Hidden, it is `pointerEvents`
  none and out of the accessibility tree. `RecordNotice` takes a `top` prop
  (header height + 12 while the header shows).
- i18n: `workouts.setStatus` (`last`, five state labels) and
  `workouts.stickyHeader` (`upNext`, `set`, `warmup`, `allDone`,
  `scrollHint`), en and es, at the end of `workouts`. `workouts.colPrev` is
  unused now and left in place.

### B2

### B3
