---
id: 0017
title: Visual redesign
status: in-progress
roadmap: "-"
created: 2026-10-16
decided: 2026-10-16
---

# Visual redesign

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

The app works but looks like a prototype: every screen is a column of plain
cards, buttons and grey text with the same weight. Nothing tells the person
at a glance what matters on a screen — the clock and the next set during a
workout, the best lift on a progress screen, the one action to take. Headers
are inconsistent (some screens have a navigation title, others an intro
paragraph), figures are set in the same style as prose, and status (done,
record, failed, locked) is mostly carried by words instead of a consistent
visual language.

## Why now

The agreed order (2026-09-24) was "functional first, then pretty": specs 0010–
0014 closed the functional gaps, so the redesign is next. The owner produced a
set of mockups for it on 2026-10-16 (kept in [`reference/`](reference/)) and
asked for them to be applied to the app, fixing what the mockups got wrong.

## Users and scenarios

- **Mid-set glance.** Someone between sets, phone on the bench, wants to read
  the rest countdown, the next set and what they did last time in one look,
  and tick the set with a thumb.
- **Choosing today's workout.** Someone opens the app at the gym and wants to
  see their routines, grouped by folder, and start one with a single tap — or
  get straight back to the workout already in progress.
- **Checking progress.** Someone wants to see whether their bench press is
  going up: best lift, estimated 1RM, the trend, the records.
- **Reviewing a past session.** Someone opens last Tuesday's workout to see
  what they lifted, set by set.
- **Spanish or English.** Someone using the app in English sees no Spanish, and
  the other way round.

## Scope

### In scope

A new visual language applied to **every screen and modal the app has today**:
sign-in, routines list, routine detail, routine create/edit, exercise picker,
custom exercise, exercises list, exercise detail, active workout, workout
summary, history, workout detail, progress overview, exercise progress,
settings, and the shared empty, loading and error states.

The mockups in [`reference/`](reference/) are **inspiration, not a contract**:
the layout ideas are adopted where they fit the data the app already has; their
known defects (below) are not.

### Out of scope

Everything below appears in the mockups but needs data or behaviour the app
does not have. Each one is a feature of its own, not a restyle.

- **New data on screens** — estimated routine duration, "last done 2 days ago"
  on routine cards, weekly goal ("3 of 4 done"), calendar strip and monthly
  summary in history, per-exercise volume in the summary, cadence, RPE,
  AMRAP — each needs either new data or a new derivation with its own rules.
- **Starting an empty workout** ("Entrenamiento rápido") — workouts start from
  a routine today; free workouts are a domain change (Article 2 territory).
- **Choosing several exercises at once in the picker** — the picker selects
  one exercise per slot; multi-select with ordering is a behaviour change.
- **Template store / shared programs** — roadmap area 7 (social).
- **Sign in with Google, Apple on the sign-in screen, password reset** — Apple
  is spec 0002; the others have no spec.
- **Share, export (CSV), cloud-sync status, PRO badge, voice coaching,
  avatar/profile** — not features of the app.
- **The lock-screen live workout status** — restyled in spec 0012 already.
- **Light mode, tablet layouts, custom app icon or splash** — no demand yet.
- **Changing what any screen does** — no new navigation paths, no removed
  capability, no new settings. A control may move or change shape; it may not
  appear or disappear.

## Functional requirements

### Visual language (every screen)

- **FR-1.** The app MUST keep its current palette. Accent colours MUST carry
  one meaning each, everywhere:
  - **lime** — the primary action on a screen, the active or selected state,
    the active tab;
  - **orange** — a personal record or a failure set;
  - **green** — a completed (done) set or item;
  - **red** — destructive actions and errors.
  No other accent colour is introduced. In particular the cyan used for time
  in some mockups is **not** adopted: time is shown in the default text
  colour.
- **FR-2.** Figures — weights, reps, timers, counts, volumes — MUST be set in a
  distinct display style with fixed-width digits, so a running clock or a
  changing weight does not make the layout shift. Titles share that display
  style; body text stays in the platform's system typeface.
