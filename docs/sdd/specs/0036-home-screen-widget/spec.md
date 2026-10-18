---
id: 0036
title: Home-screen widget
status: in-progress
roadmap: docs/roadmap/08-integrations-and-platform.md
created: 2026-10-18
decided: 2026-10-18
---

# Home-screen widget

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

To know whether this week is on track, or to start the next session, the
person has to open the app, go to Progress or Routines, and find the right
routine. Nothing on the phone's home screen or lock screen says "you trained
Monday and Wednesday, 38 sets so far, Pierna B is next" or offers a one-tap
start. Outside a workout, the app is invisible until opened.

## Why now

Decided by the owner on 2026-10-18 (*"Créame los specs"*). The pieces it
shows already exist or are being specified: the weekly figures (Progress),
the workout in progress and its clock (0010, 0011, 0012), the "a workout is
already in progress" rule (0019), and the routine suggested next (*today's routine*, 0035). The
brand look is settled (0034), so the widget can be drawn once, in the final
style.

## Today

Verified against the code on 2026-10-18.

- **No home-screen or lock-screen widget exists.** The phone has one
  extension outside the app, and it only draws the live workout status
  (0012) and its watch variant (0025). Android and web have nothing outside
  the app.
- **What the phone keeps without the network:** the active workout (its
  draft: routine, exercises, sets, start, pause, rest — 0010) and the sign-in
  token. Settings, routines, history and progress are fetched when a screen
  opens and are not kept between launches.
- **Streak and weekly figures** are computed on the phone from the weekly
  training-volume figures (roadmap 04, "training-frequency tiles"): one entry
  per Monday-start week that had workouts, with that week's volume and
  number of workouts. They carry **no set count and no per-day detail**, so
  "sets this week" and "which days this week" need data the phone does not
  derive today.
- **The in-app streak tile** counts consecutive weeks ending at the *most
  recent week that had a workout*, however long ago that was — someone who
  last trained three months ago after a five-week run still sees 5. The
  widget would make that visible every day.
- **No "next routine" exists today.** Spec 0035 (written alongside this one)
  defines **today's routine**: the one after the most recently performed
  routine in the Routines list's order, within its folder, wrapping round;
  the first routine when none has been performed. It also pins down the
  **week streak** (see FR-3).
- **Signing:** the app is signed with a free developer account. Spec 0012
  recorded that this account cannot give the app and its extensions a shared
  storage area, which is the usual way a widget receives the app's data.

## Users and scenarios

- **Monday morning glance.** Someone unlocks the phone and sees on the home
  screen: a 6-week streak, last week's dots gone, 0 sets this week, and
  "Start Torso A".
- **One-tap start.** At the gym, someone taps "Start Pierna B" on the widget;
  the app opens directly into Pierna B in progress, without going through
  Routines.
- **Mid-workout.** Between sets someone goes back to the home screen; the
  widget shows "Pierna B · 34:12" and tapping it returns to the workout.
- **Lock screen.** Someone keeps a small lock-screen widget with the week's
  dots and the streak; no routine names are shown there.
- **Another device.** Someone logged a workout on a second phone or the web;
  the first phone's widget catches up the next time its app is opened.
- **Signed out.** After signing out, the widget shows only "Sign in" — no
  figures from the previous account.

## Scope

### In scope
- **Small home-screen widget:** the week streak and the number of
  performed sets this week.
- **Medium home-screen widget:** this week's days, Monday to Sunday, as dots
  (trained / not trained / today), the sets this week, and a "Start
  <routine>" button for **today's routine** (0035).
- **Workout in progress** on both home-screen sizes: routine name and a
  running (or paused) clock; a tap opens the workout.
- **Lock-screen accessory widgets** (the small shapes that sit on the lock
  screen): the streak, and the week's dots with the sets this week; during a
  workout, the clock. No routine names.
- Opening the app straight into starting the named routine, with the 0019
  rule when a workout is already in progress.
- Keeping the widget current when the app saves, starts, finishes or
  discards a workout, comes to the foreground, or the person signs in or out.
- Signed-out, no-routines, no-workouts-yet and stale-data states.
- The 0034 brand look (dark palette, lime for the one action, type scale),
  in the app's language (ES/EN).

