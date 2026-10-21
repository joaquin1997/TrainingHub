---
id: 0035
title: Brand, home header and lock-screen status
status: done
roadmap: "- (cross-cutting) + docs/roadmap/08-integrations-and-platform.md"
created: 2026-10-18
decided: 2026-10-18
---

# Brand, home header and lock-screen status

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

After 0034 the app has an icon and one visual language, but it still opens on
a bare title: the Routines tab says "Routines" and lists them, without saying
who is training, how the week is going or what to do today. History and
Progress also open on a title and make the person scroll to learn anything
about *this* week. The brand mark appears on only two surfaces, so the app
reads as generic everywhere else.

Outside the app, the live workout status (0012) shows the routine, a clock and
calories, but not *what to do next* or how far through the workout the person
is; the top-of-screen area shows a generic dumbbell instead of the app's mark.
And there is no way to throw away a workout started by mistake without
unlocking the phone, opening the app and finding the discard action — on the
watch there is none at all. Finally, on iOS 18 the app icon turns into a light
square on a dark or tinted home screen because it has no dark or tinted form.

## Why now

The owner reviewed the app after 0034 and proposed these points; decided
2026-10-18: *"Créame los specs"*. They are the visible half of the product
after 0034's polish, and they reuse what already exists (profile 0027, week
streak and weekly volume in Progress, records 0023, up next 0034, the watch
app 0025), so most of the work is presentation, not new data.

## Today

Verified against the code on 2026-10-18.

- **Brand mark.** The lime pulse appears in exactly two places: the sign-in
  screen and the share card (0034 FR-25). Nothing on the active workout, the
  tab roots, the empty states or the lock-screen status carries it. (The task
  brief mentioned the active workout; the code has no mark there.)
- **Tab root headers.** Routines, Exercises, Progress, History and Settings
  open with the same large title and, on Routines, a "create" action. No
  greeting, no photo, no figures. The profile (0027: name, photo with initials
  fallback) is reached only from Settings.
- **Week streak and weekly volume.** Progress already shows a week-streak tile
  (consecutive weeks with workouts) and a weekly volume chart. The tile counts
  the run ending at the *most recent week that had a workout*, however long
  ago — so a streak from months ago still shows as current.
- **Routine order.** Routines are listed grouped by folder, in the order they
  were created; there is no manual order. Nothing suggests which routine is
  next.
- **History.** A plain list of saved workouts, newest first; no calendar, no
  filter by day.
- **Tab bar.** The icons *already* switch between a filled form (selected) and
  an outline form (not selected), since the 0017 redesign, in lime when
  selected and the subtle grey otherwise. If the owner sees outline icons
  everywhere on the device, the installed build predates that change (see
  Open decisions).
- **Live workout status.** Lock screen: routine name with a dumbbell, a
  "paused" tag, the rest countdown (orange, medium size) when one runs, the
  workout clock (large), calories, and a row with Pause/Resume (acts without
  opening the app) and Finish (opens the app, which asks to confirm). Expanded
  top-of-screen view: routine, calories, clock, the same controls. Compact:
  a dumbbell / pause / timer glyph and the clock or the rest countdown.
  Minimal: a dumbbell. Watch Smart Stack: read-only routine, clock, rest,
  calories (0025 L1). It knows nothing about exercises or sets.
- **Watch app.** One scrolling screen: routine and clock, heart rate and
  calories, the rest, the current set with a Done button, then Pause/Resume and
  Finish ("Confirm on your iPhone"). No discard; no secondary menu.
