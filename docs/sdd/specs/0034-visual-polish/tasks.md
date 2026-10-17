---
spec: 0034
status: in-progress  # Phase A, self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Tasks — Visual polish (Phase A)

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
App-only: no domain contract, no migration, no API change. Three new native
modules (task 11, 12) ride the owner's next rebuild. Phase B gets its own
tasks with its own plan.

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
- [ ] Phase B planned (separate plan)
