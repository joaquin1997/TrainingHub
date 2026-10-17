---
spec: 0034
status: approved     # Phase A, self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Plan — Visual polish (Phase A)

How Phase A of `spec.md` (FR-1 – FR-18, AC-1 – AC-11, EF-1 – EF-4, EF-8) gets
built. Mobile only: no domain contract, no migration, no API change.

**Phase B (FR-19 – FR-25, AC-12 – AC-18, EF-5 – EF-7) gets its own plan
later** (`plan-b.md`, or a new section here), written once Phase A has shipped
and the owner has had a chance to send screenshots or mockups (spec
assumption). Nothing below pre-commits Phase B's set-row layout, sticky
header, chart drawing or share card; Phase A only leaves them cheap — the
type scale already names *Figure large* for the set-row figures, and the
shared blocks are what Phase B composes.

## Current state (verified in the code, 2026-10-18)

- **Tokens** live in `apps/mobile/src/ui/theme.ts`: `colors` (named palette),
  `fonts` (Space Grotesk Medium / Bold), `spacing` (4–24), `radii` (8, 12, 16,
  pill), `screenHeader`, and `commonStyles` with twelve text roles (`title` 32,
  `heading` 22, `cardTitle` 18, `sectionLabel` 12, `figure` 22, `figureLarge`
  40, `figureUnit` 14, `body` 16, `meta` 14, `label` 14, `link` 15, `error`
  14). A grep over `src/` (excluding `theme.ts`) finds 155 `fontSize`
  literals across 15 values (10–40), 34 `lineHeight` literals, 24
  `borderRadius` literals (1, 2, 4, 7, 8, 14, 22, 32) and 47 non-token
  paddings/margins/gaps (0, 1, 2, 3, 4, 6, 12, 32, 36, 96). No hex/rgb colour
  is written outside `theme.ts` today.
- **Contrast.** `textSubtle` `#6E7B8E` is the placeholder colour of every
  input and the colour of captions, chevrons and counts. The done box's undone
  outline is `borderStrong` `#3D4A5C` on `surfaceRaised`.
- **Brand.** `app.json` has no `icon`, `splash`, `android.adaptiveIcon`,
  `web.favicon` or `userInterfaceStyle`; `assets/` only holds the fonts. The
  sign-in screen's mark is Ionicons `pulse`, lime, in a 64 pt rounded tile.
  The root layout shows a centred spinner on `colors.background` while fonts
  load and the session restores. `StatusBar style="light"`. No `TextInput`
  sets `keyboardAppearance`.
- **Physical feedback.** `Vibration.vibrate([0,400,200,400])` when the rest
  ends in front (`useRestTimerRunner` → `restTimerRunner.vibrate`), and the
  same pattern when a set timer ends (`useSetTimer`, spec 0021). No haptics
  module is installed.
- **Ticks** go through `ActiveWorkoutScreen.handleToggleDone`
  (`completeSetInRounds` / `toggleWorkoutSetDone`). Record badges are derived
  (`buildLiveRecordBadges`), and `recordNotice(previous, next)` already
  answers "did *this* tick earn a badge" — `useLiveRecords` exposes the notice
  with its `workoutSetId` for 2.5 s.
- **Destructive confirms** go through `lib/confirmAction` with
  `destructive: true` (discard workout, delete routine ×2, delete exercise,
  delete measurement, sign out of all sessions). "Remove set" is an
  immediate tap (no dialog); "discard and start another routine" is a
  destructive action sheet entry in `useRoutineStart`.
- **Motion.** None; no `Animated` / `LayoutAnimation` import in `src/`;
  `react-native-reanimated` is not installed. `RestBar` sets the fill's
  `width` from `useRestRemaining`, which re-renders every 250 ms but only
  changes once a second.
- **Loading / empty.** `ui/StateView` (loading spinner · empty icon 40 pt
  `textSubtle` · error) is used 41 times. Routines' empty state has "create
  routine"; History and Progress have no action; Exercises' "no matches" has
  no action.
- **Repeated patterns.** Card title lines are rebuilt per screen
  (`cardHeader` / `header` / `cardTitleRow` / `exerciseHeader` +
  `cardTitle`), list rows likewise (`row` / `rowMain` / `rowText` /
  `rowTitle`, `profileRow`, `sessionRow`, …).
