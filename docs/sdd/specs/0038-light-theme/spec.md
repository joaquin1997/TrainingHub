---
id: 0038
title: Light theme
status: done
roadmap: docs/roadmap/08-integrations-and-platform.md#settings — "Theme (the app is dark-only today)"
created: 2026-10-18
decided: 2026-10-18
---

# Light theme

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

The app has one look, dark, and imposes it: someone who keeps their phone in
light mode, or who trains in a sunlit gym where a dark screen is hard to read,
gets a dark app anyway, and its system keyboard and sheets are dark too. There
is no way to choose. Spec 0034 made every colour a named token precisely so a
second palette would be cheap, and left the light theme as this follow-up.

## Why now

The owner asked for the follow-up specs on 2026-10-18: *"Créame los specs"*.
It is the open sub-point "Theme (the app is dark-only today)" of roadmap
area 8's settings, and 0034 Phase A's closed palette and contrast test are the
groundwork it was waiting for. Every new screen written dark-only adds to the
cost of doing it later.

## Today

Verified against the code on 2026-10-18.

- **One palette.** All app colours are named tokens in one place (0034
  FR-12): four surfaces, the four accents with a soft tint each, three text
  greys, two borders, a control edge, an overlay, and a white backdrop for
  exercise images. An automated check fails on any colour literal written
  outside that place, and requires every text field to state its keyboard
  appearance.
- **Colours are fixed at start-up.** Screens take the palette once, when the
  app starts; about 57 screens and components build their look from it that
  way. Nothing can change a colour while the app runs.
- **Dark is declared everywhere.** The app tells iOS, Android and the system
  as a whole that its appearance is dark, so system sheets, alerts and pickers
  are always dark; the status bar is forced to light content; all 24 text
  fields ask for the dark keyboard by a fixed value; the navigation headers,
  tab bar and screen backgrounds use the dark surfaces; the start-up spinner
  shown before fonts load is drawn on the dark background.
- **Brand assets are dark.** The icon, the Android adaptive icon background
  and the splash are the lime mark on the dark background; the splash's
  "dark mode" variant is the same image.
- **Contrast is tested for dark only.** One automated test checks every text
  colour against every surface and tint (≥ 4.5:1), the lime and green fills
  against the text on them, control edges (≥ 3:1) and the set status area
  (0034 FR-19). It knows one palette.
- **The accents would fail on a light surface as they are.** Against white:
  lime 1.18:1, green 1.64:1, orange 2.35:1, red 2.78:1, muted grey 2.19:1,
  subtle grey 2.82:1 — all under 4.5:1 for text and most under 3:1 for edges.
  Dark text on the lime fill is 15.8:1, and stays that way on any background.
- **Charts** (0034 FR-22) draw the line, its area and the points in lime,
  record points in orange with a ring in the card colour, and gridlines in the
  strong border — all from the palette.
- **Exercise images** are line drawings on white; they sit on a white tile
  (a token of its own) in lists and the exercise detail.
- **Share card** (0034 FR-25) is drawn from the same palette as the screens,
  so as built it would change with a theme.
- **Live workout status** (0012): the lock-screen and Dynamic Island views
  have their own copy of five palette colours, a fixed dark background and
  white text. They do not follow the system appearance.
- **Watch** (0025): its own copy of four palette colours on the system's
  (always dark) watch background.
- **Settings** (0008) are unit, default rest and language, kept on the
  account on the server. The app keeps no copy on the device: until they load
  it uses defaults (language falls back to the device locale); when they fail
  to load the defaults stay; a change is shown at once and reverted by
  reloading if saving fails.

## Users and scenarios

- **Phone in light mode.** Someone keeps every app light and wants TrainingHub
  to match without doing anything.
- **Bright gym.** Someone whose phone is dark at night finds the dark screen
  hard to read under strong light by day and picks Light for this app only.
- **Dark by habit.** The owner trains with the dark look and wants it kept
  whatever the phone is set to.
- **Automatic switch.** Someone's phone switches to dark at sunset while the
  active workout is open; with System chosen, the app follows at once without
  losing a typed weight or the running rest.