### Out of scope
- **Android widgets** — decided: out of scope. Android has no extension at
  all today (no live status either, 0012), and its widgets need a separate
  surface built from scratch; not trivial. A follow-up spec if wanted.
- **Web** — there is no widget equivalent.
- **Large home-screen widget, StandBy-specific layouts, watch complications**
  — the two sizes asked for first; the watch already shows the live status
  (0025).
- **Acting on the workout from the widget** (tick a set, pause, finish) — the
  live workout status (0012) and the watch (0025) already do that; the
  widget only opens the app.
- **Choosing a routine on the widget** (a picker or configurable routine) —
  the widget offers today's routine only; any other routine is one tap
  away inside the app.
- **Weights, volume, records or calories on the widget** — counts and days
  only, so no display unit is involved and no figure needs the network to
  be correct.
- **Refreshing the widget while the app is not running** (background fetch,
  pushes from the server) — the widget updates only from the app (see
  Assumptions). Would need a server push or periodic fetch; a follow-up if
  lag after using another device proves annoying.
- **Rest countdown on the widget** — the live workout status shows it.

## Functional requirements

Content:

- **FR-1.** The small widget MUST show the **week streak** (in weeks) and
  the number of **performed sets** this week (Monday 00:00 to Sunday 23:59,
  local time).
- **FR-2.** The medium widget MUST show seven day marks, Monday to Sunday,
  each either *trained* (at least one saved workout started that day) or
  *not trained*, with today distinguishable; the performed sets this week;
  and a "Start <routine>" button naming **today's routine** (0035: the
  routine after the most recently performed one in the Routines list's
  order, within its folder, wrapping round).
- **FR-3.** The streak MUST be the **week streak** as defined in the
  glossary (0035): consecutive Monday-start weeks with at least one saved
  workout, ending this week — or last week while this week has none yet;
  0 once a whole week passes without a workout.
- **FR-4.** Every streak the app shows (the Progress tile, and the home
  screen of 0035) MUST equal the widget's. Today's Progress tile keeps
  counting a run that ended long ago (see *Today*); if 0035 does not already
  move it to the week streak, this spec does.
- **FR-5.** Only performed sets (0013) count toward "sets this week"; warm-up
  sets count, as they do for volume. A workout's day is the day it started,
  in the phone's time zone.

Workout in progress:

- **FR-6.** While a workout is in progress, both home-screen sizes MUST show
  the routine name and the workout clock (active duration, 0011) instead of
  the "Start" button; the clock MUST keep advancing without the app running
  and MUST show as stopped while the workout is paused. The small widget MAY
  drop the streak to make room.
- **FR-7.** Tapping the widget while a workout is in progress MUST open that
  workout.
- **FR-8.** When the workout ends (finished or discarded), the widget MUST
  return to its normal content, reflecting the saved workout if there was
  one.

Starting from the widget:

- **FR-9.** Tapping "Start <routine>" MUST open the app and start that
  routine as a new workout, landing on the workout in progress, with no
  extra screen in between when nothing stands in the way.
- **FR-10.** If a workout is already in progress when "Start" is tapped
  (e.g. the widget had not caught up), the app MUST apply spec 0019: the same
  routine opens without asking; a different one asks first, naming both, with
  "finish and start", "back to the current one" and "cancel".
- **FR-11.** Tapping anywhere on the widget outside the Start button MUST
  open the app on its home screen (Routines), except during a workout
  (FR-7).

Lock screen:

- **FR-12.** The lock-screen accessories MUST show only the streak, the
  week's dots and the sets this week — never a routine name — and during a
  workout only the clock. Tapping one opens the app as FR-7 / FR-11.

Freshness:

- **FR-13.** The app MUST update the widget when it saves, starts, finishes
  or discards a workout, when it comes to the foreground, when the person
  signs in or signs out, and when a routine is created, renamed, deleted or
  reordered in the app.
- **FR-14.** When a new week begins (Monday) without the app being opened,
  the widget MUST show an empty week — no dots, 0 sets — and a streak that
  follows FR-3 (still counting through last week), rather than last week's
  figures as if they were this week's.

Privacy and look:

- **FR-15.** The widget MUST NOT show anything the signed-in person cannot
  see in the app, and MUST NOT show any figure from a different account
  than the one signed in.