- **Discard.** Only inside the app, behind a confirmation ("Discard this
  workout? Everything logged in it will be lost."), with the destructive
  haptic (0034). Rest-end notifications (0018) carry no actions.
- **App icon.** One icon for iOS (the lime mark on dark), an adaptive and a
  monochrome (themed) icon for Android, a favicon. No iOS dark or tinted
  variant.

## Users and scenarios

- **Opening the app on a training day.** Someone opens the app and reads
  "Good evening, Joaquín", sees "4-week streak" and "2 this week", and a card
  "Today: Pull B" with a start button — one tap and the workout starts.
- **Is this week going well?** Someone opens Progress and sees at once that
  this week's volume is up on last week's by this point, and that their latest
  record was a bench press heaviest weight on Tuesday.
- **What did I do on Wednesday?** Someone opens History, taps Wednesday on the
  week strip, and sees only that day's workout.
- **Phone on the bench, locked.** Between sets someone glances at the lock
  screen: "Bench press · 100 × 8" and a ring showing 9 of 20 sets done; during
  the rest, a big orange countdown.
- **Started by mistake.** Someone started a routine by accident while putting
  the phone away. From the lock screen they tap Discard, unlock, and confirm
  "Discard this workout? 0 sets will be lost" — never with one stray tap.
- **Phone in the bag.** On the watch someone opens the menu, taps Discard, and
  the watch asks "Discard workout? 3 sets done will be lost" before doing it.
- **Dark home screen.** On a dark or tinted iOS home screen, the app icon
  matches the others instead of standing out as a light square.

## Scope

### In scope

1. **Headers with content.** Routines (home): greeting with name and photo
   (tap → profile), a week-streak chip, a this-week chip, and a "Today:
   <routine>" card with a start action. History: week strip that filters by
   day. Progress: this week's volume against last week, and the latest record.
2. **Tab bar.** Filled icon when selected, outline otherwise (kept and
   verified; see Today).
3. **Brand mark in more places.** Small in the header of every tab root, in
   the compact and minimal top-of-screen status, and in the empty states where
   it fits (FR-13).
4. **Live workout status redesign.** Exercise and up-next set, a sets-done
   ring, a big orange countdown during the rest, the mark in the compact and
   minimal forms.
5. **Discard from outside the app, always with confirmation.** A Discard link
   on the live workout status that opens the app on a discard confirmation;
   Discard in the watch app's menu with its own confirmation. Not on
   notifications.
6. **iOS 18 dark and tinted app icon variants.**

### Out of scope

- **Home-screen widget** — spec 0036.
- **Onboarding and the record celebration** — spec 0037.
- **Light theme** — spec 0038. Everything here uses the existing dark palette.
- **A one-tap discard that runs without opening the app or confirming**, from
  the lock screen, the top-of-screen area, the watch Smart Stack or a
  notification — rejected (see FR-20 and Assumptions).
- **Discard on notifications** — see FR-23.
- **Discard on the watch Smart Stack** — it stays read-only (0025 L1).
- **Manual routine ordering, programs or schedules** (e.g. "Push on Mondays").
  Today's routine is a rotation suggestion only; a real plan is a separate
  product decision (glossary TODO on "program").
- **A month calendar or browsing past weeks in the week strip** — current week
  only.
- **Editing sets, weights or reps from the lock screen or the watch** — as in
  0012 and 0025.
- **Streak goals, notifications or nudges** ("don't break your streak") — the
  chip only reports.
- **Android ongoing-notification equivalent of the status** — as in 0012; the
  Android icon already has its themed form (0034).
- **New logo artwork.** The variants are drawn from the existing mark.

## Functional requirements

### 1. Headers with content

**Routines (home)**

- **FR-1.** The Routines tab root MUST open with a header showing a greeting
  in the person's language with their display name ("Good evening, Joaquín")
  and their profile photo — or the initials placeholder the profile uses when
  there is no photo. Tapping the photo or the name MUST open the profile
  (0027). The "create routine" action stays reachable from the header.
- **FR-2.** The greeting MUST depend on the device's local time of day:
  morning (05:00–11:59), afternoon (12:00–19:59), evening (20:00–04:59).
- **FR-3.** Below the greeting, two chips MUST show: the **week streak**
  ("4-week streak") and the number of saved workouts **this week** ("2 this
  week"). Weeks run Monday to Sunday in the person's local time. The streak
  chip is hidden when the streak is 0; the this-week chip shows 0 ("0 this
  week") — a real figure, not a missing one.
- **FR-4.** The week streak MUST follow the glossary definition, and the
  Progress week-streak tile MUST show the same number as the chip (today the
  tile can count a run that ended long ago — see Today).
- **FR-5.** Below the chips, a **Today's routine** card MUST show "Today:
  <routine name>", the routine's exercise count, and a start action that
  starts that routine exactly as starting it from its own screen does
  (including 0019's "finish and start" rule if a workout is in progress —
  but see FR-7). Tapping the card outside the start action opens the
  routine.
- **FR-6.** Today's routine MUST be chosen as follows:
  1. take the most recent saved workout whose routine still exists and
     belongs to the person (optional provenance, 0014);
  2. today's routine is the next routine after it in the Routines list's
     order **within the same folder** (unfiled routines form their own group),
     wrapping from the last back to the first;
  3. when no saved workout points at an existing routine, it is the first
     routine in the list;
  4. when the person has no routines, the card MUST NOT be shown.
  It is recomputed whenever the list or history changes (a workout saved, a
  routine created, deleted or moved), with no manual refresh.
- **FR-7.** While a workout is in progress, the Today's routine card MUST NOT
  be shown; the workout bar (0019) already leads back to it.

**History**

- **FR-8.** The History tab root MUST show a **week strip** above the list:
  Monday to Sunday of the current week, each with its weekday initial and
  date, today marked, and a dot under each day that has at least one saved
  workout (by its start time, local time).
- **FR-9.** Tapping a day MUST filter the list to that day's workouts and mark
  the day as selected; tapping the selected day again, or a visible "clear"
  control, MUST show the full list again. Days after today are not tappable.
- **FR-10.** A day with no workout MAY be tapped; the list then shows "No
  workouts on <weekday>" with the clear control, not the screen's empty state.

**Progress**

- **FR-11.** The Progress tab root MUST start with two items above its
  existing content:
  - **this week's volume** (training volume of this week so far, in the
    display unit) with its change against **last week up to the same point**
    (same weekday and time), as an absolute amount and a direction (up, down,
    same); last week's full total is shown as secondary text;
  - **the latest record**: the most recent personal record of any exercise
    and record type (0023) — exercise, record type, value in the display
    unit, and date — tapping it opens that exercise's progress.
  With no workout last week, no comparison is shown (never "+100 %"); with no
  record ever, the latest-record item is not shown.

### 2. Tab bar

- **FR-12.** Each tab icon MUST be drawn filled when its tab is selected and
  as an outline when it is not, in addition to the colour change. (Already
  true in the code; this requirement protects it.)

### 3. Brand mark

- **FR-13.** The brand mark MUST appear:
  - small, in the header of every tab root (Routines, Exercises, Progress,
    History, Settings), at the same place on each;
  - in the leading part of the compact top-of-screen status and as the
    minimal status (FR-16);
  - in the empty states of Routines (no routines yet) and History (no workouts
    yet), in place of the generic icon — these are the first screens a new
    account sees. Progress and Exercises keep their subject icons (0034
    FR-14).
  The brand mark MUST be decorative: not tappable, and skipped by screen
  readers.

### 4. Live workout status

- **FR-14.** The lock-screen status and its expanded top-of-screen form MUST
  show, in addition to what 0012 shows:
  - the **up-next** set (0034 FR-20): exercise name and its target in the
    display unit and the exercise's tracking type — "Bench press · 100 × 8",
    "Plank · 1:00", "Run · 2.0 km · 10:00", per side for an L/R exercise
    (0022), and the round in a superset ("Round 2"); "All sets done" when none
    is left;
  - a **sets-done ring**: performed sets over all sets of the workout, with
    the count ("9/20").
  The brand mark replaces the dumbbell next to the routine name.
- **FR-15.** While a rest runs, the rest countdown MUST be the largest figure
  of the lock-screen and expanded status, in orange, with "Next: <up-next
  set>" under it; the workout clock stays visible but secondary. When the
  rest ends the layout returns to FR-14 without the app being opened (0018
  FR-8 behaviour).
- **FR-16.** The compact top-of-screen status MUST show the brand mark
  (leading) and the workout clock, or the rest countdown in orange while a
  rest runs (trailing). The minimal status MUST show the brand mark, and the
  rest countdown in orange instead while a rest runs. When paused, the compact
  status MUST show that it is paused (the clock stopped and a paused mark).
- **FR-17.** The status MUST update when a set is ticked or unticked, a set
  is added or removed, or the up-next set changes — from the phone or from
  the watch.
- **FR-18.** The watch Smart Stack status (0025 L1) MUST show the up-next set
  and the sets-done count when they fit; it stays read-only.

### 5. Discard from outside the app

- **FR-19.** The lock-screen status MUST offer **Discard**, visibly secondary
  to Pause/Resume and Finish (smaller, not filled, not adjacent to Pause), so
  that it is the least likely control to be hit by accident. The expanded
  top-of-screen form MAY omit it for space.
- **FR-20.** Discard on the status MUST NOT discard anything by itself. It
  MUST open the app — which, from the lock screen, means the phone asks to be
  unlocked first — on the active workout, with the discard confirmation
  showing. The confirmation MUST name how many performed sets will be lost
  ("3 sets done will be lost", or "No sets done yet"). Confirming discards
  the workout exactly as from inside the app (destructive haptic, status
  removed, watch workout ended without saving to health); cancelling leaves
  the workout as it was, still running.
- **FR-21.** The discard link MUST carry which workout it is for; the app
  MUST only offer to discard that workout (see EF-6).
- **FR-22.** The watch app MUST offer **Discard** in a secondary menu, not
  among the main controls, behind a confirmation on the watch naming how many
  performed sets will be lost. Confirming discards the workout on the phone
  (the source of the logged data) and ends it on the watch without writing a
  workout to health; the phone shows its usual post-discard state.
- **FR-23.** Notifications (the rest-end alert, 0018) MUST NOT offer a discard
  action. Reason: a notification appears every rest and its actions are
  designed to run in one tap, often without unlocking; a destructive action
  there is the most likely to be hit by accident, and adding a confirmation
  would mean opening the app — which the status link already does.

### 6. App icon

- **FR-24.** On iOS 18 and later, the app icon MUST have a **dark** variant
  (the mark on a dark or transparent ground, no light square) and a **tinted**
  variant (a single-tone form of the mark the system tints), both built from
  the existing mark, and legible at the smallest home-screen size. On earlier
  iOS the existing icon is unchanged.

## Behaviour when things go wrong

- **EF-1. No name.** When the person has no display name, the greeting MUST
  read without one ("Good evening") and no placeholder text ("null", "?",
  the email) appears in it.
- **EF-2. No photo.** When there is no photo, or it fails to load, the
  initials placeholder shows (a neutral mark when there are no initials
  either); tapping it still opens the profile.
- **EF-3. Offline or a failed load.** When the profile, history or progress
  data behind a header cannot be loaded, the header parts that depend on it
  MUST be hidden — no zeros, no invented values, no extra error banner — and
  the rest of the screen behaves as today (its own error state with retry).
  The greeting without name (EF-1) still shows. When the data arrives (retry,
  pull to refresh), the header fills in.
- **EF-4. No routines.** A new account sees the greeting and the this-week
  chip (0) but no Today's routine card, and the Routines empty state (with the
  brand mark and its "create routine" action).
- **EF-5. Today's routine deleted or moved meanwhile.** When the suggested
  routine was deleted or moved to another folder since the screen was drawn,
  the start action MUST NOT start a deleted routine: the card is recomputed
  and the person is told in one line if the routine no longer exists.
- **EF-6. Discard link after the workout ended.** When Discard is tapped on a
  status whose workout has already been finished or discarded (stale status),
  or whose workout is not the one in progress, the app MUST open without a
  confirmation and without touching any workout, say in one line that this
  workout has already ended, and remove the stale status (0012 EF-3).
- **EF-7. Signed out.** When the discard link is used with an expired
  session, the app asks to sign in and then opens the workout in progress,
  provided it is theirs; the discard confirmation is not replayed (same rule
  as Finish, 0012 EF-7).
- **EF-8. Watch disconnected.** When the watch cannot reach the phone,
  Discard on the watch MUST NOT be queued for later: the confirmation is not
  offered, and the watch says "Connect to your iPhone to discard". (Ticks are
  still queued as in 0025 EF-1; a destructive action arriving late, after the
  person kept training on the phone, would destroy work they did not mean to
  lose.)
- **EF-9. Discard from two places.** When the workout is discarded or
  finished on one surface while a confirmation is open on another, confirming
  on the second MUST do nothing and say the workout has already ended.
- **EF-10. Status not updated in the background.** When the phone app cannot
  update the status (suspended, e.g. after ticks on the watch while the phone
  is locked), the status MAY show a stale up-next set and ring; the clock and
  the rest countdown never lag (0012 EF-5). The status catches up the next
  time the app runs.
- **EF-11. Live statuses disabled.** When the person has disabled live
  statuses, discarding from outside the app is possible only from the watch;
  nothing else changes (0012 EF-1).
- **EF-12. Week edges and time zones.** A workout started on Sunday 23:30 and
  finished on Monday counts on Sunday (its start). When the device's time zone
  changes, weeks and days follow the new local time; no workout is counted
  twice.

## Domain impact

Reads: User profile (name, photo), Routine, Routine folder, WorkoutSession,
optional provenance (0014), Performed set, Training volume, Personal record,
Record type, Active workout, Up next, Rest timer, Pause, Display unit,
Tracking type, Unilateral exercise, Superset, Round, Live workout status.

New derivations, computed and never stored: **Today's routine**, **Week
streak** (now one definition shared by the home chip and Progress), this
week's volume against last week to the same point, the latest record, and the
sets-done count of the active workout. The live workout status gains the
up-next set and the sets-done count, and a discard entry point; the watch
gains a discard request. Discard itself is unchanged: the active workout is
dropped, nothing is saved (Article 2 untouched).

New glossary terms: **Today's routine**, **Week streak**, **Brand mark**,
**Week strip**, **Discard from outside the app**.

## Acceptance criteria

Checkable on the device (iPhone with iOS 18+, paired Apple Watch with the
watch app) unless stated.

**Headers**

- **AC-1.** Given a profile with name "Joaquín" and a photo, at 20:30, when
  the Routines tab opens, then it reads "Good evening, Joaquín" (or "Buenas
  noches, Joaquín" in Spanish) with the photo; tapping the photo opens the
  profile.
- **AC-2.** Given workouts saved in each of the last three weeks and one this
  week, when Routines opens, then the chips read "4-week streak" and "1 this
  week", and Progress's streak tile also shows 4. Given the last workout was
  three weeks ago, the streak chip is hidden and Progress's tile shows 0.
- **AC-3.** Given routines Push, Pull, Legs in folder "PPL" and the most recent
  saved workout from Pull, when Routines opens, then the card reads "Today:
  Legs"; after a workout of Legs is saved, it reads "Today: Push" without a
  manual refresh. Given a new account with routines but no workouts, it shows
  the first routine; given no routines, no card.
- **AC-4.** Given the Today's routine card, when its start action is tapped,
  then that routine's workout starts; given a workout already in progress, no
  card is shown.
- **AC-5.** Given workouts on Monday and Wednesday of this week, when History
  opens, then the strip shows dots on Mon and Wed and marks today; tapping
  Wed shows only Wednesday's workout; tapping it again shows them all;
  tapping Tue shows "No workouts on Tuesday".
- **AC-6.** Given 8,000 kg this week by Thursday and 6,500 kg last week by
  Thursday (10,200 kg in all), when Progress opens, then it shows 8,000 kg,
  "up 1,500 kg" and last week's 10,200 kg (in lb when the unit is lb); and the
  latest record with its exercise, type, value and date; tapping it opens
  that exercise.
- **AC-7.** Given airplane mode, when Routines, History and Progress open, then
  no chip, card, strip dot or comparison shows a zero or a made-up value; the
  greeting shows (without name if it was never loaded); each screen shows its
  usual error state with retry.
- **AC-8.** Given a profile with no name and no photo, then the greeting has
  no name and the initials placeholder (or neutral mark) shows; tapping it
  opens the profile.

**Tab bar and mark**

- **AC-9.** Given each tab in turn is selected, then its icon is filled and the
  other four are outlines.
- **AC-10.** Given the five tab roots, then each shows the small brand mark at
  the same place in its header; VoiceOver does not announce it. Given a new
  account, the Routines and History empty states show the mark.

**Live workout status**

- **AC-11.** Given a workout with 20 sets, 9 done, up next Bench press 100 kg ×
  8, when the phone is locked, then the status shows "Bench press · 100 × 8"
  (with lb converted when the unit is lb), a ring at 9/20, the clock, and the
  mark next to the routine name.
- **AC-12.** Given that state, when a set is ticked on the watch and the phone
  app is then brought to the front, then the status shows the following set
  and 10/20 (EF-10 allows lag while the phone app is suspended).
- **AC-13.** Given a running rest of 2:00, when the lock screen is viewed, then
  the countdown is the largest figure, in orange, with "Next: …" under it;
  when it ends, the layout returns to the up-next set and ring without
  opening the app.
- **AC-14.** Given a workout in progress and another app in front, then the
  compact status shows the mark and the clock; during a rest, the mark and an
  orange countdown; with two live statuses competing, the minimal status shows
  the mark (or the orange countdown during a rest).

**Discard**

- **AC-15.** Given a workout with 3 sets done and the phone locked, when
  Discard is tapped on the status, then the phone asks to unlock, the app
  opens on the workout with "Discard this workout? 3 sets done will be lost";
  Cancel leaves it running with 3 sets done; repeating and confirming discards
  it, the destructive haptic is felt, the status disappears and the watch
  shows no workout.
- **AC-16.** Given a status left over from a workout already finished on the
  phone, when Discard is tapped, then the app opens with "This workout has
  already ended", nothing else is discarded, and the stale status is gone.
- **AC-17.** Given a workout with 2 sets done and the watch connected, when
  Discard is chosen in the watch menu, then the watch asks to confirm with "2
  sets done will be lost"; confirming ends the workout on the watch and the
  phone, and no workout appears in the health app or in History.
- **AC-18.** Given the phone switched off (watch disconnected), when Discard is
  chosen on the watch, then the watch says to connect to the iPhone and the
  workout continues on the watch; turning the phone on does not discard it
  later.
- **AC-19.** Given a rest-end notification, when it is long-pressed, then it
  offers no discard action.

**Icon**

- **AC-20.** Given iOS 18, when the home screen is set to Dark and then to
  Tinted, then the app icon shows its dark variant and then its tinted variant
  (no light square, mark legible); on Light it shows today's icon.

## Non-functional requirements

- **Native build.** The status redesign, the discard link, the watch menu and
  the icon variants change the native targets and need a device rebuild in
  the owner's batch (Article 9). The headers, the week strip and the tab bar
  reach the phone as an ordinary app update and do not wait for the rebuild.
- **Platform reach.** iOS: everything. Android and web: headers, week strip,
  tab bar and mark in the app; no live status or watch (as today). Icon
  variants are iOS 18+ only; earlier iOS keeps the single icon.
- **Performance.** The home header appears with the routines list on the same
  load — it does not add a second spinner or a visible jump after the list
  shows (a skeleton for the header, as in 0034 FR-15, is fine). Updating the
  status on a tick does not slow ticking a set.
- **Privacy.** The lock-screen status shows exercise names and weights while
  the phone is locked — the same kind of information it already shows (routine
  name); nothing personal beyond that (no name, no photo, no body figures).
- **Accessibility.** New text meets 0034 FR-16 contrast and grows with the
  system text size (0034 FR-18); chips and strip days are at least 44 pt to
  tap; the ring has a spoken equivalent ("9 of 20 sets done").

## Assumptions

Self-approved under the owner's delegation of the gates; each is reversible.

- **[ASSUMPTION: Today's routine is the routine after the most recently
  performed routine in the person's routine order; none performed → the first
  routine; no routines → no card.]** The owner did not choose a rule. A
  rotation needs no new data and matches how split routines (push/pull/legs)
  are used.
- **[ASSUMPTION: the rotation stays within the folder of the last performed
  routine]**, wrapping round, because folders are how people group a split;
  unfiled routines rotate among themselves. "Routine order" is the Routines
  list's order (folder, then creation), since there is no manual order.
- **[ASSUMPTION: the card is hidden while a workout is in progress]** — the
  workout bar covers that case and a second "start" would invite the 0019
  switch flow by accident.
- **[ASSUMPTION: the week streak counts weeks, not days, and a week in
  progress does not break it]** — the definition Progress already uses, with
  the "ends this week or last week" rule added so an old run is no longer
  shown as current. The Progress tile adopts it (FR-4).
- **[ASSUMPTION: weeks run Monday to Sunday everywhere]**, as the owner wrote
  "Mon–Sun", regardless of the device's locale.
- **[ASSUMPTION: this week's volume is compared with last week up to the same
  point]**, not with last week's full total, so Monday never reads as a big
  drop; the full total is shown as secondary text.
- **[ASSUMPTION: the greeting depends on the time of day]** (morning,
  afternoon, evening) — a plain "Hi" would also satisfy the owner's proposal.
- **[ASSUMPTION: the week strip covers the current week only]**; browsing back
  is out of scope.
- **[ASSUMPTION: the sets-done ring counts every set of the workout, warm-ups
  included]**, since those are the sets the person sees and ticks.
- **[ASSUMPTION: outside-the-app discard is a link that opens the app on a
  confirmation — the same pattern as Finish — never a one-tap background
  action.]** The owner's proposal, accepted by default. Pause can act in the
  background because it is harmless and reversible; discard is neither, the
  lock screen acts without unlocking, and pocket or glove taps are likely.
  Opening the app also forces an unlock.
- **[ASSUMPTION: the watch gets Discard in a secondary menu with a native
  confirmation naming the sets that will be lost]**; the watch, unlike the
  lock screen, is on the person's wrist and in view, so confirming there is
  enough.
- **[ASSUMPTION: a disconnected watch does not queue a discard]** (EF-8): a
  late discard could destroy work done on the phone meanwhile.
- **[ASSUMPTION: no discard on notifications]** (FR-23). A possible later
  option is a destructive notification action that requires the device to be
  unlocked before it runs; even then it would skip the "how many sets"
  confirmation, so it is not proposed now.
- **[ASSUMPTION: the brand mark in empty states only on Routines and
  History]**, the first-run screens; Progress and Exercises keep the subject
  icons of 0034.
- **[ASSUMPTION: the icon variants are drawn from the existing lime mark]**;
  no new artwork.

## Open decisions

None blocking. For the owner to confirm or override (recorded above):

- The Today's routine rule (rotation within the folder) — the owner did not
  choose one.
- Whether outline-only tab icons were seen on the device: the code already
  switches filled/outline since 0017, so a stale build is the likely
  explanation; FR-12 and AC-9 confirm it on the next build.
- Whether a week strip with only the current week is enough, or should scroll
  back.

## Related

- Builds on: 0012 (live workout status, Finish link), 0018 (rest timer in the
  status), 0019 (workout bar, finish and start), 0025 (watch app and Smart
  Stack), 0027 (profile name and photo), 0023 (records by type), 0034 (icon,
  mark, up next, empty states, haptics, contrast).
- Follow-ups: 0036 (home-screen widget), 0037 (onboarding and record
  celebration), 0038 (light theme).
- Roadmap: cross-cutting (no area file) and
  `docs/roadmap/08-integrations-and-platform.md` (live status, watch, icon).
- Constitution articles engaged: 1 (scope; no one-tap discard, no programs),
  2 (Today's routine reads templates and performed workouts without mixing
  them), 4 (display unit on the status, header and watch), 6 (status and watch
  behind the live-surface interface), 8, 9 (native rebuild for the status,
  watch and icon).