- **Second device.** Someone chose Light on their phone and signs in on the
  web; it opens Light there too.
- **Sharing.** Someone on the light theme shares a workout card; it looks the
  same as a friend's dark-theme card.

## Scope

### In scope

1. A **Light theme** alongside today's Dark one: every colour token gets a
   light value.
2. An **Appearance** setting with three choices — System, Light, Dark —
   kept on the account like the other settings, and remembered on the device
   for start-up.
3. Contrast in both themes to the same rules as 0034 FR-16, with an
   **ink shade** for each accent where its fill is too light for text, icons,
   outlines and chart lines on light surfaces.
4. Accent meanings (0017 FR-1) — lime, record orange, done green, danger red —
   and the charts kept in both themes.
5. System surfaces follow the chosen theme: status bar, keyboard, system
   sheets, alerts and pickers, navigation header and tab bar.
6. Instant switching, without restart or lost state; no frame of the app's
   own screens in the wrong theme at launch.
7. The share card keeps one fixed look in every theme.
8. The live workout status follows the system appearance; the watch is
   checked to still read correctly.
9. The closed-palette check and the contrast test cover both themes.

### Out of scope

- **More themes** (high contrast, true-black/OLED, custom accent colours,
  per-screen themes) — two themes only; the closed palette leaves room for a
  third later.
- **Scheduled switching inside the app** (light by day, dark by night) —
  System already covers it via the device's own schedule.
- **Icon variants** (light, dark, tinted home-screen icons) and **alternate
  app icons** — the icon is a brand mark and stays as 0034 FR-1 made it.
- **A light splash** — see Assumptions; the splash stays the dark brand
  screen.
- **Changing the palette's hues or the dark theme's values** — dark stays as
  0034 left it, except where a light-theme need forces a token split (e.g.
  ink shade), in which case dark's value for the new token equals its current
  one.
- **Restyling the watch app** — watches have one (dark) appearance; it is
  only checked, not redesigned.
- **Theming content that is not the app's** — profile photos, exercise images
  themselves, web browser chrome.
- **Live sync of the setting between devices** — another device picks the
  change up when its settings next load, as for unit and language today.
- **Making the theme part of the active workout's frozen state** — unlike the
  display unit (Article 4), the theme is pure presentation and may change
  mid-workout.

## Functional requirements

### Setting

