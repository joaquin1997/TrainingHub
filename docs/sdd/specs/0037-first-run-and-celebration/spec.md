---
id: 0037
title: First run and record celebration
status: in-progress
roadmap: docs/roadmap/08-integrations-and-platform.md#settings (Onboarding); docs/roadmap/04-progress-and-prs.md
created: 2026-10-18
decided: 2026-10-18
---

# First run and record celebration

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

Two moments of the app say nothing when they should say something.

**The first minutes.** A person who has just created an account lands
straight on an empty Routines list with kilograms, a 90-second rest and
whatever language the phone uses. Nobody asked whether they lift in pounds
or rest two minutes; they find out in Settings, if they look. And the system
asks for permission to send alerts in the middle of their first workout — the
first time a rest starts, between two sets, with no explanation of why — so
the easy answer is "Don't allow", and from then on rests never buzz with the
phone locked.

**The end of a good workout.** When a workout beats records, the summary
lists them in a card that looks like every other card. The moment the person
worked for passes without anything to feel or see.

## Why now

Decided by the owner on 2026-10-18: *"Créame los specs"*. Onboarding is the
last unbuilt settings item of roadmap area 8. The pieces this slice builds on
now exist: the rest alert outside the app (0018), the profile (0027), live
record badges (0032), and the haptic language, motion rules and the summary's
records-of-the-day block (0034). Asking for alert permission at the wrong
moment costs the rest alert for good on that phone; every new account
since 0018 hits it.

## Today

Verified against the code on 2026-10-18.

- **No first run.** After signing up or signing in, the app goes straight to
  Routines (or back into a workout in progress). Nothing in the app refers to
  onboarding.
- **Settings always have values.** An account that never touched Settings
  reads as kilograms, a 90-second default rest and language "follow the
  device". A never-changed account cannot be told apart from one whose owner
  picked kilograms and 90 s on purpose, except that the language is not set.
  When Settings cannot be loaded, the app silently uses those same defaults.
- **Language.** "Follow the device" (Spanish if the device prefers Spanish,
  otherwise English) unless the person picked one in Settings.
- **Sign-up** asks for email, password and an optional display name. Sign in
  with Apple is not wired into the app yet (0002).
- **Alert permission.** Asked by the rest timer the first time a rest is
  scheduled after each app start (0018 EF-1); the system shows its prompt
  only the first time ever. Only iOS has the alert outside the app; on Android
  and web the rest alerts only inside the app and nothing is asked. The app
  never reads whether alerts are allowed, and Settings says nothing about
  them.
- **Summary (after 0034 Phase B).** The summary opens on the workout just
  saved. The records this workout beat are fetched after it opens and, when
  they arrive, appear as a "Records today" block at the top, above the tiles;
  if fetching fails, the block is simply absent. Viewing a saved workout later
  goes through History, not the summary.
- **Record feedback during the workout (0032, 0034).** A set marked done that
  earns a record badge shows a short notice at the top of the workout
  (about 2.5 s, never blocking a tap), its status-area badge pops (static
  under Reduce Motion), and the phone gives the *record* haptic instead of the
  set-done tap. The summary gives no haptic and has no motion of its own.
- **Haptic language (0034).** Exactly four events — set done, record, rest
  over, destructive confirm — and nothing else buzzes.
- **Reduce Motion** is already read by the app and honoured by the 0034
  animations.

## Users and scenarios

- **New in the US.** Someone signs up on an English iPhone set to the US
  region. The first run offers pounds (preselected from the region) and
  English; they pick a 2-minute rest and allow alerts after reading why. Their
  first workout logs in pounds and the first rest buzzes the locked phone
  without any prompt mid-set.
- **Spanish phone, kilograms.** Someone signs up on a Spanish phone; the first
  run is already in Spanish with kilograms preselected. They tap through in
  ten seconds.
- **Just let me in.** Someone taps "Skip" on the first screen and is on
  Routines immediately, with today's defaults. The first run never comes
  back on that phone.
- **Long-time user, new phone.** The owner installs the app on a new phone
  and signs in to an account with months of workouts: no first run, straight
  to Routines.
- **Not now.** Someone does not want alerts yet and taps "Not now"; their
  first workout is not interrupted by the system prompt. Weeks later they turn
  rest alerts on from Settings.