- **FR-3.** Every weight MUST be shown in the person's display unit, with the
  unit, as today (Article 4). No screen may show tonnes ("14.8 t").
- **FR-4.** Section labels MUST use one style (small, uppercase, spaced),
  and content MUST sit in cards that share one corner radius, border and
  padding. Chips (tags, filters, set types) share one pill style.
- **FR-5.** Every touch target MUST be at least 44×44 points; set-logging
  controls during a workout at least 48 points tall.
- **FR-6.** A screen MUST have at most one primary (lime, filled) action, and
  no action may appear twice on the same screen (e.g. "save" at the top and
  at the bottom).
- **FR-7.** The name that identifies the thing on screen — an exercise in a
  workout, routine or session; a routine on its detail; a record — MUST NOT be
  cut off: it wraps onto a second line instead. Lists of many items may
  truncate secondary text only.
- **FR-8.** All text MUST be in the person's chosen language, with no words of
  the other language mixed in, including column headers, badges and units
  that are words.
- **FR-9.** No screen may show a control, figure or badge for something the app
  does not do (see Out of scope). A placeholder for missing data is the
  existing empty/unknown wording, not invented sample data.

### Navigation chrome

- **FR-10.** The five tabs MUST stay, in today's order — Routines, Exercises,
  Progress, History, Settings — with labels in the chosen language and one
  coherent icon set; the active tab is lime.
- **FR-11.** A tab's root screen MUST show its name as a large title at the
  top of the screen, with no logo, avatar, status badge or intro paragraph
  above the content. A screen-level action that already exists (e.g. create
  routine, create custom exercise) may sit on the title row.
- **FR-12.** A screen opened from another MUST show a back control and a short
  title. Actions it already has (edit, menu) sit at the right of that bar.

### Screens

Each requirement restyles what the screen already shows; nothing is added or
removed (Out of scope, last item).

- **FR-13. Routines list.** When a workout is in progress, a prominent card at
  the top shows it (routine, running or paused clock) and resumes it on tap.
  Routines are grouped under their folder names. A routine card shows its
  name, the number of exercises, the first exercises as chips, an overflow
  menu, and one start/continue button. Creating a routine is a secondary
  action.
- **FR-14. Routine detail.** A header block shows the folder (if any), the
  routine name, its description and the exercise count. When the routine is
  the active workout's, a lock notice explains that editing and deleting are
  blocked (spec 0014) and those actions show as unavailable. Exercises are
  numbered consecutively; exercises of a superset share one number and a
  letter (2A, 2B) and are joined by a vertical rail with a superset label.
  Each exercise lists its target sets (set type, weight, reps range) and shows
  its rest as a chip. Start/continue is the primary action; edit and duplicate
  are secondary; delete is a destructive text action.
- **FR-15. Routine create / edit.** Name, description and folder sit in one
  card. Each exercise is a numbered card with reorder and remove controls, a
  rest field and a superset field, and a set table whose weight, min-reps and
  max-reps fields are wide enough to show their values in full. Adding a set
  and adding an exercise are secondary actions. Saving is the single primary
  action at the bottom, next to a summary of exercises and sets. Cancel sits in
  the top bar.
- **FR-16. Exercise picker and custom exercise.** One top bar with cancel and
  the title. Search and filter chips as on the exercises list. Each row shows
  the exercise name, its muscle group and equipment. Creating a custom
  exercise appears once. The custom-exercise form uses the same cards, chips
  and primary action as the rest of the app.
- **FR-17. Active workout.** From top to bottom:
  1. a header card with the routine name, the workout clock (active duration,
     spec 0011), pause/resume, the sets-done progress as a bar and a count,
     and the workout's **active energy** when it is known (spec 0012) — the
     same reading the lock-screen status shows, hidden (never 0) when there is
     no data or no permission;
  2. while a rest is running, a rest card with the countdown inside a ring,
     the −15 s / +15 s / skip controls, and the rest-picker the screen already
     has;
  3. one card per exercise, with the same column headers for every exercise
     (set, previous, weight, reps, done). The set column shows the set type
     marker (warm-up, drop, failure) the way it can already be changed; a done
     set turns green; a failure marker is orange. Superset exercises are
     joined by a rail and labelled as in FR-14;
  4. add exercise (secondary), the notes field, finish (primary) and discard
     (destructive, text).