- **FR-1.** Settings MUST offer **Appearance** with exactly three choices:
  *System* (follow the device's light/dark appearance), *Light*, *Dark*, in
  both languages, showing the current choice.
- **FR-2.** The choice MUST be kept on the account, like unit, rest and
  language (0008: preferences belong to the account), so it applies on every
  device the person signs in on.
- **FR-3.** The device MUST also remember the **last theme choice it applied**
  (per device, not per account), used only to draw the app before the
  account's settings have loaded (EF-1) and on signed-out screens (EF-4).
- **FR-4.** The default, for new accounts and for existing accounts that
  never chose, MUST be *System*.

### Two themes

- **FR-5.** Every colour token MUST have a value in both themes; no screen,
  component or system surface the app styles MAY have a colour that exists in
  one theme only or is written outside the palette.
- **FR-6.** The Light theme MUST keep the structure of the dark one: a page
  background, cards distinguishable from it, raised fields distinguishable
  from cards, the same text hierarchy (text, muted, subtle — subtle dimmer
  than muted), the soft tints for done, record, lime and danger, borders, the
  control edge and the overlay behind sheets.
- **FR-7.** Accent meanings MUST be the same in both themes (0017 FR-1): lime
  primary action / selected / mark, orange record or failure set, green done,
  red destructive or error. No new accent is introduced.
- **FR-8.** Each accent MUST have a **fill** shade (a filled button, chip,
  status-area fill) and an **ink shade** (text, icon, outline, chart line or
  point, selected marker). In the Dark theme the two are the same colour as
  today. In the Light theme:
  - the **lime fill stays the brand lime**, with the dark on-lime text on it,
    so the primary action looks the same in both themes;
  - **lime ink** is a darker lime of the same hue, used wherever lime is text,
    an icon, an outline, the up-next mark, the active tab or a chart line;
  - orange, green and red each get a light-theme value (fill and ink may be
    one colour where that colour meets both rules).
- **FR-9.** Where the brand lime fill sits on a light surface, the control
  MUST still be identifiable without the fill's edge: by its label, or by an
  edge in lime ink where the control has no label (FR-10).

### Contrast (both themes)

- **FR-10.** In each theme, every text colour MUST reach 4.5:1 against every
  surface and tint it is drawn on (3:1 for large text), including
  placeholders, captions, ink shades and text on fills; meaningful control
  edges (undone done box, unlabelled lime or accent outlines, up-next and
  warm-up outlines) and chart marks (line, record and ordinary points) MUST
  reach 3:1 against their surface — the rules of 0034 FR-16 and FR-19 applied
  to each theme.
- **FR-11.** Status MUST NOT rely on colour alone in either theme (0034
  FR-17 unchanged).

### Where colour meets the system and content

- **FR-12.** The status bar, keyboard, system-drawn sheets, alerts, pickers
  and menus, the navigation header and the tab bar MUST follow the app's
  current theme (light content on Dark, dark content on Light), whatever the
  device's own appearance. This replaces 0034 FR-3's "always dark".
- **FR-13.** Exercise images MUST keep their white tile in both themes; on the
  Light theme the tile MUST be set apart from a white or near-white surface by
  a visible edge.
- **FR-14.** Charts (0034 FR-22, FR-23) MUST be drawn in both themes with the
  lime ink line, a soft area, orange record points and readable values and
  gridlines; the tap-to-read value and its box follow the theme.
- **FR-15.** The **share card** MUST have one fixed look — the dark brand look
  of 0034 FR-25 — regardless of the theme in use, both in the preview and in
  the shared image.
- **FR-16.** The **live workout status** on the lock screen MUST follow the
  device's system appearance (light lock-screen presentation on a light
  system, dark on a dark one), not the in-app choice, meeting the FR-10
  contrast rules in each. Where the system always draws it dark (the Dynamic
  Island), it stays as today.
- **FR-17.** The **watch** app MUST stay as it is (watches have one dark
  appearance); its colours MUST still meet FR-10 against its background.
- **FR-18.** The icon and splash MUST stay the dark brand assets of 0034 FR-1
  and FR-2 in both themes.

### Switching and launch

- **FR-19.** Changing Appearance MUST re-colour the whole app at once — every
  visible screen, the screens behind it in navigation, open sheets, the
  workout bar, the tab bar, the status bar and the keyboard on its next
  appearance — without a restart and without losing state (typed values,
  scroll position, a running rest timer, an open sheet).
- **FR-20.** With *System* chosen, a change of the device's appearance while
  the app is open (by hand or on the device's schedule) MUST be followed at
  once, with the same guarantees as FR-19.
- **FR-21.** At launch, the first screen the app draws itself (including the
  start-up spinner) MUST be in the theme it will settle on, using the device's
  remembered choice (FR-3); no frame of an app screen MAY appear in the other
  theme. The hand-over from the dark splash to a light first screen is a
  single change, not a flash.
- **FR-22.** Switching theme MUST NOT animate colours across the screen; it is
  a single change (also under Reduce Motion).

## Behaviour when things go wrong

- **EF-1.** When the app starts and the account's settings have not loaded
  yet, it MUST draw in the device's remembered choice; with nothing
  remembered (first launch, reinstall), in *System*. When the settings arrive
  with a different choice, the app switches once (FR-19) and remembers the new
  choice.
- **EF-2.** When the account's settings cannot be loaded (offline, server
  error), the app MUST keep the remembered choice and show no error for it;
  the other settings keep 0008's behaviour.
- **EF-3.** When saving a new choice fails, the choice MUST still apply at
  once and be remembered on the device; the account's value then behaves as
  the other settings do when a save fails (0008: shown at once, reverted to
  the account's value when the reload succeeds). A revert is a single switch
  (FR-22).
- **EF-4.** When nobody is signed in (sign-in screen, after sign-out), the app
  MUST use the device's remembered choice, else *System*. Signing out MUST
  NOT reset the remembered choice.
- **EF-5.** When a different account signs in on the device, its own choice
  MUST apply once its settings load, replacing the remembered one.
- **EF-6.** When the device cannot report its appearance (some browsers,
  older systems), *System* MUST mean *Dark*, today's look.
- **EF-7.** When the account's saved settings carry no appearance (never
  chosen, or a server that does not know the setting yet), the app MUST treat
  it as *System* and MUST NOT show an error; the choice made on the device
  still applies there (EF-3).