- **Dynamic Type.** `allowFontScaling` is never set (defaults to true);
  `maxFontSizeMultiplier` is never set. The set row has fixed widths: marker
  36, previous 64 (48 compact), done 44, remove 20.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Phase A only: brand assets, haptics, three motions, closed scales + check, shared blocks, skeletons and empty states on four screens, contrast, Dynamic Type caps. No light theme, no sound, no haptic settings, no layout change of the set row (Phase B), no new screen behaviour beyond the empty-state actions FR-14 names. |
| 2 — Template vs performed | no | Presentation only. |
| 3 — Shared domain types | no | No contract touched; haptics/motion/skeleton are mobile-only. |
| 4 — Weight in kg | no | No weight formatting changes; screens keep `lib/weight.ts`. |
| 5 — Prisma migrations | no | None. |
| 6 — Integrations behind interfaces | yes | Haptics are reached through `src/ui/haptics.ts` (four named events), never `expo-haptics` from feature code; web and failures are a no-op inside it. |
| 7 — Secrets | no | — |
| 8 — Committable + verified | yes | Fourteen commits, each green on `pnpm -r typecheck` + `pnpm -r test`. The scale check lands with a shrinking per-file baseline so the migration commits stay small and the tree is never red; the last migration commit empties the baseline. |
| 9 — Dependencies | yes | Three Expo SDK 55 modules, all **native** (they ride the owner's next rebuild; the JS falls back safely until then): **`expo-haptics`** — the only way to reach the iOS Taptic Engine patterns (impact / notification) from JS; `Vibration` can only buzz. **`expo-splash-screen`** — keeps the native splash up until fonts and session are ready (FR-2's "no flash"), and is the SDK's config plugin for the splash image. **`expo-system-ui`** — sets the root view background to the app's dark colour (no white frame between splash and first screen) and is what makes `userInterfaceStyle: "dark"` apply on Android (prebuild warns without it). Rejected: `react-native-reanimated` (the three motions are small enough for `Animated` with the native driver), an SVG library (the icon is rasterised once at build time, not drawn at runtime). Icon/splash PNGs are generated by a committed script with the already-available headless Chromium; no new package. |
| 10 — TODOs over half-solutions | yes | Device-only checks (haptic feel, icon, splash frames, Reduce Motion, Dynamic Type) are [DEVICE] tasks; see Risks. |

## Approach

### 1. Closed scales (FR-10 – FR-12) and the check (AC-5, AC-6)

`theme.ts` gains:

- **`typeScale`** — exactly six styles, each `{ fontFamily | fontWeight,
  fontSize, lineHeight }` (+ tabular digits on figures):

  | Style | Size / line | Face | Replaces |
  |---|---|---|---|
  | `title` | 30 / 36 | display bold | 26, 28, 32 (tab roots, heroes) |
  | `heading` | 20 / 26 | display bold | 17*, 18, 20, 22 (card and section titles) |
  | `body` | 16 / 22 | system | 15, 16, 17 (prose, row titles, inputs, buttons) |
  | `caption` | 13 / 18 | system | 10, 11, 12, 13, 14 (meta, labels, column headers, chips) |
  | `figureLarge` | 40 / 46 | display bold, tabular | 40 (clock, hero figure) |
  | `figure` | 20 / 26 | display bold, tabular | 18, 22 (tiles, set-row inputs, rest clock) |

  *17 → 16 where it is body text in a sheet; the native header title 17 → body
  size in the display face.
  Mapping rule: the nearest scale size, ties upward (readability), adjusted by
  role (a figure goes to a figure style). A role may add emphasis (`fontWeight:
  '700'`, uppercase, letter spacing, colour) and may set a figure in the
  display face at a text size (e.g. the set marker digit at `body` size); it
  never sets a size or line height of its own.
  **[ASSUMPTION: Caption is 13 pt.]** The smallest text today is 10 pt; 13 is
  the most used small size and is what the gym-glance scenario needs. Column
  headers grow 10 → 13; they keep `numberOfLines={1}`.
  **[ASSUMPTION: Title is 30 pt]**, between today's 32 pt tab titles and 28
  pt hero titles, so both keep their look within 2 pt.