- **FR-16.** The widget MUST use the 0034 palette, type scale and shape
  scale; the Start button is drawn as the lime primary action; trained-day
  marks are not told apart by colour alone (0034 FR-17).
- **FR-17.** The widget's text MUST be in the app's language (ES/EN) and
  follow it when the language is changed in the app (at the next update).

## Behaviour when things go wrong

- **EF-1. Signed out.** When no one is signed in (signed out, or the session
  expired and was not renewed), every size MUST show only a "Sign in" prompt
  with no figures and no routine names; tapping it opens the sign-in screen.
  Signing out MUST clear the widget's figures at once.
- **EF-2. Session expires while a workout is in progress.** The widget keeps
  showing the workout (it is kept on this phone for its owner, 0010); a tap
  follows spec 0012 EF-7: sign in, then the workout opens if it is theirs.
- **EF-3. A different account signs in.** The widget MUST show nothing from
  the previous account at any moment; it shows the new account's figures
  after the first update (or the signed-out state until then).
- **EF-4. No routines.** The medium widget MUST replace the Start button with
  "Create a routine", which opens routine creation; the streak, dots and
  sets still show.
- **EF-5. No workouts yet.** Streak 0, sets 0, no dots; the medium widget
  offers the first routine in the Routines list (0035's rule when nothing
  has been performed).
- **EF-6. Today's routine was deleted** (on another device, or before the
  widget caught up). Tapping Start MUST NOT start anything: the app opens on
  Routines with a short notice that the routine no longer exists, and the
  widget updates.
- **EF-7. Stale data after another device saved a workout.** The widget MAY
  show older figures and an older today's routine until this phone's app
  next comes to the foreground; it MUST then update. Tapping Start starts
  the routine the widget names (the person chose what they saw); the app
  does not silently swap it for a different one.
- **EF-8. No network when the app updates the widget.** The figures from the
  last successful update stay; a workout in progress still shows (it lives
  on the phone). A failed fetch MUST NOT blank the widget or show zeros.
- **EF-9. Workout in progress shown, but none exists** (it ended from the
  watch or the live status, or the app was reinstalled). Tapping
  the widget opens the app, which shows no workout, and the widget returns
  to normal content on that launch (as 0012 EF-3 does for the live status).
- **EF-10. Widgets not added / app not opened since install.** The widget
  shows the signed-out state (or a neutral "Open TrainingHub") until the app
  provides data; it never shows placeholder figures.
- **EF-11. Time zone or clock change.** Days and the week boundary follow
  the phone's current time zone; a workout keeps the day it started on.

## Domain impact

Reads only: **WorkoutSession** (saved workouts this week, their start
days), **performed set** (0013), **active workout** and **active duration**
(0010, 0011), **Routine**,
**Settings** (language only), **week streak** and **today's routine** (both
defined by 0035). Writes nothing on the server.

New glossary term: **home-screen widget**. The days-of-the-week row reuses
the look of the **week strip** (0035) but is not tappable per day.

No weights are shown, so constitution Article 4 is not engaged; Article 2 is
unchanged (the widget reads templates and performed work separately).

## Acceptance criteria

All checked on an iPhone with the app installed.

- **AC-1.** Given workouts on Monday (12 performed sets) and Wednesday (15)
  this week, and workouts in each of the previous three weeks, when the small
  widget is added, then it shows a streak of 4 and 27 sets; the medium widget
  shows dots on Monday and Wednesday and today marked.
- **AC-2.** Given the Routines list Torso A → Pierna A → Torso B (one folder)
  and the last workout was Pierna A, then the medium widget reads "Start Torso B"; tapping
  it opens the app with Torso B in progress and its clock running.
- **AC-3.** Given a workout in progress, when the person goes to the home
  screen, then both sizes show the routine and a clock that keeps counting
  with the app closed; after pausing in the app, the widget's clock is
  stopped; tapping the widget opens the workout.
- **AC-4.** Given Torso A in progress and a stale widget still reading "Start
  Pierna A", when Start is tapped, then the 0019 question appears naming both
  workouts.
- **AC-5.** Given a workout is finished and saved, when the person returns to
  the home screen, then the sets this week and today's dot include it and
  today's routine has moved on — without opening the app again.
- **AC-6.** Given the person signs out, then every widget immediately shows
  only "Sign in"; tapping it opens sign-in.