- **EF-8.** When the theme changes during the active workout (FR-20 or by
  hand), the workout MUST continue unchanged: no typed value, done tick,
  record badge, rest or pause is lost or restarted.
- **EF-9.** When the share card cannot be drawn, 0034 EF-6 applies unchanged
  in both themes.

## Domain impact

Touches **Settings** only: a fourth preference, **Appearance** (System /
Light / Dark), presentation-only like the display unit, kept on the account.
No training concept is read or changed. The device keeps a last-applied copy
for start-up — device presentation state, not a setting of its own.

New glossary terms: **Theme**, **Appearance**, **Ink shade** (Presentation).

## Acceptance criteria

- **AC-1.** Given the palette, when the automated contrast test runs, then it
  checks **both** themes with the same pairs — every text colour (text, muted,
  subtle, each accent's ink, text on fills) on every surface and tint (≥ 4.5:1),
  control edges and status-area outlines (≥ 3:1), chart line and points on the
  card (≥ 3:1), on-lime text on the lime fill — and passes; it fails if any
  pair drops under its threshold in either theme.
- **AC-2.** Given the palette, when the automated checks run, then they fail
  if a token has a value in one theme and not the other.
- **AC-3.** Given the repository's automated checks, when they run, then they
  fail on any colour value written outside the palette (0034 AC-5), **and**
  on any status bar style or keyboard appearance written as a fixed value
  instead of from the current theme; they pass on the delivered code (today's
  24 fixed dark keyboards and the forced light status bar are 0).
- **AC-4.** Given a new account, when Settings opens, then Appearance shows
  *System*; given a device in light mode, the app is light; in dark mode, dark.
- **AC-5.** Given the active workout with a weight typed but not ticked and a
  rest running, when Appearance is changed to Light in Settings and the person
  returns, then every screen (including the workout, the workout bar, the tab
  bar and the header) is light, the typed weight and the rest are intact, and
  the app was not restarted.
- **AC-6.** Given *System* and the app open on the active workout, when the
  device switches from light to dark, then the app becomes dark at once with
  nothing lost.
- **AC-7.** Given *Light* chosen on a phone whose system is dark, when a text
  field is focused, an alert is shown and a system sheet opens, then the
  keyboard, alert and sheet are light and the status bar shows dark content;
  with *Dark* on a light system, all are dark.
- **AC-8.** Given *Light* chosen and the app then started cold with no
  connection, when the launch is recorded and viewed frame by frame, then the
  dark splash is followed directly by light app screens — no app-drawn frame
  is dark.
- **AC-9.** Given *Light* chosen on device A, when the same account signs in on
  device B (fresh install, system dark), then B starts in *System* (dark)
  until settings load and then switches once to Light; on its next cold start
  it opens light directly.
- **AC-10.** Given the share card for the same workout produced on the Light
  and on the Dark theme, when the two images are compared, then they are
  identical.
- **AC-11.** Given an exercise progress chart with records, when it is shown in
  each theme, then the line is lime (ink shade on Light), record points are
  orange, and a tapped value is readable; the AC-1 test covers its colours.
- **AC-12.** Given an exercise with an image in the Light theme, when its list
  row and detail are shown, then the white image tile is visibly set apart
  from the surface around it.
- **AC-13.** Given an active workout on an iPhone, when the lock screen is
  viewed with the system in light and then in dark appearance, then the live
  workout status is light and then dark, readable in both (its colours meet
  FR-10, checked against its own values for each appearance); the Dynamic
  Island and the watch look as today.
- **AC-14.** Given the primary action in the Light theme, when it is viewed,
  then it is the same brand-lime fill with dark text as in the Dark theme;
  lime used as text, outline, up-next mark or active tab is the darker lime ink.
- **AC-15.** Given the account's settings fail to load at start-up, when the
  app opens, then it uses the remembered choice and shows no theme error; given
  a server without the appearance setting, the app works with *System* and
  shows no error.
- **AC-16.** Given the web build in a browser set to light, when the app opens
  with *System*, then it is light; given a browser that does not report an
  appearance, it is dark.

## Non-functional requirements

- **Platform reach.** iOS, Android and web for the app; the lock-screen status
  is iOS only (0012); the watch is checked only.
- **Native build.** Changing how the app declares its appearance to the
  system, the system sheets and the lock-screen status need a new native
  build; they ride the owner's next rebuild. On an older binary the in-app
  theme MUST still work, with system surfaces as they are today.
- **Performance.** Switching theme on the active workout with 10 exercises
  takes effect within a fraction of a second, with no visible partial state;
  typing and ticking stay as responsive as today in both themes.
- **Delivery.** Making colours switchable at runtime (dark only, nothing
  visible changes) can ship before the light values; the setting ships with
  or after the light palette, never before it.

## Assumptions

Self-approved under the owner's delegation of the gates (2026-10-16, renewed
2026-10-18 "Créame los specs"); each is reversible.

