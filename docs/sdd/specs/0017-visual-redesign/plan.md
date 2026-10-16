---
spec: 0017
status: approved
created: 2026-10-16
---

# Plan — Visual redesign

How `spec.md` gets built. Mobile only: no API, schema or domain change.

## Current state (verified 2026-10-16)

- Styling is `StyleSheet.create` per screen on top of `src/ui/theme.ts`
  (`colors`, `spacing`, `radii`, `screenHeader`, `commonStyles`). The palette
  in `colors` is exactly the "Kinetic Obsidian" design system on the Stitch
  canvas — it was extracted from this file — so FR-1 needs **no colour
  change**, only consistent use.
- Shared UI is three components: `Button` (primary / secondary / danger),
  `EmptyState` (icon, title, subtitle, action) and `ActionSheet`. Loading and
  error states are ad-hoc `stateCard`s in each screen.
- No custom typeface: everything is the system font. `expo-font` is already a
  dependency (native module present in the current build).
- Headers: routines/exercises/progress tab roots get a native stack title and
  then an intro paragraph (`routines.intro`, `progress.intro`,
  `workouts.historyIntro`…); History and Settings use the tab navigator's
  header. Pushed screens use the native stack header with `screenHeader`.
- Tabs: Ionicons `barbell` / `fitness` / `stats-chart` / `time` / `settings`.
- Supersets render as a text badge "Superserie N" on each exercise
  (`RoutineDetailScreen`, `ActiveWorkoutScreen`); there is no 1 / 2A / 2B
  numbering and no rail.
- Done sets already use `colors.success` (green) in the active workout.
- The two largest screens are `ActiveWorkoutScreen` (1083 lines) and
  `RoutineFormScreen` (1116 lines); their state logic lives in
  `workoutDraftStore` and inline handlers respectively.
- The API sends no CORS headers, so the web build cannot reach it from a
  normal browser.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | Yes | Restyle only. Every out-of-scope item of the spec (new data, multi-select picker, empty workouts, social, sign-in providers) is excluded below. New shared components are limited to the ones used by 3+ screens. |
| 2 — Template vs performed | No | No model touched. The block-label helper is presentation over both, typed on a minimal `{ supersetGroup?: number }` shape — it does not merge the concepts. |
| 3 — Shared domain types | No | No contract changes. |
| 4 — Weight in kg | Yes | Every redesigned weight keeps going through `lib/weight.ts` (`formatWeight`, `fromKg`). The summary's tonnes display is replaced by `formatWeight` in kg/lb (FR-3). |
| 5 — Prisma migrations | No | — |
| 6 — Integrations behind interfaces | No | — |
| 7 — Secrets | No | — |
| 8 — Committable + verified | Yes | One task per screen (or per shared piece); each leaves the app coherent and passes `pnpm -r typecheck` + `pnpm -r test`. |
| 9 — Dependencies | Yes | **No new package.** The display typeface is two vendored font files (Space Grotesk Medium and Bold, SIL Open Font License, licence file committed next to them), loaded with the already-installed `expo-font` at runtime — no native rebuild. See alternatives. |
| 10 — TODOs over half-solutions | Yes | Visual verification on a device is the owner's [DEVICE] check; the web check depends on a test account (Risks). |

## Approach

1. **Shared style first.** Extend `theme.ts` with typography tokens
   (`fonts.display`, `fonts.displayBold`, text styles `title`, `heading`,
   `figure`, `figureLarge`, `sectionLabel` with `fontVariant: ['tabular-nums']`
   on figures), a `radii.pill`, and restyled `commonStyles` (card, input,
   chip). Load the two fonts in the root layout behind the existing start-up
   spinner; on a load error, log and continue with the system font (EF-4).
