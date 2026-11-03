---
spec: 0038
status: in-progress  # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Tasks — Light theme

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec `in-progress` | docs | — | `docs(sdd): plan and tasks for 0038` |
| 2 | [x] `Appearance` setting in domain + API (migration) | domain + api | api tests | `feat(settings): appearance setting on the account` |
| 3 | [x] Runtime colours: palettes, proxy `colors`, `createStyles`, `useTheme` in every component (dark only) | mobile | typecheck; web unchanged | `refactor(ui): colours resolved at render time` |
| 4 | [x] Ink shades and the light palette; contrast test over both themes | mobile | unit tests | `feat(ui): light palette with ink shades` |
| 5 | [x] Theme provider, Appearance in Settings, remembered choice, system surfaces, keyboards, share card fixed dark, image tile edge | mobile | web light/dark | `feat(ui): light theme and appearance setting` |
| 6 | [x] Live Activity follows the system appearance | native | swiftc; **native rebuild** | `feat(live-status): light and dark lock-screen status` |
| 7 | [x] Progress log, backlog, roadmap | docs | — | `docs(sdd): record 0038 implementation` |
| 8 | [x] [DEPLOY] migration `add_user_appearance`, API redeploy | server | owner | — |
| 9 | [x] [DEVICE] AC-5 – AC-8, AC-13 on the iPhone | device | owner | — |

## Progress log

- (2026-10-18) Tasks 1–7 done; calls made by the assistant under the delegated
  gates, revisable. **API**: `User.appearance` (nullable text, migration
  `20261018170000_add_user_appearance`), `GET/PUT /settings` read and write
  `appearance` (null ↔ `system`, unknown values ignored); domain
  `Appearance` and optional `UserSettings.appearance`. **Runtime colours**:
  `tokens.ts` now has `palettes.{dark,light}`; `theme.ts` exposes `colors` as
  a read-through view of the active palette, `createStyles(() => …)` (cached
  per theme), `ThemeContext` / `useTheme()`, `keyboardAppearance()`.
  `scripts/theme-codemod.mjs` (TypeScript AST) rewrote 74 files:
  `StyleSheet.create` → `createStyles`, `useTheme()` first in every
  component of a themed file (88 components), imports; it lists colour reads
  at module level — three maps (set status looks, button label colours, chip
  tones) became functions read at render. **Ink**: `primaryInk`,
  `accentInk`, `successInk`, `dangerInk` (equal to the fills on dark); every
  foreground use of an accent moved to its ink, fills kept the fill shade,
  thin indicators on surfaces (live dot, sets progress, workout bar dot,
  latest bar, rest drain, strip dots) use ink. **Light palette**: as in the
  plan, with the light orange and green *fills* darkened to `#CC6A15` /
  `#2F9A50` so the status-area fills keep 3:1 against the done-row tint while
  the dark icon on them keeps ≥ 4.5:1 / 3:1; the contrast test now runs every
  0034 pair on both palettes (plus same keys, ink = fill on dark, brand lime
  and on-lime unchanged, chart marks ≥ 3:1). **Provider**:
  `ui/ThemeProvider.tsx` + pure `resolveTheme.ts` (tested): account choice →
  remembered device choice (AsyncStorage `appearance`) → System; System
  follows `useColorScheme()`, unknown → dark; sets the active theme before
  its subtree renders, `Appearance.setColorScheme` (cleared to `unspecified`
  with System so device changes are still seen), system UI background, the
  status bar style; draws nothing until the remembered choice is read (splash
  still up). Settings → **Appearance** (System / Light / Dark).
  `app.json` interface style `automatic`; keyboards ask
  `keyboardAppearance()`; the scale check fails on a fixed keyboard or status
  bar style. Share card pinned to `palettes.dark`; image tiles get an
  `imageEdge` border (transparent on dark). **Live Activity**: colours are
  `UIColor` light/dark providers (lock screen follows the system; the island
  resolves dark); the lime Finish fill stays fixed. Web preview with the
  browser in light mode: Routines, Progress (chart in lime ink, record in
  orange ink), Settings and the active workout drawn light; tapping Dark and
  back to Light in Settings re-coloured the screen and the tab bar at once.
  751 mobile + 379 API tests green.