- **AC-7.** Given no routines, then the medium widget shows "Create a
  routine", and tapping it opens routine creation.
- **AC-8.** Given a workout saved on another device, when this phone's app is
  opened and sent to the background, then the widget reflects that workout.
- **AC-9.** Given today's routine was deleted on another device, when
  Start is tapped on the stale widget, then nothing starts, a notice says the
  routine no longer exists, and the widget then names a different routine.
- **AC-10.** Given the lock-screen accessory is added, then it shows the
  streak or the week's dots and sets, and no routine name, also during a
  workout.
- **AC-11.** Given the widget showed this week's dots on Sunday and the app is
  not opened, when Monday comes, then the widget shows an empty week, 0 sets
  and the same streak.
- **AC-12.** Given the app language is Spanish, then the widget reads in
  Spanish ("Empezar Torso B", "series esta semana").
- **AC-13.** Given the Progress screen and the widget side by side, then they
  show the same streak; given someone whose last workout was five weeks ago,
  both show 0.
- **AC-14.** Given the phone is in airplane mode and the app comes to the
  foreground, then the widget keeps its last figures (no zeros, no blank).

## Non-functional requirements

- **Platform reach:** iOS only, on the versions that already run the live
  workout status (0012). Android and web: nothing changes.
- **Signing:** must work with the free developer account in use, or the plan
  must say exactly what it needs instead. See the TODO below.
- **Build:** a change to what is installed alongside the app — device
  rebuild needed, like 0012 and 0025.
- **Cost:** updating the widget MUST NOT add a noticeable delay to saving or
  finishing a workout, nor open the app's screens slower.

`TODO(sdd): the free developer account gives the app and its extensions no`
`shared storage area (0012 plan, "alternatives considered"), which is the`
`usual way a widget gets the app's figures. The plan must start with a`
`device spike proving a working route on the free account (e.g. the widget`
`reading its data another way). If none exists, this spec waits for a paid`
`developer account — the owner's call at that point, not a reason to change`
`the requirements.`

## Assumptions

Gates were delegated to the specifier on 2026-10-18; these calls are recorded
so they can be reversed cheaply.

- **[ASSUMPTION: Android is out of scope.]** No Android extension exists
  today; not trivial.
- **[ASSUMPTION: the lock-screen accessories show no routine names.]** The
  lock screen is readable by anyone holding the phone. Home-screen widgets
  may show routine names, as the live status already does on the lock screen
  during a workout (0012).
- **[ASSUMPTION: the widget updates only from the app; no background refresh
  and no server push.]** A second device's workout appears after this phone's
  app is next opened (EF-7).
- **[ASSUMPTION: the widget uses 0035's week streak, and the Progress tile
  shows the same number (FR-4).]** Two different streak numbers on the same
  phone would read as a bug; today's tile rule overstates a broken run.
- **[ASSUMPTION: "sets this week" counts performed sets including warm-ups;
  timed and distance sets count as sets.]**
- **[ASSUMPTION: a trained day is a day a saved workout started; a workout
  across midnight marks only its start day.]**
- **[ASSUMPTION: the widget's Start uses the routine named on the widget even
  when stale (EF-7), not a recomputed one.]**
- **[ASSUMPTION: two sizes (small, medium) plus lock-screen accessories; no
  user configuration of the widget.]**
- **[ASSUMPTION: depends on 0035 for today's routine and the week
  streak.]** If 0035 is not implemented first, the medium widget's Start
  button cannot be built; the rest can.

## Open decisions

None. Gates delegated by the owner on 2026-10-18; every call above is an
assumption.

## Related

- Depends on: 0035 (today's routine, week streak), 0019 (start while a
  workout is in progress), 0010 / 0011 (active workout, pause), 0013
  (performed sets), 0034 (palette, type scale, FR-17).
- Neighbours: 0012 (live workout status), 0025 (watch).
- Roadmap: `docs/roadmap/08-integrations-and-platform.md`; streak from
  `docs/roadmap/04-progress-and-prs.md` (training-frequency tiles).
- Constitution articles engaged: 1 (scope: Android, background refresh and
  in-widget actions excluded), 6 (the widget sits behind the existing
  live-surface interfaces, not inside features), 9 (no new dependency
  expected; native extension → rebuild), 10 (the signing TODO).