2. **A handful of small primitives**, each used by at least three screens:
   - `ScreenTitle` — the large tab-root title with an optional trailing action
     (FR-11);
   - `Chip` — the one pill style: plain, selected (lime), record (orange),
     done (green) (FR-4);
   - `StatTile` — label + figure + unit (summary, workout detail, progress,
     exercise progress, active workout header);
   - `StateView` — loading / error / empty in one look (EF-1), replacing
     `EmptyState` and the per-screen `stateCard`s;
   - `Button` gains a `ghost` (text) variant and an optional leading icon.
   No `Card` component: cards stay `commonStyles.card`, as today
   (codex-project-context: "do not grow it into a heavy component framework").
3. **Chrome.** Tab roots hide the native header and render `ScreenTitle`;
   intro paragraphs go. Pushed screens keep the native stack header (back +
   short title, FR-12) with the display face. Tab icons become one outline
   set: `clipboard`, `barbell`, `trending-up`, `time`, `options`.
4. **One pure helper** for FR-14/FR-17: `exerciseBlockLabels(exercises)` →
   for each exercise its label (`1`, `2A`, `2B`, `3`) and whether it opens,
   continues or closes a superset run. Rule: a run of **consecutive**
   exercises with the same `supersetGroup` and length ≥ 2 shares one number
   with letters; anything else gets its own number. Unit-tested.
5. **Screens, one at a time**, restyling JSX and styles in place without
   touching state logic: routines list → routine detail → active workout →
   summary → history → workout detail → routine form → picker + custom
   exercise → exercises list + detail → progress overview → exercise progress
   → settings → sign-in. Copy changes go to both `en.ts` and `es.ts`
   (the `TranslationCatalog` type keeps them in step); keys made unused are
   deleted.

### Alternatives considered

- **A styling library (NativeWind / Tamagui / Restyle)** — rejected: a new
  dependency and a rewrite of every screen's styles for a visual change the
  existing token file can carry (Article 9, codex-project-context).
- **`@expo-google-fonts/space-grotesk`** — rejected: a package to deliver two
  font files; vendoring them is the same runtime path (`expo-font`) with no
  dependency. Revisit if more weights or faces are needed.
- **No custom typeface, system font with tabular figures only** — rejected:
  the display face is most of the mockups' character, and FR-2 asks for a
  distinct style for figures. Kept as the fallback (EF-4).
- **Embedding the fonts natively via the `expo-font` config plugin** —
  rejected for now: it needs a native rebuild, runtime loading does not.
  Can be switched later to drop the start-up load.
- **Splitting the two big screens into sub-components while restyling** —
  rejected: it mixes a refactor into a restyle and makes the diff
  unreviewable. Only presentational pieces repeated within a screen may be
  extracted into a local component in the same file.
- **A `Card` / `Screen` / `Row` component layer** — rejected as premature:
  `commonStyles` already gives every screen the same card.

## Shared contracts (`packages/domain`)

None.

## Data model and migrations

None.

- Migration name: —
- Backfill / data migration needed: no

## API surface (`apps/api`)

None.

## Mobile surface (`apps/mobile`)

- Every screen and modal listed in the spec's scope is restyled.
- Root layout loads the fonts before hiding the start-up spinner.
- **Native rebuild: not required.** Fonts load at runtime through the
  existing `expo-font` module; no `app.json` change; no new permission.

## Testing strategy

Logic does not change, so the existing suites (`pnpm -r test`) are the
regression net; `pnpm -r typecheck` catches i18n keys missing in one catalog.
New unit tests: `exerciseBlockLabels`. Visual criteria can only be checked by
looking at the screens: on web during implementation where possible, and on
the device by the owner ([DEVICE]).