- **Signed out halfway.** Someone closes the first run by signing out (or
  their session expires) on screen two. Next time they sign in on that phone
  it starts again from the beginning.
- **Three records.** Someone finishes a heavy day. The summary opens; as the
  "Records today" block appears, a short lime burst flares behind it and the
  phone gives the record pulse once. They scroll straight away and tap share
  — nothing is in the way.
- **Reduce Motion.** The same person with Reduce Motion on sees the block
  appear already highlighted, no burst; the pulse is still felt.
- **Back to the summary.** They open Settings from the summary's tab bar
  and come back: the summary is still there, no second burst.

## Scope

### In scope

**A — First run**
- A short first run (at most three screens) shown once, after signing up or
  signing in, to an account that has not been set up, on a device where that
  account has not been through it.
- Choices: display unit, default rest, language (preselected from the device);
  an explained request for rest alert permission *before* the system prompt,
  where the device can alert outside the app; an optional path to the profile
  (0027) to add a name and photo.
- Skippable from any screen; never shown again for that account on that
  device once finished or skipped.
- A rule that keeps existing accounts out of it.
- A rest-alerts entry in Settings, so "Not now" is not forever.

**B — Record celebration**
- On the post-workout summary, when the workout beat at least one record, a
  brief celebration behind the "Records today" block — a lime flash/burst and
  the *record* haptic — once per workout, never blocking reading or tapping.
- Under Reduce Motion: a static highlight of the block instead of the burst.

### Out of scope

- **Changing the live record notice during the workout (0032).** Decided:
  it stays exactly as it is; 0034 already gave it the record haptic and the
  badge pop, and the workout is the wrong place for more.
- **Celebrations anywhere else** — History, the exercise progress screen, the
  share card, streaks, milestones ("100th workout"), confetti over the whole
  screen, sound. This is one burst on one block.
- **A product tour** — tooltips, coach marks, sample routines, "create your
  first routine" walkthroughs. The empty states of 0034 already lead to the
  first routine.
- **Asking for Health / active energy access in the first run** — still asked
  where 0012 asks it; folding it in is a follow-up if the owner wants it.
- **Theme choice** — the app is dark only (0034).
- **Collecting new personal data** — no age, sex, goals, experience level,
  body weight or height in the first run; the profile path leads to the
  existing profile screen and nothing new is asked.
- **Showing the first run again on demand** (a "replay onboarding" button) —
  everything it sets is in Settings and Profile.
- **Rest alerts on Android and web** — still inside the app only (0018's TODO);
  the alert step is simply not shown there.
- **A server-side "has onboarded" flag** — the rule in FR-3 uses what the
  account already has.

## Functional requirements

### A — First run

**When it appears**

- **FR-1.** After a successful sign-up or sign-in, the system MUST show the
  first run when, and only when, all of these hold:
  1. this account has not finished or skipped the first run **on this
     device**;
  2. the account **is not set up** (FR-2);
  3. there is no active workout of this account on this device (0010) — the
     workout in progress wins, and the first run is not recorded as done.
- **FR-2.** An account **is set up** when it has at least one routine, at
  least one saved workout, or any setting that differs from the defaults a
  new account gets (a display unit other than kilograms, a default rest other
  than 90 s, or a chosen language). An account that is set up MUST NOT be
  shown the first run on any device, and the device records it as done
  without showing anything.
- **FR-3.** Once the first run is finished or skipped, the system MUST NOT
  show it again for that account on that device — not after restarting the
  app, signing out and in, or updating the app. Another account signing in on
  the same device is judged on its own (FR-1).
- **FR-4.** The first run MUST appear only right after signing up or signing
  in, or at app start when FR-1 still holds for the account already signed
  in (e.g. the app was closed during the first run); never in the middle of
  using the app.

**What it asks**

- **FR-5.** The first run MUST have at most three screens, each with one
  primary action (0017) to continue, a way back to the previous screen, and
  a "Skip" action:
  1. **Language and units** — language (English / Spanish) and display unit
     (kg / lb).
  2. **Rest** — the default rest, and (where FR-8 applies) rest alerts.
  3. **Ready** — a short confirmation, the primary action to start using the
     app, and an optional "Add your name and photo" path (FR-10).
- **FR-6.** Language MUST be preselected as the device's language (Spanish if
  the device prefers it, otherwise English), and changing it MUST change the
  first run's own text immediately. If the person keeps the preselected
  language, the account MUST stay on "follow the device"; only a different
  choice is saved as a chosen language.