- **FR-18. Workout summary.** A hero block confirms the workout was saved and
  names it, followed by tiles for duration, volume and sets, the exercises
  with their sets, and the existing actions (view history, start again).
- **FR-19. History.** Each session is a card: date, routine name, duration and
  volume as chips, and the first exercises with their sets; tapping opens the
  detail. The most recent session is not singled out by colour.
- **FR-20. Workout detail.** A header with date, time range and routine name,
  tiles for duration, sets done and volume, the notes if any, then one block
  per exercise listing its sets with the set type marker, weight × reps, and
  rest.
- **FR-21. Progress overview.** The training-frequency figures as tiles, the
  existing charts in cards, the muscle distribution as bars, and the per-
  exercise list with best lift and record markers (orange). Period and metric
  controls that exist keep working; none is added.
- **FR-22. Exercise progress.** Tiles for best lift, estimated 1RM and
  volume; the chart with the metric switch it already has; personal records
  as a list with the newest first, records marked orange.
- **FR-23. Exercises list and detail.** Large title, search, the favourites
  filter as the first chip after "all", category and equipment chips, rows
  with the existing image or a neutral tile when there is none, and the
  favourite star toggle. The detail screen uses the header block, chips for
  muscles and equipment, and cards for recent sessions.
- **FR-24. Settings.** Sections as cards: language and display unit as
  segmented controls, default rest with its current control, and the account
  card (email, sign out in red). Nothing else.
- **FR-25. Sign-in.** App name and mark, a two-way switch between sign in and
  create account, the existing fields, one primary button, and the error
  message area. Nothing else.

> **Amendment 2026-10-16 (owner request).** Active energy was read from the
> person's health data only for the lock-screen status (spec 0012); the owner
> asked for it to be visible during the workout in the app too. It is the one
> exception to "nothing is added" (Out of scope, last item): no new data, no
> new permission — the existing reading is shown in a second place.

## Behaviour when things go wrong

- **EF-1.** Loading, empty and error states MUST share one look on every
  screen: an icon, a title, a sentence, and — where one exists today — a
  single action (retry, create).
- **EF-2.** When a name or a translated label is longer than its space (a long
  exercise name, German-length words in a future language), it MUST wrap, not
  overlap neighbouring controls. Two controls must never draw over each other
  (the mockup picker header did).
- **EF-3.** When the system text size is increased, screens MUST stay usable:
  text grows, rows grow, nothing is clipped. Large figures may cap their
  growth.
- **EF-4.** When the display typeface cannot be loaded, the app MUST fall back
  to the system typeface and keep working; it MUST NOT show a blank screen
  waiting for it beyond the existing start-up loading state.
- **EF-5.** When a value is unknown (no previous set, no best lift yet), the
  existing placeholder is shown in the new style — never a made-up number.

## Domain impact

None. Only reads existing concepts — Routine, RoutineExercise, Superset,
Routine folder, WorkoutSession, WorkoutSet, Performed set, Warmup set, Active
workout, Pause, Active duration, Personal record, Estimated 1RM, Training
volume, Settings, Display unit. Adds the presentation term **primary action**
to the glossary.

## Acceptance criteria

- **AC-1.** Given any screen, when it is compared with the colour meanings of
  FR-1, then every lime, orange, green and red element matches its meaning and
  no other accent colour appears.
- **AC-2.** Given the language set to English, when every screen and modal is
  opened, then no Spanish word appears; and with Spanish set, no English word
  appears.
- **AC-3.** Given any tab, when it opens, then its name is the large title at
  the top and nothing sits above it.
- **AC-4.** Given any screen, when its actions are listed, then there is at
  most one filled lime action and no action appears twice.