- **`radii`**: `sm` 8, `md` 12, `lg` 16, `pill` 999, `round` 999 (a circle;
  React Native clamps the radius to half the side). Today's 7, 14, 22, 32
  (circles) → `round`; 1, 2 (thin bars) → `pill`; 4 → `sm`.
- **`spacing`**: today's six plus `xxs` 2 and `xxxl` 32 (the two allowed
  extra steps). 1, 3 → `xxs`; 6 → `xs`; 32 → `xxxl`. Offsets that align with
  a fixed column (`marginLeft: 36` = the set marker's width) and the floating
  bar clearance (`paddingBottom: 96`) become named **layout** constants
  (`layout.setMarker`, `layout.floatingBarClearance`): they are sizes, not
  spacing steps.
- **`commonStyles`** text roles are rebuilt on the six styles (`cardTitle` =
  `heading`, `meta` = `caption`, `sectionLabel` = caption bold uppercase, …),
  so most screens change by changing nothing.

**The check** — `src/ui/styleScale.test.ts` (vitest, runs with `pnpm -r
test`): walks `src/**/*.{ts,tsx}` except tests and `ui/theme.ts`, and fails
on (a) a numeric literal other than `0` in the value of `fontSize`,
`lineHeight`, any `*Radius`, any `padding*` / `margin*`, `gap`, `rowGap`,
`columnGap`; (b) a colour literal (`#hex`, `rgb(a)(`, `hsl(a)(`, or a named
CSS colour other than `transparent`) anywhere; (c) a `<TextInput` without
`keyboardAppearance` (FR-3). It also asserts AC-6 directly: `typeScale` has
exactly six keys and `caption` is the smallest size. A pure scanner
(`styleScale.ts`) does the work so its own unit tests can feed it snippets.
During the migration the test carries a per-file **baseline** of known
violations: a file may not exceed its count and a file not listed must be
clean; each migration commit lowers or removes entries; the last one deletes
the baseline, so the delivered check is strict (AC-5's "counts are 0").

### 2. Contrast (FR-16, AC-7)

`src/ui/contrast.ts`: WCAG 2.x relative luminance, contrast ratio, and
`composite(rgba, over)` for the translucent tints. `contrast.test.ts` lists
every text-on-surface pair the app draws — `text`, `textMuted`,
`textSubtle`, accents, `onPrimary` on `background`, `surface`,
`surfaceRaised`, `surfaceMuted`, and on the done tint (`successSoft` over
`surface`), the record tint (`accentSoft` over `surface`), lime soft
(`primarySoft` over `surface`), danger soft — at ≥ 4.5:1, and the meaningful
boundaries (undone done box on `surfaceRaised` and `surface`) at ≥ 3:1.

- `textSubtle` is lightened to the darkest grey in its hue that reaches 4.5:1
  on the done tint (the binding surface — the spec's ~#8390A3 gives only
  ≈ 4.0:1 there); expected ≈ `#8E9AAD`, still visibly dimmer than
  `textMuted` `#A7B0BE`. The exact value is whatever the test pins.
- New token `controlBorder` (≈ `#6C7A8F`, ≥ 3:1 on `surfaceRaised`) for the
  undone done box's outline and check glyph, and the set row's column-header
  tick. `borderStrong` stays for decorative outlines.
- Pairs that fail and are not drawn by the app are not listed; if a listed
  accent pair fails, its tint gets the fix, never the hue (spec assumption).

### 3. Shared blocks (FR-13, AC-10) — `src/ui/`

- **`CardHeader`** — `title` (heading, wraps), optional `caption` (caption,
  muted), optional `leading` icon, optional `trailing` node (a chevron, a
  menu button, a chip); `titleSize: 'heading' | 'body'` for headers inside
  dense cards. Used for every card's title line (routines list, history,
  progress cards, routine detail exercise cards, summary / session detail
  exercise cards, active workout exercise header, records card, settings
  sections, profile cards).
- **`ListRow`** — `leading` (icon name → 40 pt tile, or any node, e.g. an
  exercise thumbnail), `title` (body bold, wraps — 0017 FR-7), `subtitle`
  (caption), `trailing` (value text, a node, or `chevron`), `onPress`; the
  whole row is the pressable with `minHeight: 44`. `variant: 'card' |
  'plain'` (its own card, or a row inside a card). Used by the exercises list,
  the exercise picker, the progress exercise list, settings / profile rows,
  measurement history and the session rows of progress detail screens.
- **`EmptyState`** — replaces `StateView kind="empty"`: a 64 pt round tile in
  `primarySoft` with the screen's own icon (56 → lime), title (heading), one
  sentence, and at most one action. `StateView` keeps `loading` and `error`
  and delegates `empty` to `EmptyState`, so every empty state is drawn by the
  one block.
- **`Skeleton`** — `SkeletonBlock` (a neutral `surfaceRaised` shape with a
  radius) and `SkeletonGroup` (one shared `Animated.Value` pulsing opacity
  0.55 ↔ 1, ~900 ms, native driver; static under Reduce Motion). Presets:
  `SkeletonCardList` (title line, meta line, chip row — routines, history),
  `SkeletonRowList` (thumb + two lines — exercises), `SkeletonProgress`
  (three tiles, a chart block, rows — progress). Shapes only, no text.

### 4. Skeletons and empty states (FR-14, FR-15, AC-8, AC-9)

The four screens replace `StateView kind="loading"` (first load only, i.e.
the existing `showLoading = isLoading && list empty`) with their skeleton;
pull-to-refresh keeps the native refresh control. Error keeps `StateView
kind="error"` with retry, and since `showLoading` is false once an error is
set, the skeleton is never left pulsing (EF-4).

| Screen | Icon | Action |
|---|---|---|
| Routines | `clipboard` | Create routine → `/routines/create` (existing) |
| History | `time` | Start from a routine → `/routines` |
| Progress | `stats-chart` | Start from a routine → `/routines` |
| Exercises, filter/search active, nothing matches | `search` / `star` | Clear filters → resets query, category, equipment, favourites |

New strings in `en.ts` / `es.ts` for the two new action labels and the
"clear filters" label.

### 5. Brand: icon, splash, dark system UI (FR-1 – FR-3, AC-1, AC-2)

- `apps/mobile/scripts/brand-assets.mjs` renders, with headless Chromium
  (Playwright from the global install, `PLAYWRIGHT_BROWSERS_PATH`), an HTML
  page that draws the Ionicons `pulse` glyph from the vendored
  `Ionicons.ttf` — the exact mark of the sign-in screen — in lime on the dark
  background, and screenshots:
  - `assets/icon.png` 1024² — mark at ~56 % on `#101418`, with the sign-in
    tile's subtle rounded panel behind it (iOS masks the corners itself);
  - `assets/adaptive-icon.png` 1024² foreground — mark inside the 66 % safe
    zone on transparent; background colour `#101418` in config;
    `assets/adaptive-icon-monochrome.png` for Android 13 themed icons;
  - `assets/splash-icon.png` 1024² — mark on transparent (the plugin sets the
    background colour);
  - `assets/favicon.png` 48².
  The PNGs are committed; the script stays for regeneration (owner may drop in
  a new logo — spec assumption).
- `app.json`: `icon`, `userInterfaceStyle: "dark"`, `backgroundColor:
  "#101418"`, `ios.userInterfaceStyle`, `android.adaptiveIcon`
  (`foregroundImage`, `monochromeImage`, `backgroundColor`), `web.favicon`,
  plugin `["expo-splash-screen", { image, imageWidth: 200, backgroundColor:
  "#101418", dark: {…same} }]`, plugin `expo-system-ui` is automatic once the
  package is installed.
- Root layout: `SplashScreen.preventAutoHideAsync()` at module load (guarded
  in try/catch for builds without the native module), `hideAsync()` once the
  first real screen renders (fonts loaded and auth/workout restored) — the
  start-up spinner stays as the fallback on web and on an old binary.
- `keyboardAppearance="dark"` on every `TextInput` (enforced by the check).
  System alerts and sheets follow `UIUserInterfaceStyle = Dark`.

### 6. Haptic language (FR-4, FR-5, EF-1, EF-3) — `src/ui/haptics.ts`

`haptics.setDone()`, `haptics.record()`, `haptics.restOver()`,
`haptics.destructiveConfirm()` — the whole language; nothing else is
exported. Patterns (distinct, iOS standard generators):

| Event | Pattern |
|---|---|
| set done | `impactAsync(Light)` |
| record | `notificationAsync(Success)` |
| rest over | `impactAsync(Heavy)` twice, 150 ms apart (a "double knock") |
| destructive confirm | `notificationAsync(Warning)` |

**[ASSUMPTION: rest over is a double heavy impact]** so that the four
patterns stay distinct; the spec asks for a "notification-type" pattern and
iOS has only three notification patterns, two of which the other events use.

Each call is fire-and-forget, a no-op on web (`Platform.OS === 'web'`) and
swallows errors (old binary without the module, devices without hardware —
EF-1). Feature code imports only `haptics`.

Wiring:

- **set done / record** — `tickFeedback(previous, next, setId)` (pure, in
  `features/workouts/liveRecords/`): `'record'` when `recordNotice(previous,
  next)` names this set, else `'setDone'` when the set became done, else
  `null`. `handleToggleDone` calls it on the phone tick only, so unticking is
  silent, a watch tick does not buzz the phone, and a record found later
  (starting records arriving late, EF-3) never buzzes — `recordNotice`
  already ignores those.
- **rest over** — `useRestTimerRunner`'s `vibrate` callback becomes
  `haptics.restOver`. The background notification of 0018 is untouched. The
  set timer's vibration (0021) stays a plain vibration — it is an alarm, not
  part of the language. **[ASSUMPTION]**
- **destructive confirm** — `confirmAction` fires it when a `destructive`
  confirmation resolves `true`; the active workout's remove-set tap and
  `useRoutineStart`'s "discard and start" sheet action fire it directly
  (there the tap *is* the confirmation). **[ASSUMPTION: remove set has no
  dialog, so its tap gets the warning.]**

### 7. Motion (FR-6 – FR-9, EF-2) — `Animated`, native driver

- `src/ui/useReducedMotion.ts` — `AccessibilityInfo.isReduceMotionEnabled()`
  plus the `reduceMotionChanged` listener (web: react-native-web reads
  `prefers-reduced-motion`).
- **Done set** — `WorkoutSetRow` draws the done tint as an absolutely
  positioned `Animated.View` (opacity 0 → 1, 220 ms) behind the row, and the
  done box's green fill the same way; the target follows `set.done`, so a
  fast tick/untick just retargets the running animation and always ends on
  the final state (EF-2). Reduce Motion: duration 0.
- **Record pop** — `RecordBadge` gets `pop?: boolean`; the screen passes
  `liveRecords.notice?.workoutSetId === set.id`. On mount with `pop`, a
  scale 0.6 → 1.08 → 1 sequence (~260 ms). Reopening the screen or scrolling
  mounts without `pop` (the notice is per-mount state and lasts 2.5 s).
  Reduce Motion: no scale.
- **Rest bar** — the fill becomes `Animated.View` with `transform: scaleX`
  and `transformOrigin: 'left'`, animated linearly from the current fraction
  to 0 over the remaining milliseconds, restarted whenever `endsAt` or
  `totalSeconds` changes (±15 s, skip). The figure keeps its once-a-second
  update. Reduce Motion: the old stepped width.

### 8. Dynamic Type (FR-18, EF-8)

Body and caption text keep scaling (default). Caps, set with
`maxFontSizeMultiplier`, only where a figure or label sits in a fixed-width
column or a single-line bar:

| Where | Cap |
|---|---|
| Set row: marker digit, previous, set inputs, column headers (36 / 64 / 44 pt columns) | 1.3 |
| Rest bar clock and its three buttons; workout bar figures | 1.3 |
| Tab bar labels | 1.2 |
| `figureLarge` (clock, hero figure) and `title` | 1.5 |

Rows that hold a name already wrap (0017 FR-7). `ListRow` and `CardHeader`
let the title wrap and keep the trailing node at its intrinsic width.
The real check is AC-11 on an iPhone SE at the largest accessibility size —
[DEVICE].

## Testing strategy

| Spec AC | Verified by |
|---|---|
| AC-1 icon | Assets present and wired (`app.json` read by a unit test: icon, adaptive icon, favicon paths exist); home screen / switcher / no prebuild warning — [DEVICE] |
| AC-2 splash | Config + `preventAutoHideAsync`/`hideAsync` wiring; frame-by-frame recording — [DEVICE] |
| AC-3 haptics | `tickFeedback` unit tests (done, record instead of done, untick none, late record none); `haptics` no-op on web; feel on iPhone — [DEVICE] |
| AC-4 motion | Code review + web export; Reduce Motion on/off on the phone — [DEVICE] |
| AC-5 closed scales | `styleScale.test.ts` strict (no baseline) + scanner unit tests |
| AC-6 six styles | `styleScale.test.ts` asserts the six keys and the smallest size |
| AC-7 contrast | `contrast.test.ts` over the palette pairs |
| AC-8 skeleton | Web export screenshots with a delayed mock API; slow network on the phone — [DEVICE] |
| AC-9 empty states | Web export screenshots with an empty mock account; actions navigate |
| AC-10 shared blocks | Search: no `cardHeader`/`rowTitle`-style local re-implementations on the listed screens; `StateView kind="empty"` delegates to `EmptyState` |
| AC-11 Dynamic Type | [DEVICE] |

## Files to touch

- `apps/mobile/src/ui/theme.ts` — scales, `controlBorder`, `textSubtle`, `layout`.
- `apps/mobile/src/ui/styleScale.ts`, `styleScale.test.ts` — the check.
- `apps/mobile/src/ui/contrast.ts`, `contrast.test.ts` — the contrast check.
- `apps/mobile/src/ui/CardHeader.tsx`, `ListRow.tsx`, `EmptyState.tsx`,
  `Skeleton.tsx`, `StateView.tsx` — shared blocks.
- `apps/mobile/src/ui/haptics.ts`, `useReducedMotion.ts`.
- Every `.tsx` with a literal listed in *Current state* (42 files) — the
  migration, in five commits by area (shared UI + shell + auth; workouts;
  routines; progress + profile; exercises + settings).
- `features/{routines,workouts,progress,exercises}/screens/*ListScreen /
  OverviewScreen / HistoryScreen` — skeletons and empty states.
- `features/workouts/components/WorkoutSetRow.tsx`, `RestBar.tsx`,
  `liveRecords/RecordBadge.tsx`, `liveRecords/tickFeedback.ts(+test)`,
  `screens/ActiveWorkoutScreen.tsx`, `restTimer/useRestTimerRunner.ts`,
  `hooks/useRoutineStart.ts`, `lib/confirmAction.ts` — haptics and motion.
- `apps/mobile/src/app/_layout.tsx`, `app/(tabs)/_layout.tsx` — splash
  hand-over, tab label cap.
- `apps/mobile/app.json`, `apps/mobile/package.json`, `pnpm-lock.yaml`,
  `apps/mobile/assets/{icon,adaptive-icon,adaptive-icon-monochrome,splash-icon,favicon}.png`,
  `apps/mobile/scripts/brand-assets.mjs`.
- `apps/mobile/src/i18n/locales/{en,es}.ts` — empty-state action strings.
- `docs/sdd/specs/0034-visual-polish/{spec,plan,tasks}.md`.

## Risks and open questions

- **Visual drift from the scale.** Collapsing 15 sizes into 6 moves some text
  by 1–4 pt (10 → 13 column headers is the largest). Mitigated by the
  nearest-size rule and by before/after web screenshots; the owner's device
  check is the judge. Retuning is one token.
- **Native modules on an old binary.** Until the rebuild, `expo-haptics`,
  `expo-splash-screen` and `expo-system-ui` are missing natively; `haptics`
  swallows the error and the splash calls are wrapped, so an OTA-style JS
  update on the old binary keeps working (no haptics, old splash).
- **Foreground double alert** (0018's TODO) is unchanged by the switch from
  `Vibration` to haptics.
- **`transformOrigin`** for the rest-bar fill needs React Native ≥ 0.73 (we
  are on 0.83) and react-native-web support; if web ignores it, the bar
  drains from the centre on web only — checked in the web export.
- **Dynamic Type** cannot be exercised in CI or on web (react-native-web does
  not apply the system font scale) — AC-11 is a [DEVICE] check.
- **Remove set's warning haptic** is an interpretation (no dialog exists);
  reversible in one line.

## Rollout

App-only. The JS parts (scales, contrast, blocks, skeletons, empty states,
motion, the haptics calls) work on the current binary; icon, splash, dark
system UI and the haptics themselves arrive with the owner's next native
rebuild (`expo prebuild` + run), which must also pick up the three new
modules. No API ordering constraint. Rollback: revert the commits; the asset
and config commit is self-contained.