- **FR-7.** The display unit MUST be preselected as pounds when the device's
  region measures in imperial units and kilograms otherwise. The default rest
  MUST offer a short list of common values (at least 60 s, 90 s, 2 min, 3 min)
  with 90 s preselected; any other value stays settable in Settings as today.
- **FR-8.** On a device that can alert when a rest ends outside the app
  (0018), and only when the system has not yet been asked, the rest screen
  MUST explain in one or two sentences why alerts are wanted (the phone — and
  a paired watch — buzz when a rest ends with the phone locked) and offer
  "Allow alerts" and "Not now". Only "Allow alerts" triggers the system
  prompt. Where the device cannot alert outside the app, or the system was
  already asked, no alert question is shown.
- **FR-9.** After "Not now" — and after the system prompt was answered either
  way — starting a rest MUST NOT trigger the system prompt (it replaces 0018
  EF-1's "ask at the first rest" for this person). For people who never saw
  the alert question (existing accounts, the first run skipped before that
  screen), 0018 EF-1 is unchanged: the system asks at the first rest.
- **FR-10.** The "Add your name and photo" path MUST finish the first run
  (FR-11) and then open the existing profile editing (0027), with the display
  name prefilled if one was given at sign-up. Leaving the profile goes to the
  app as usual. Nothing in the first run requires a name or a photo.

**Finishing and skipping**

- **FR-11.** Finishing MUST save the chosen display unit, default rest and
  language (FR-6) to the account, like changing them in Settings, apply them
  at once (the app's text, every weight shown, the next workout's rest), record
  the first run as done for this account on this device, and open Routines.
- **FR-12.** "Skip", from any screen, MUST save nothing, leave the account's
  settings as they are, record the first run as done for this account on this
  device, and open Routines. A system permission already answered on an
  earlier screen stays as answered.
- **FR-13.** The first run MUST NOT save anything before it is finished: the
  choices are held until the final action (except the system permission,
  which belongs to the device and is answered when asked).

**Rest alerts in Settings**

- **FR-14.** Settings SHOULD show, on devices that can alert outside the app,
  a "Rest alerts" entry saying whether alerts are on, off or not yet asked;
  when not yet asked, tapping it triggers the system prompt; when off, it
  explains that they are turned on in the system settings and leads there.

### B — Record celebration

- **FR-15.** When the post-workout summary shows the "Records today" block
  (0034 FR-24) with at least one record, the system MUST play a **record
  celebration** once: a brief lime flash/burst drawn behind and around the
  block, over in about one second, together with the *record* haptic of the
  haptic language (0034 FR-4) — one pulse, not one per record.
- **FR-16.** The celebration MUST play **at most once per saved workout** on a
  device: not again when the summary is re-shown (leaving to another tab and
  back, rotating, restarting the app on the summary), and never when the same
  workout is viewed from History.
- **FR-17.** The celebration MUST NOT block reading or tapping: the block's
  text stays legible throughout (the burst is behind it, never over the text),
  every control on the summary responds while it plays, scrolling is never
  held, and nothing has to be dismissed.
- **FR-18.** When the records arrive after the summary opened (they are
  fetched after saving), the celebration MUST play when the block appears, if
  the summary is still in front; if the person has already left the summary
  or the app is in the background, it MUST NOT play later elsewhere, and it
  MAY play when the person returns to that same summary, still once (FR-16).
- **FR-19.** With Reduce Motion on, the celebration MUST be replaced by a
  static highlight of the block (e.g. a lime glow or edge that appears without
  scaling, sliding or flashing) that remains while the summary is shown; the
  record haptic still plays once.
- **FR-20.** A screen reader SHOULD announce once, when the block appears,
  how many records the workout beat (e.g. "3 records today").
- **FR-21.** The haptic language of 0034 MUST gain exactly this one new
  trigger for its existing *record* pattern; no new pattern is added and no
  other event on the summary buzzes.
- **FR-22.** A workout that beat no records MUST show the summary as today,
  with no celebration, no highlight and no haptic.

## Behaviour when things go wrong

### A — First run

- **EF-1. Permission denied.** When the person denies the system prompt, the
  first run MUST continue to the next screen with no error; rests still alert
  inside the app (0018 EF-1), and Settings shows rest alerts as off (FR-14).
- **EF-2. Offline at sign-in.** When the system cannot tell whether the
  account is set up (no connection, server error), it MUST NOT show the first
  run this time and MUST NOT record it as done; it is evaluated again at the
  next app start or sign-in with a connection. The app behaves as today
  meanwhile.
- **EF-3. Offline at finish.** When saving the choices fails, the person MUST
  stay on the last screen with a one-line message and a way to try again; the
  first run is not recorded as done until the save succeeds, and "Skip"
  remains available (FR-12). A language change is never left half applied:
  after a failed save the app shows the language the account actually has.
- **EF-4. Sign-out or expired session mid-run.** Nothing chosen is saved
  (FR-13) and the first run is not recorded as done; the next sign-in of that
  account on this device shows it again from the first screen if FR-1 still
  holds. A different account signing in is judged on its own.
- **EF-5. App closed mid-run.** At the next start the first run is shown again
  from the first screen (FR-4); earlier choices are not remembered.
- **EF-6. Set up elsewhere meanwhile.** If the account becomes set up (FR-2)
  on another device before this one finishes the first run, finishing here
  MUST still save this device's choices (the person just made them, like
  changing Settings); this is the last-write-wins behaviour Settings already
  has.