- **AC-5.** Given a routine with a superset of two exercises followed by a
  third exercise, when its detail is opened, then they read 1, 2A, 2B, 3 and
  the superset pair is joined by a rail.
- **AC-6.** Given an active workout with a running rest, when the screen is
  read without scrolling, then the clock, pause, sets progress and the rest
  countdown with its controls are visible above the first exercise.
- **AC-7.** Given an active workout, when a set is marked done, then its row
  turns green; when a set is marked as failure, its marker is orange.
- **AC-8.** Given an exercise whose name is 40 characters long, when it
  appears in the active workout, routine detail, history and workout detail,
  then it is shown in full on up to two lines and overlaps nothing.
- **AC-9.** Given the display unit set to lb, when weights appear on any
  redesigned screen, then they are in lb with the unit, and no screen shows
  tonnes.
- **AC-10.** Given the routine editor with a two-digit max-reps value, when it
  is shown, then both digits are fully visible.
- **AC-11.** Given any screen of the app before the redesign, when its
  redesigned version is compared, then every action and every piece of
  information that was there is still there (FR-9, out of scope).
- **AC-12.** Given the system text size at its largest accessibility setting,
  when the active workout, routine detail and settings are opened, then no text
  is clipped and every control can still be reached.
- **AC-13.** Given an active workout on an iPhone with Health permission and
  calories recorded since it started, when the active workout screen is open,
  then its header shows the same kcal as the lock-screen status; given no
  permission or no data, then no calorie figure is shown.

## Non-functional requirements

- **Platform reach:** iOS, Android and web, as today. The redesign must not
  require a rebuild of the native app beyond what an update of the JavaScript
  bundle can deliver, unless the plan justifies it (Article 9).
- **Performance:** the active workout must stay as responsive as today while
  typing weights and ticking sets; the redesign adds no work per keystroke.
- **Delivery:** screen by screen. Each screen can ship on its own; a half-done
  redesign must still be coherent (the shared style lands first).

## Assumptions

- **[ASSUMPTION: the "decided colours" are the app's current palette.]** The
  Stitch project has two design systems; the one placed on the canvas (Kinetic
  Obsidian) was extracted from the app and matches it exactly. The other
  (Kinetic Volt, with cyan for time) was an earlier draft. Decided by the
  assistant 2026-10-16 after the owner asked to use "the colours that are
  already decided"; reversible.
- **[ASSUMPTION: titles and figures use one geometric display typeface (the
  mockups' Space Grotesk); body text stays in the system typeface.]** The
  mockups' third typeface for labels is not adopted — two faces are enough and
  the system face reads well at small sizes.
- **[ASSUMPTION: completed sets are green, not lime.]** The mockups mix lime
  and green for "done"; the palette reserves green for success and lime for
  the primary action, and the app already uses green for done sets.
- **[ASSUMPTION: Spanish copy follows the mockups where they improved the
  wording; English is written to match.]** Labels change, meaning does not.
- **[ASSUMPTION: the mockups' sample data (names, numbers, dates) is never
  shipped;]** screens show the person's data or the existing empty states.

## Open decisions

None. The owner delegated the gates on 2026-10-16; the calls above are
recorded as assumptions.

## Related

- Mockups: [`reference/`](reference/) (Google Stitch, project "Active Workout
  Screen UI", 2026-10-16). Known defects in them, deliberately not copied:
  cyan time accents, the 2B exercise mislabelled "Fondos en Paralelas" and
  "(Dips)" in the active workout, clipped min/max fields in the routine form,
  the overlapping picker header, and every out-of-scope element above.
- Reads behaviour from: 0004 (routines), 0005 (workouts), 0006 (progress),
  0007 (exercises), 0008 (settings, language), 0011 (pause), 0013 (performed
  work), 0014 (locked routine).
- Roadmap: no area file — cross-cutting.
- Constitution articles engaged: 1 (scope), 4 (display unit), 8 (commits), 9
  (a typeface is a dependency).
