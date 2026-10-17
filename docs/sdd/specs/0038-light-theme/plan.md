---
spec: 0038
status: approved     # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Plan — Light theme

## Current state (verified in the code, 2026-10-18)

- `ui/tokens.ts` holds one `colors` object (21 tokens); `ui/theme.ts`
  re-exports it with `commonStyles` and `screenHeader`. 71 files under `src/`
  read colours or build `StyleSheet.create` styles **at module load**, so
  nothing can change colour while the app runs.
- `app.json` declares `userInterfaceStyle: "dark"` (app, iOS, Android); the
  root layout forces `<StatusBar style="light" />`; 24 `TextInput`s pass
  `keyboardAppearance="dark"`; `styleScale` requires the prop.
- Accents are used both as fills (`backgroundColor: colors.success` behind a
  dark check) and as ink (text, icons, outlines, chart lines) — one value
  cannot serve both on a light surface.
- `ShareCard` draws from the palette; the Live Activity has its own dark
  copies of five colours; the watch has four.
- Settings: unit, rest, language on `User` (API `GET/PUT /settings`).

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 | yes | Two themes, one setting; no restyle beyond tokens. |
| 3 | yes | `Appearance` type and optional `UserSettings.appearance` in `packages/domain`. |
| 5 | yes | Migration `20261018170000_add_user_appearance` (nullable text; null = system). |
| 6 | yes | System appearance read through React Native's `Appearance` / `useColorScheme`; the lock-screen status adapts inside the widget. |
| 8 | yes | Runtime colours (dark only, nothing visible) → light palette → setting, as separate commits. |
| 9 | yes | No new dependency (`expo-system-ui`, `expo-status-bar` already installed). |

## Design

### Runtime colours without remounting (FR-19)

- `tokens.ts`: `palettes = { dark, light }` (same keys, typed by
  `Palette`), plus four **ink** tokens `primaryInk`, `accentInk`,
  `successInk`, `dangerInk` (FR-8; on dark they equal today's values).
- `theme.ts`: an active theme name set by the provider before its subtree
  renders; `colors` is a read-through proxy of the active palette;
  `createStyles(() => ({ … }))` replaces `StyleSheet.create({ … })` and
  resolves (and caches) the styles of the active theme on each read, so call
  sites (`styles.card`, `colors.text`) stay as they are; `commonStyles`,
  `screenHeader` are built the same way.
- **Re-render**: every component in a file that reads the theme calls
  `useTheme()` (a context read) at its top, so a theme change re-renders it in
  place — state, scroll and open sheets are kept. Done by a codemod over the
  TypeScript AST (`scripts/theme-codemod.mjs`, kept for reference): rewrites
  `StyleSheet.create`, inserts the hook into capitalised function components,
  fixes imports, and lists module-level colour reads for hand fixes (tone
  maps in `Chip`, `Button`, …).
- **Ink vs fill**: a pass maps every foreground use of an accent (`color`,
  `borderColor`, icon `color=`, tab tint, chart line/points) to its ink token;
  `backgroundColor`/fills keep the fill token. Reviewed by hand.

### Light palette (FR-6 – FR-10)

Page `#F3F5F1`, card `#FFFFFF`, raised `#E9EDE6`, muted `#EEF1EB`; text
`#12171D`, muted `#47505C`, subtle `#5C6774`; borders `#D6DBD2`/`#BCC4B9`,
control edge `#7A8592`; lime fill `#C8FF2E` with on-lime `#10140D`, lime ink
`#3F6300`; orange fill `#FF9F57` / ink `#A84A00`; green fill `#5FD982` / ink
`#1D7436`; red fill `#FF8080` / ink `#C02626`; soft tints at ~12–16 %;
overlay `rgba(17, 22, 28, 0.45)`; image backdrop white with a border on
light (FR-13). Values tuned until the contrast test passes for both themes.

### Contrast test (AC-1, AC-2)

`contrast.test.ts` loops over both palettes with the 0034 pairs, using ink
shades for text/outline pairs and fills for "text on fill" pairs; a test
fails if the two palettes do not have the same keys.

### Setting, launch and system surfaces

- Domain `Appearance = 'system' | 'light' | 'dark'`; `UserSettings.appearance?`;
  API stores it on `User.appearance` (null → `system`).
- `ui/ThemeProvider.tsx`: preference = account setting once loaded, else the
  device's remembered choice (AsyncStorage `appearance`, read before the first
  draw; EF-1, EF-4), else `system`; system = `useColorScheme()` (null → dark,
  EF-6). Applies `Appearance.setColorScheme` (system sheets, alerts, pickers,
  keyboard default), `SystemUI.setBackgroundColorAsync`, the status bar style;
  remembers every applied choice.
- Settings → **Appearance** (System / Light / Dark) via `update`.
- Keyboards: `keyboardAppearance={keyboardAppearance}` from `useTheme()`;
  the scale check now fails on a fixed string (AC-3).
- `app.json` `userInterfaceStyle: "automatic"`; splash and icon unchanged.
- `ShareCard` uses `palettes.dark` directly (FR-15).
- Live Activity lock screen: colours become light/dark adaptive
  (`UIColor { traits in … }`), island unchanged (FR-16). Watch unchanged.

## Risks

- A component that reads colours but is missed by the codemod keeps the old
  theme until it re-renders; the web check flips themes on every tab.
- `StyleSheet.create` caches per theme: two style objects per file at most.