- **EF-7. Settings could not be loaded after finishing.** The app keeps showing
  the choices just saved, not the defaults.
- **EF-8. Older server.** If the server cannot provide what FR-2 needs, the
  first run MUST NOT be shown (as EF-2) and nothing else changes.

### B — Record celebration

- **EF-9.** When the records cannot be loaded (offline, server error, older
  server), there is no block and no celebration (0034 EF-5); nothing is
  retried to celebrate later.
- **EF-10.** On a device without haptics or with system haptics off (web,
  0034 EF-1), the visual celebration still plays and nothing else changes.
- **EF-11.** If the summary is left while the burst is playing, the burst
  stops with it; it never continues or replays on another screen.
- **EF-12.** If the saved records differ from the badges shown during the
  workout (0032 FR-23), the celebration follows the saved records only: no
  saved records, no celebration — even if badges were shown live.

## Domain impact

Reads: **Settings**, **Display unit** (Article 4: the unit chosen is a display
preference only; nothing about stored kilograms changes), **Routine**,
**WorkoutSession**, **Active workout**, **Rest timer**, **Personal record**,
**Record type**, **Haptic language**.

New terms (added to the glossary):

- **First run** — the short sequence after signing up or signing in that sets
  display unit, default rest and language and asks for rest alerts with an
  explanation. Shown once per account per device, only to an account that is
  not set up.
- **Record celebration** — the one-off flash and record haptic on the
  post-workout summary of a workout that beat records; a static highlight
  under Reduce Motion.

What is remembered, and where:

- Whether the first run is done is kept **on the device, per account** — not on
  the account. Whether an account *is set up* is derived from what the account
  already has (FR-2); nothing new is stored on the account. This is a
  deliberate exception to 0008's "preferences belong to the account": it is
  not a preference but a record of what this device has shown.
- Which workouts have been celebrated is kept on the device, by workout
  identity (0014), so FR-16 holds across restarts.
- Whether the person was already asked for alert permission, and "Not now"
  (FR-9), is kept on the device; the permission itself belongs to the system.

**Changes to earlier specs:** 0018 EF-1 (asked at the first rest) now applies
only to people who never saw the alert question (FR-9). 0034 FR-5 (no other
haptic event) gains the summary celebration as a second trigger of the
existing *record* pattern (FR-21), and 0034's out-of-scope "celebratory
screens" is narrowed by this one block-level celebration — still no
confetti, no celebratory screen.

## Acceptance criteria

### A — First run

- **AC-1.** Given a new account just created on an iPhone set to Spanish and a
  European region, when sign-up completes, then the first run appears in
  Spanish with kilograms and 90 s preselected; tapping through without
  changes and finishing opens Routines, and Settings shows kg, 1:30 and
  language "follow device".
- **AC-2.** Given a new account on an English device with a US region, when
  the first run shows, then pounds is preselected; choosing 2 min and
  finishing makes the next workout log in pounds and its first rest last
  2 min, and Settings shows lb and 2:00.