| Spec AC | Verified by |
|---|---|
| AC-1 colour meanings | Review of each screen's styles (only `colors.*` tokens, lime/orange/green/red per meaning) + visual check |
| AC-2 one language | `TranslationCatalog` typecheck; grep for hard-coded strings in the touched screens; visual check in both languages [DEVICE] |
| AC-3 large title | Visual check of the five tabs |
| AC-4 one primary action | Per-screen review during each task |
| AC-5 1 / 2A / 2B / 3 | `exerciseBlockLabels` unit test + visual check |
| AC-6 workout top fold | Visual check, iPhone-size viewport [DEVICE] |
| AC-7 done green / failure orange | Visual check |
| AC-8 long names wrap | Visual check with a 40-character custom exercise [DEVICE] |
| AC-9 lb everywhere, no tonnes | Grep: no `/ 1000` tonnes formatting left; visual check with lb |
| AC-10 two-digit fields | Visual check of the routine form |
| AC-11 nothing lost | Per-screen before/after inventory of actions and data, written in the task's commit message |
| AC-12 largest text size | [DEVICE] |

## Files to touch

- `apps/mobile/assets/fonts/SpaceGrotesk-Medium.ttf`, `SpaceGrotesk-Bold.ttf`,
  `OFL.txt` — new, vendored.
- `apps/mobile/src/ui/theme.ts` — typography tokens, `radii.pill`, restyled
  `commonStyles`, `screenHeader` title font.
- `apps/mobile/src/ui/Button.tsx` — `ghost` variant, optional icon.
- `apps/mobile/src/ui/ScreenTitle.tsx`, `Chip.tsx`, `StatTile.tsx`,
  `StateView.tsx` — new.
- `apps/mobile/src/ui/EmptyState.tsx` — removed once `StateView` replaces it.
- `apps/mobile/src/ui/ActionSheet.tsx` — restyle.
- `apps/mobile/src/app/_layout.tsx` — font loading.
- `apps/mobile/src/app/(tabs)/_layout.tsx` — icons, label style, no tab
  headers for History/Settings.
- `apps/mobile/src/app/(tabs)/{routines,exercises,progress}/_layout.tsx` —
  hide the native header on the index screen.
- `apps/mobile/src/features/routines/utils/exerciseBlockLabels.ts` (+ test) —
  new.
- Screens: `RoutinesListScreen`, `RoutineDetailScreen`, `RoutineFormScreen`,
  `ActiveWorkoutScreen`, `WorkoutSummaryScreen`, `WorkoutHistoryScreen`,
  `WorkoutSessionDetailScreen`, `ExercisesListScreen`, `ExerciseDetailScreen`,
  `ProgressOverviewScreen`, `ExerciseProgressDetailScreen`, `SettingsScreen`,
  `AuthLandingScreen`.
- Components: `ExercisePickerModal`, `CustomExerciseModal`, `ProgressRing`,
  `WheelPicker` (colours/typography only), `ProgressChart`,
  `MuscleDistribution`, `FrequencySummary`.
- `apps/mobile/src/i18n/locales/en.ts`, `es.ts` — copy.
- `docs/sdd/backlog.md`, this spec's status.

## Risks and open questions

- **Visual verification.** Typecheck and tests cannot see a layout. The web
  build cannot talk to the API (no CORS), so a web check needs a browser with
  web security disabled **and** an account to sign in with.
  `TODO(sdd): web check needs a test account on the dev API — create a
  throwaway one, or the owner provides one; otherwise verification falls to
  the owner's device pass.`
- **Font load failure on iOS.** An unregistered `fontFamily` raises a red box
  in development builds. Bundled local assets make a failed load unlikely; if
  it happens the app continues with the system font in release builds. The
  root layout logs the error.
- **Big-screen regressions.** Restyling `ActiveWorkoutScreen` and
  `RoutineFormScreen` touches long JSX trees around live state. Mitigation:
  style-only diffs, no handler changes, the existing store tests, and a manual
  pass through start → log → pause → rest → finish on the device.
- **Text-size scaling (AC-12)** is hard to check on web; it is a [DEVICE] item.

## Rollout

JavaScript-only: ships with the next bundle the owner runs on the device. No
API ordering, nothing to migrate, works with any server version. Rollback is
reverting the branch's commits; each screen can be reverted on its own.