- **[ASSUMPTION: the default is *System* for everyone, existing accounts
  included.]** It matches what people expect from a phone app; the owner,
  who trains dark, either keeps the phone dark or picks *Dark* once and it
  follows the account. Reversible: existing accounts could default to *Dark*.
- **[ASSUMPTION: the setting lives on the account, with a device copy used
  only before it loads.]** Follows 0008 ("preferences belong to the
  account"); the device copy exists only to avoid a wrong-theme launch.
- **[ASSUMPTION: on Light, the lime *fill* stays the brand lime and a darker
  lime *ink* is used for text, icons, outlines and chart lines.]** Keeps the
  primary action recognisable across themes; a single darker lime for
  everything would dull the brand. Same split for the other accents only
  where one colour cannot meet both rules.
- **[ASSUMPTION: the share card is always the dark brand look.]** It is a
  brand image seen in other apps and by other people; one look is
  recognisable and is tested once.
- **[ASSUMPTION: the splash and icon stay dark.]** The splash is drawn by the
  system before the app knows the choice, and the lime mark on a light
  background fails contrast; one dark-to-light change at launch is accepted
  (FR-21).
- **[ASSUMPTION: the live workout status follows the system appearance, not
  the in-app choice]**, as asked; the lock screen is the system's surface.
  The watch stays dark because watches have no light appearance.
- **[ASSUMPTION: the theme may change mid-workout]** — unlike the display
  unit it cannot reinterpret data, so there is nothing to freeze.
- **[ASSUMPTION: theme switch is instant, with no cross-fade]** — simpler,
  and a fade over a whole screen adds nothing a gym user needs.
- **[ASSUMPTION: when the device cannot report its appearance, *System*
  means *Dark*]** — today's look, so nobody's app changes unexpectedly.

## Open decisions

None blocking. Product calls the owner may want to override, recorded above
as assumptions: the default (*System* vs *Dark* for existing accounts), the
share card's fixed dark look, the dark splash on a light theme, and the exact
light palette (to be proposed in the plan and checked on a device).

## Related

- Builds on: 0034 (closed palette, contrast test, closed-scale check; its FR-3
  "system surfaces always dark" is replaced by FR-12 here), 0017 (accent
  meanings FR-1), 0008 (settings on the account). Touches the presentation of
  0012 (lock-screen status), 0025 (watch, checked only), 0026 (exercise
  images), 0034 FR-22 / FR-25 (charts, share card).
- Roadmap: `docs/roadmap/08-integrations-and-platform.md` — "Theme (the app is
  dark-only today)".
- Constitution articles engaged: 1 (two themes only, no restyle beyond tokens),
  3 (the new setting is a shared contract), 6 (system appearance and
  lock-screen surfaces reached behind the existing boundaries), 8 (runtime
  colours, light palette, setting as separate commits), 9 (no dependency
  expected; any must be justified, native ones need a rebuild).