- **AC-3.** Given the first run on screen one, when the language is switched
  to the other language, then that screen's text changes at once; after
  finishing, the whole app is in the chosen language and Settings shows it as
  chosen.
- **AC-4.** Given a new account on an iPhone whose system was never asked, when
  the rest screen shows, then it explains the alert and no system prompt has
  appeared; tapping "Allow alerts" shows the system prompt; after allowing,
  the first rest of the first workout shows no prompt and, with the phone
  locked, buzzes when it ends.
- **AC-5.** Given AC-4 but tapping "Not now", when the first workout's first
  rest starts, then no system prompt appears; Settings shows rest alerts as
  not yet asked and tapping it shows the system prompt.
- **AC-6.** Given the system prompt denied in the first run, then the first run
  continues without an error, rests buzz only while the app is open, and
  Settings shows rest alerts as off with a way to the system settings.
- **AC-7.** Given an Android phone or the web, when the first run shows, then
  there is no alert question; the rest screen offers only the default rest.
- **AC-8.** Given the first run on any screen, when "Skip" is tapped, then
  Routines opens, the account's settings are unchanged, and after signing out
  and in again on that device the first run does not appear.
- **AC-9.** Given an account with saved workouts (or routines, or pounds, or a
  non-default rest, or a chosen language), when it signs in on a device it has
  never used, then no first run appears and Routines opens directly.
- **AC-10.** Given account A finished the first run on a device, when new
  account B signs up on the same device, then B gets its own first run; when A
  signs in again, A does not.
- **AC-11.** Given the first run on screen two, when the person signs out (or
  the session expires), then nothing they chose is saved; signing in again
  with the same new account shows the first run from screen one.
- **AC-12.** Given no connection when a new account signs in, then no first
  run appears and the app works as today; at the next app start with a
  connection, the first run appears.
- **AC-13.** Given the first run's last screen and no connection, when
  finishing, then a one-line error with a retry appears, the person is not
  moved on, and "Skip" still works; with the connection back, retry saves and
  opens Routines.
- **AC-14.** Given the "Add your name and photo" path, when chosen, then the
  first run is recorded as done and the profile editor opens with the sign-up
  name prefilled; leaving it without saving returns to the app with no first
  run.
- **AC-15.** Given a workout in progress restored at sign-in for a new account,
  then the workout opens and no first run appears; once that account is
  otherwise still not set up, the first run appears at the next sign-in or
  app start with no active workout.
- **AC-16.** Given an existing user who never saw the first run, when their
  first rest after this change starts on an iPhone that was never asked, then
  the system prompt appears there, as before (0018 EF-1).

### B — Record celebration

- **AC-17.** Given a finished workout that beat three records and Reduce
  Motion off, when the summary opens and the "Records today" block appears,
  then a lime burst plays behind it for about a second and one record pulse is
  felt; during the burst the block's text is readable, the screen scrolls and
  the share button responds to the first tap.
- **AC-18.** Given AC-17, when the person switches to Settings and back to the
  summary, or closes and reopens the app on the summary, then no burst and no
  pulse play again.
- **AC-19.** Given the same workout opened later from History, then no
  celebration plays.
- **AC-20.** Given Reduce Motion on, when the block appears, then it is shown
  with a static lime highlight — nothing scales, slides or flashes — and one
  record pulse is felt.
- **AC-21.** Given a finished workout that beat no records, when the summary
  opens, then there is no block, no highlight and no pulse.
- **AC-22.** Given no connection when the summary opens, then no block, no
  celebration and no error appear.
- **AC-23.** Given the web build, when a summary with records opens, then the
  burst plays and no error appears (no haptic).
- **AC-24.** Given an active workout, when a set earns a record badge, then the
  notice, badge pop and record haptic are exactly as before this spec.
- **AC-25.** Given VoiceOver on and a workout with two records, when the block
  appears, then "2 records today" (in the person's language) is announced once.

## Non-functional requirements

- **Speed.** The first run adds no visible wait after sign-in beyond what
  deciding FR-1 needs; if deciding takes longer than a couple of seconds, the
  app goes to Routines without the first run this time (as EF-2).
- **Responsiveness.** The celebration never drops frames on the summary or
  delays the first tap; it costs nothing when there are no records.
- **Platform reach.** iOS, Android and web. The alert question exists where
  the rest alert outside the app exists (today iOS only); haptics are absent
  on web.
- **Accessibility.** First-run screens follow 0034: the closed type and shape
  scales, AA contrast, large text without clipping, every control ≥ 44 pt,
  readable by a screen reader in order.
- **Migration of existing data.** None. Existing accounts are kept out by
  FR-2; nothing on the server changes meaning.
- **Native build.** Reading the alert permission's state and opening the
  system settings (FR-14) may need native support; if so it rides the owner's
  next rebuild, and the rest of the slice does not wait for it.

## Assumptions

Gate delegated by the owner (2026-10-18); these calls were made without
confirmation and are cheap to reverse.

- **[ASSUMPTION: "set up" is derived from the account's existing data —
  any routine, saved workout, or non-default setting (FR-2) — rather than a
  new "onboarded" flag stored on the account.]** The request says existing
  users with settings must not be forced through; settings alone cannot tell
  "chose kg on purpose" from "never touched", so routines and workouts are
  added as signals. A side effect: a new account that skipped the first run on
  one phone, without creating anything, sees it once on its next phone. That
  is harmless (it is skippable) and avoids a schema change.
- **[ASSUMPTION: "done" is remembered per account per device]**, as the owner
  asked ("never shown again on that account+device"), not per account.
- **[ASSUMPTION: three screens — language & units, rest & alerts, ready &
  profile]**; the profile is a link out to the existing editor, not an inline
  form, so the first run asks for no personal data.
- **[ASSUMPTION: keeping the preselected language keeps "follow the device"
  (FR-6)]** instead of pinning it, so a person who later changes the phone's
  language still gets the app in it — today's behaviour for anyone who never
  chose.
- **[ASSUMPTION: the unit is preselected from the device's region]** (pounds
  where the region measures in imperial units), as a convenience; kilograms
  everywhere else, as today.
- **[ASSUMPTION: "Not now" also suppresses the prompt at the first rest
  (FR-9)]** — the point of asking first is that the person is never prompted
  mid-workout; Settings (FR-14) is the way back.
- **[ASSUMPTION: choices are saved only on finishing (FR-13)]**, so a sign-out
  or crash mid-run leaves no half-set account; the cost is that an
  interrupted first run starts over (EF-4, EF-5), which takes seconds.
- **[ASSUMPTION: the live record notice during the workout is unchanged]** —
  0034 already added the haptic and the pop; more celebration mid-set
  competes with logging.
- **[ASSUMPTION: the celebration reuses the *record* haptic pattern]** rather
  than adding a fifth pattern, so "record" feels the same everywhere (0034
  FR-4's "same pattern wherever the event happens").
- **[ASSUMPTION: the burst is lime (the brand colour), as the owner asked,
  while the records block keeps its orange record marks]** (0017 colour
  meanings: orange is "record"). The burst is a brand flourish around the
  block, not a status colour.
- **[ASSUMPTION: one celebration regardless of how many records]** — no
  bigger burst for more records.

## Open decisions

None. Gate 1 self-approved under the owner's delegation (2026-10-18); the
calls above are recorded as assumptions. Product calls the owner may still
want to override: asking for Health access in the first run, and whether a
skipped first run should also count the account as set up on other devices.

## Related

- Builds on: [0008 — settings and language](../0008-retro-settings-and-i18n/spec.md),
  [0010 — persist active workout](../0010-persist-active-workout/spec.md),
  [0014 — workout identity](../0014-workout-save-integrity/spec.md),
  [0018 — rest timer](../0018-rest-timer/spec.md) (EF-1 narrowed by FR-9),
  [0023 — records by type](../0023-records-by-type/spec.md),
  [0027 — personal profile](../0027-personal-profile/spec.md),
  [0032 — live records](../0032-live-records/spec.md) (unchanged),
  [0034 — visual polish](../0034-visual-polish/spec.md) (FR-5 and out-of-scope
  narrowed by FR-21).
- Roadmap: [08-integrations-and-platform.md](../../../roadmap/08-integrations-and-platform.md)
  (Settings → Onboarding), [04-progress-and-prs.md](../../../roadmap/04-progress-and-prs.md).
- Constitution articles engaged: 1 (scope: one celebration, three screens),
  4 (unit chosen is display only), 6 (alert permission behind the rest-alert
  interface), 9 (any native support for FR-14 is justified in the plan).
