---
id: 0034
title: Visual polish
status: done
roadmap: "-"
created: 2026-10-18
decided: 2026-10-18
---

# Visual polish

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

Spec 0017 gave every screen one visual language, but the app still feels
unfinished at the edges: it has no icon of its own on the home screen, a tick
or a new record gives nothing to feel in the hand, nothing moves, lists
load behind a lone spinner, and small grey text is hard to read in a bright
gym. Since 0017, the active workout's set row has absorbed supersets (0029),
generated warm-ups (0031), live record badges (0032) and left/right reps
(0022); each added its mark in a different place, so the row no longer says
at a glance *which figure to type and what state the set is in*. Progress
charts are coarse bars with no values, and the end of a workout says little
about how it went compared with last time.

## Why now

The owner reviewed the app after 0015–0033 and listed these points; decided
2026-10-18: *"vamos a crear un spec con todo esto"*. The functional backlog
from the 2026-10-16 device test is code complete, so the "then pretty" half of
the agreed order (2026-09-24) is next. The work is split in two phases, agreed
with the owner: **Phase A** is quick and changes no layout; **Phase B** is a
redesign of four areas and benefits from the owner's screenshots or mockups.

## Today

Verified against the code on 2026-10-18.

- **Tokens.** One dark palette, a spacing scale (4, 8, 12, 16, 20, 24), a
  radius scale (8, 12, 16, pill) and named text styles exist (0017). They are
  not closed: **126 hard-coded font sizes in 42 files**, 14 distinct values
  (10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 26, 28, 32) — 15 distinct sizes
  in the app counting the named styles' 40. **24 hard-coded corner radii**
  (1, 2, 4, 7, 8, 14, 22, 32) and **40 hard-coded non-zero spacings** (1, 2,
  3, 4, 6, 32, 36) sit beside the tokens.
- **App icon and splash.** None. The app configuration defines no icon, no
  splash and no adaptive icon; prebuild warns "No icon is defined". The only
  brand mark is the lime pulse on the sign-in screen.
- **Haptics.** None. The only physical feedback is a plain vibration when a
  rest or a set timer ends (0018, 0021); ticking a set, a record and
  destructive confirmations give no feedback.
- **Motion.** None anywhere. A done set changes colour instantly; a record
  badge appears instantly; the rest bar's fill jumps once a second. Reduce
  Motion is never read.
- **Loading.** 17 loading states, every one a centred spinner with a sentence;
  none shows the shape of the content to come.
- **Empty states.** One shared look (icon, title, sentence, optional action).
  Routines offers "create routine"; Progress, History and the exercises list
  have no next step, and the icons are the generic outline set at 40 pt in the
  subtle grey.
- **Repeated patterns.** 24 locally defined header styles and 52 locally
  defined row styles across screens; card headers and list rows are re-drawn
  per screen with small differences.
- **Charts.** Dependency-free bars from roadmap area 4, 120 pt tall, latest bar
  highlighted, the range as text; no line, no record points, no way to read a
  single value. Used on progress overview, exercise progress, timed progress
  and measurement history.
- **Active-workout set row.** Set marker (36 pt) · previous (64 pt, 13 pt
  text) · one input per field (18 pt figures, 16 pt when compact or L/R) ·
  done box 44×44 · remove (20 pt wide with slop ≈ 32 pt, under the 44 pt
  minimum). Status lives in four places: the row tint (done), the marker
  (type, dashed outline + sparkle badge for a generated warm-up), a record chip
  *under* the row, and a round tag on the superset rail. Weight and reps are
  the same size as the previous-time text's neighbours; nothing says "up next".
- **Workout header.** Scrolls away with the list; the rest bar is pinned at the
  bottom (0018). Once scrolled, the clock and the next set are off screen.
- **Summary.** Hero (routine, "saved" chip), tiles (duration, volume, sets,
  plus time or distance), the records beaten (0023), the exercises with their
  sets, and the actions. No comparison with any earlier workout.
- **Share.** Text only (0028); an image card was left as a follow-up there.
- **Theme.** Dark only: one palette, status bar forced light. The app does not
  declare its appearance to the system, so system-drawn sheets and keyboards
  follow the device setting; no input asks for the dark keyboard.
- **Contrast (WCAG 2.x).** Subtle grey #6E7B8E: **4.30:1** on the background,
  **4.07:1** on cards, **3.59:1** on raised fields, **3.0:1** on a done row —
  all under the 4.5:1 AA minimum for small text. It is used for 10 text styles
  at 10–13 pt (column headers, captions) and for the placeholder of 23 inputs.
  Muted grey #A7B0BE passes (7.06–8.45:1; 5.89:1 on a done row). Accents pass
  on every surface (orange ≥ 6.59, red ≥ 5.57, green ≥ 9.41, lime ≥ 13.09). The
  undone done-box outline is 1.72:1 against its field, under the 3:1 minimum
  for a control's boundary.
- **Dynamic Type.** Never capped and never tested beyond 0017's AC-12 device
  check (still pending); the set row's fixed widths (36 / 64 / 44 pt) are the
  likely breaking point.

## Users and scenarios

- **Phone on the bench.** Someone between sets glances at the screen from a
  metre away: they need the next set's weight and reps, big, and the rest
  draining, without reading small grey text.
- **Tick without looking.** Someone ticks a set with sweaty fingers and wants
  to *feel* that it registered — and to feel a different pulse when it was a
  record.
- **Found on the home screen.** Someone looks for the app among others and
  recognises it by its icon; it opens on a branded screen, not a white flash.
- **Long workout, scrolled deep.** In the fifth exercise of a superset, someone
  still sees the clock, the round and what comes next.
- **Is it going up?** Someone opens their bench press progress and reads the
  trend as a line, sees which sessions were records, and taps one to read its
  value.
- **After the last set.** Someone finishes and wants to know at once whether
  today was better than last time, and to send a good-looking card to a
  friend.
- **Larger text / sensitive to motion.** Someone with the largest text size, or
  with Reduce Motion on, uses the same screens without clipping or animation.

## Scope

### In scope — Phase A (quick, no redesign)

1. App icon and splash screen in the brand.
2. A haptic language: set done, record, rest over, destructive confirm.
3. Small motion: done-set transition, record badge pop, rest bar draining
   smoothly — all respecting Reduce Motion.
4. A closed type scale and a closed radius and spacing scale; no ad-hoc values.
5. Shared building blocks for the repeated patterns: card header, list row,
   empty state.
6. Skeleton loading and designed empty states on Progress, History, Routines
   and Exercises.
7. Contrast fixes so all text meets WCAG AA.
8. Dynamic Type does not break the key screens.

### In scope — Phase B (redesign)

9. Active-workout set row hierarchy and one status area per set.
10. Sticky workout header: clock, round, next set.
11. Progress charts upgraded: smooth line and area, record points, tap for
    values.
12. Richer post-workout summary and a designed share card.

### Out of scope

- **Light theme.** Decided 2026-10-18 (see Assumptions): its own follow-up
  spec. Phase A only makes it cheap (every colour a named token).
- **New data or derivations beyond FR-24/FR-25** — weekly goals, calendars,
  streaks, cadence, RPE (still out, as in 0017).
- **Sound.** Feedback is haptic and visual only; no audio cues.
- **Custom haptic settings** (intensity, per-event switches) — the system
  setting that disables haptics is honoured; nothing more.
- **Animated illustrations, confetti, celebratory screens.** Motion is
  functional, short and small.
- **Tablet layouts, landscape, widgets, alternate app icons.**
- **Lock-screen status and watch** (0012, 0025) — not restyled here.
- **Changing what any screen does** except where a requirement names it:
  empty states may gain one action that leads to an existing place (FR-14);
  charts gain tap-to-read (FR-22); the summary gains its comparison (FR-24);
  the share card is a second share format (FR-25).
- **Screens not named here** keep 0017's design; they only pick up the closed
  scales, the shared blocks and the contrast fixes.

## Functional requirements

### Phase A

**Brand**

- **FR-1.** The app MUST have its own icon on iOS, Android (including the
  adaptive/themed shape) and as the web favicon, built from the app's mark
  (the lime pulse) on the app's dark background, legible at the smallest
  system size.
- **FR-2.** Starting the app MUST show a splash in the same brand (mark on the
  dark background) until the first screen is ready, with no white or
  default-coloured flash between splash and first screen.
- **FR-3.** System-drawn surfaces (sheets, alerts, pickers, the keyboard) MUST
  appear in their dark style, matching the app, whatever the device setting.

**Haptic language**

- **FR-4.** The app MUST give haptic feedback for exactly these events, each
  with its own distinct pattern, and the same pattern wherever the event
  happens:
  - **set done** — a light, crisp tap when a set is ticked (not when unticked);
  - **record** — a stronger, success-type pattern when a ticked set earns a
    record badge, *instead of* the set-done tap;
  - **rest over** — a notification-type pattern when the rest ends while the
    app is in front (replacing today's plain vibration there; the background
    alert of 0018 is unchanged);
  - **destructive confirm** — a warning-type pattern when a destructive action
    (discard workout, delete routine, delete exercise, remove set) is
    confirmed.
- **FR-5.** No other event MUST produce haptics (no feedback on scroll, tabs,
  ordinary buttons or typing).

**Motion**

- **FR-6.** Marking a set done MUST transition the row to its done look over a
  short animation (no more than about a third of a second); unticking reverses
  it.
- **FR-7.** A record badge MUST appear with a brief "pop" (a slight scale-up
  and settle), once, when it is earned — not again on scrolling or reopening.
- **FR-8.** The rest bar's fill MUST drain continuously, not in one-second
  steps; the countdown figure still changes once a second.
- **FR-9.** When the system's Reduce Motion setting is on, FR-6 and FR-7 MUST
  change state instantly (or with a plain cross-fade), and the rest bar MAY
  step once a second. No information is lost without motion.

**Closed scales**

- **FR-10.** Text MUST use one closed **type scale** of six named styles, each
  with a size, line height, weight and face:
  1. *Title* — large titles of tab roots and heroes;
  2. *Heading* — card and section titles;
  3. *Body* — prose, row titles, inputs;
  4. *Caption* — secondary text, section labels, column headers, chips (the
     smallest text in the app; no text is smaller);
  5. *Figure large* — the key figure of a screen (clock, weight/reps in the set
     row, hero tiles);
  6. *Figure* — other figures (tiles, previous-time values, chart values).
  Figures keep fixed-width digits (0017 FR-2). No screen MAY use a size outside
  the scale.
- **FR-11.** Corner radii MUST come from one closed scale (small, medium,
  large, pill, round) and spacing from one closed scale (the current six steps
  plus at most two more); no screen MAY use a value outside them. Hairline
  borders are not spacing.
- **FR-12.** Colours MUST come only from the named palette; no screen MAY
  write a colour value of its own.

**Shared building blocks**

- **FR-13.** Three patterns MUST each be drawn by one shared block used
  everywhere the pattern appears: a **card header** (title, optional caption,
  optional trailing action), a **list row** (leading tile or icon, title that
  wraps per 0017 FR-7, secondary line, trailing value or chevron, whole row
  tappable at ≥ 44 pt) and the **empty state** (FR-14).

**Loading and empty states**

- **FR-14.** Progress, History, Routines and Exercises MUST each have a
  designed empty state: a larger icon in the screen's own subject, a title, one
  sentence, and one action leading to an existing place — create a routine
  (Routines); start a workout from a routine (History, Progress — opens
  Routines); clear the filter or search (Exercises with a filter or search
  active). Error states keep their retry.
- **FR-15.** Those four screens MUST show a **skeleton** while their first
  load is in flight: neutral placeholder shapes laid out like the content to
  come (cards, rows, tiles), subtly pulsing — still under Reduce Motion. A
  skeleton never shows invented numbers or names. The spinner stays only where
  the content's shape is unknown (app start, small inline loads).

**Accessibility**

- **FR-16.** All text MUST meet WCAG AA contrast against the surface it sits
  on: at least 4.5:1 for text under the large-text threshold, 3:1 for large
  text — including placeholders, captions and text on done or record tints.
  Control boundaries that carry meaning (an undone done-box, an input's edge
  where its fill does not distinguish it) MUST reach 3:1.
- **FR-17.** Status MUST NOT be carried by colour alone: done, record,
  failure, generated warm-up and up-next each also have a shape, icon or word
  (already partly true — kept and completed by FR-19).
- **FR-18.** With the largest system text size (including the accessibility
  sizes), the key screens — active workout, routines list, routine detail,
  workout summary, settings — MUST show no clipped or overlapping text and
  keep every control reachable. Body and caption text MUST grow; figures in
  fixed-width columns MAY stop growing at a cap, and the plan states it.

### Phase B

**Active-workout set row**

- **FR-19.** In each set row:
  - weight and reps (or the tracking type's fields, 0021; both sides for an
    L/R set, 0022) MUST be the **largest text in the row**, in *Figure large*;
  - last time and the set-type mark MUST be visibly secondary (smaller, muted,
    passing FR-16);
  - each set MUST have **one status area** in a fixed place on the row that
    shows, by priority, exactly one of: *record* (0032, orange, trophy),
    *done* (green, check), *generated warm-up* (0031, its mark), *up next*
    (the next set to do, lime outline), or nothing. Record badge text that
    does not fit stays reachable (e.g. on tap or below the row), but the
    indicator itself is in the status area;
  - the superset round (0029) stays on the rail, outside the status area;
  - the done target MUST be at least 44×44 pt and every other control in the
    row (remove, type, timer) at least 44 pt in its hit area.
- **FR-20.** **Up next** is the first set, in workout order, that is not done —
  in a superset, the next set of the current round (0029). Exactly one set is
  up next at a time; none when every set is done.

**Sticky workout header**

- **FR-21.** While the active workout is scrolled, a compact header MUST stay
  at the top showing the workout clock (active duration, paused state), the
  current round when in a superset, and the up-next set (exercise and set
  number, with its target); tapping the up-next part scrolls to that set. The
  full header (0017 FR-17) shows when scrolled to the top. The rest bar stays
  where 0018 put it.

**Progress charts**

- **FR-22.** The estimated-1RM and volume charts (overview and exercise
  progress) MUST be drawn as a smooth line with a soft area beneath, one point
  per session point; sessions that set a personal record MUST be highlighted
  points (orange); tapping or dragging over the chart MUST show the date and
  value of the nearest session point in the display unit, and VoiceOver /
  TalkBack MUST be able to read each point. A chart with one session point
  shows a single point and its value, not a line.
- **FR-23.** Charts that are not trend lines (frequency, muscle
  distribution) keep bars, restyled with the closed scales.

**Summary and share card**

- **FR-24.** The post-workout summary MUST lead with the **records of the day**
  (0023) when there are any, as a highlighted block above the tiles, and show
  **volume versus last time**: the change against the most recent earlier
  saved workout started from the same routine, as an absolute amount and a
  direction (up, down, same), and per exercise against that exercise's last
  session (0013's "last time"). With no earlier workout to compare, no
  comparison is shown (never "0" or "+100 %").
- **FR-25.** Sharing a workout MUST offer an **image card** in addition to the
  text of 0028: routine name, date, duration, volume, sets, the records of the
  day, and up to five exercises with their best set, in the person's language
  and display unit, with the app's mark. Nothing personal beyond that (no body
  measurements, no email). The text share stays available.

## Behaviour when things go wrong

- **EF-1.** On a device or platform without haptics (web, devices without the
  hardware) or with system haptics turned off, FR-4 produces nothing and
  nothing else changes; no error is shown.
- **EF-2.** When a set is ticked and unticked quickly, only the final state's
  feedback is felt and the row ends in the right state; animations never leave
  a row half-transitioned.
- **EF-3.** When the live record check is unavailable (0032 offline, no
  starting records), a ticked set gives the set-done tap and no record
  feedback; a record found later does not buzz retroactively.
- **EF-4.** When a list load fails after the skeleton shows, the skeleton is
  replaced by the error state with retry — never left pulsing.
- **EF-5.** When the comparison data for FR-24 cannot be loaded (offline, older
  server), the summary shows without the comparison and without an error
  banner; the rest of the summary is unaffected.
- **EF-6.** When the share card cannot be drawn or shared, the person is told
  in one line and the text share still works.
- **EF-7.** When a chart has gaps (sessions without a 1RM, e.g. reps-only),
  the line joins the points that exist; it never draws a zero.
- **EF-8.** When a name, a translated label or a large figure does not fit at a
  large text size, it wraps (names) or the row grows taller; it never overlaps
  the status area or the done target.

## Domain impact

Reads only: Active workout, WorkoutSet, Performed set, Generated warm-up set,
Superset, Round, Rest timer, Record badge, Starting records, Personal record,
Record type, Estimated 1RM, Training volume, Session point, Display unit,
Unilateral exercise, Tracking type. FR-24 introduces one derivation — the
*previous workout of the same routine*, through the saved workout's optional
provenance (0014) — computed, never stored.

New presentation terms in the glossary: **Type scale**, **Shape scale**,
**Haptic language**, **Skeleton**, **Set status area**, **Up next**.

## Acceptance criteria

### Phase A

- **AC-1.** Given a fresh install on iOS and Android, when the home screen and
  the app switcher are viewed, then the app shows its own icon (the lime mark
  on dark), and the web build shows it as the favicon; a native build prints
  no "no icon" warning.
- **AC-2.** Given a cold start, when the app opens, then the branded splash
  shows and hands over to the first screen with no white frame (checked on a
  screen recording, frame by frame).
- **AC-3.** Given an active workout on an iPhone, when a set is ticked, a
  record is earned, the rest ends with the app open, and "discard workout" is
  confirmed, then four distinguishable patterns are felt; unticking, scrolling
  and pressing ordinary buttons produce none.
- **AC-4.** Given Reduce Motion off, when a set is ticked, then the row
  animates to done; a record badge pops once; the rest bar drains without
  visible steps. Given Reduce Motion on, the same actions change state with no
  scaling or sliding.
- **AC-5.** Given the repository's automated checks, when they run, then they
  fail if any screen sets a font size, corner radius, spacing or colour value
  that is not in the closed scales or the palette (a check that runs with the
  tests, not a manual review), and they pass on the delivered code — i.e. the
  counts in *Today* (126 font sizes, 24 radii, 40 spacings outside the tokens)
  are 0.
- **AC-6.** Given the type scale, when its definition is read, then it has
  exactly six named styles, and the smallest text in the app is the Caption
  size.
- **AC-7.** Given every pair of a text colour and the surface or tint it is
  drawn on (background, card, raised field, done tint, record tint, lime soft),
  when contrast is computed, then every small-text pair is ≥ 4.5:1 and every
  meaningful control boundary ≥ 3:1 — checked by an automated test over the
  palette; in particular the subtle grey moves from 3.59–4.30:1 to ≥ 4.5:1 on
  all four surfaces and ≥ 4.5:1 on the done tint.
- **AC-8.** Given Progress, History, Routines and Exercises on a slow
  connection, when each opens for the first time, then a skeleton shaped like
  its content shows instead of a spinner; when the load fails, the error state
  with retry replaces it.
- **AC-9.** Given a new account, when Progress, History, Routines and
  Exercises (with a search that matches nothing) are opened, then each shows
  its designed empty state with its one action, and the action leads where
  FR-14 says.
- **AC-10.** Given the shared blocks, when the screens are reviewed, then every
  card header, list row and empty state is drawn by its shared block (no local
  re-implementation remains — reviewable by search).
- **AC-11.** Given the largest accessibility text size, when the active
  workout (with an L/R exercise, a superset and a generated warm-up), routines
  list, routine detail, summary and settings are opened on an iPhone SE-width
  screen, then no text is clipped or overlapping and every control can be
  reached.

### Phase B

- **AC-12.** Given an active workout set row, when it is measured, then weight
  and reps are in *Figure large*, larger than any other text in the row; last
  time is in a smaller muted style; the done target is ≥ 44×44 pt and the
  remove control's hit area ≥ 44 pt.
- **AC-13.** Given a set that is done *and* a record, when it is shown, then
  its status area shows the record (one indicator), not two badges in two
  places; given the first undone set, its status area shows up next; given a
  generated warm-up not done, its status area shows its mark.
- **AC-14.** Given a superset A/B in round 2 with A2 done, when the screen is
  scrolled to the last exercise, then the sticky header shows the clock, "round
  2" and B2 as up next; tapping it scrolls to B2.
- **AC-15.** Given an exercise with eight session points of which two set a
  record, when its progress chart is shown, then a smooth line with an area is
  drawn, the two record points are orange, and tapping the fifth point shows
  its date and value in the display unit; a screen reader reads each point.
- **AC-16.** Given an exercise with one session point, or with sessions where
  the 1RM is unknown, when its chart is shown, then one point (no line) or a
  line through the known points only is drawn, never a zero.
- **AC-17.** Given a finished workout from a routine that was done before with
  less volume and with two records today, when the summary opens, then the
  records block is at the top and the volume shows "up" with the difference in
  the display unit; given the routine's first workout, no comparison appears.
- **AC-18.** Given a finished workout, when "share" is chosen, then an image
  card with FR-25's content can be sent to another app, in the chosen language
  and unit, and the text share is still offered.

## Non-functional requirements

- **Delivery.** Phase A ships before Phase B; each numbered item of the scope
  can ship on its own and leaves the app coherent. Within Phase A, the closed
  scales (FR-10–FR-12) land before the shared blocks that use them.
- **Native build.** Most of the work reaches the phone as an ordinary app
  update. The icon, the splash, the haptics and possibly the chart drawing and
  the image card need a new native build; they ride the next rebuild in the
  owner's batch (Article 9: each such dependency is justified in the plan),
  and the rest does not wait for them.
- **Platform reach.** iOS, Android and web as today; haptics are absent on web
  (EF-1), everything else works there.
- **Performance.** Ticking a set, typing a weight and the rest bar stay as
  responsive as today on the active workout with 10 exercises; animations run
  without dropping frames there; a chart of 100 session points draws without
  a visible delay.

## Assumptions

Self-approved under the owner's delegation of the gates (2026-10-16); each is
reversible.

- **[ASSUMPTION: Phase B starts from 0017's reference mockups and is adjusted
  as it goes.]** The owner's screenshots or new mockups would help Phase B; it
  does not wait for them. If they arrive, they replace the reference for the
  screens they cover.
- **[ASSUMPTION: the light theme is its own follow-up spec, not item 13 of
  this one.]** It doubles the contrast and colour-meaning checks of every
  screen, the owner trains with the dark theme, and nobody has asked for it.
  Phase A's closed palette (FR-12) turns it into a palette exercise later.
- **[ASSUMPTION: the icon and splash use the existing lime pulse mark on the
  app's dark background.]** No new logo is designed here; the owner can supply
  one and it drops in.
- **[ASSUMPTION: the type scale keeps the two faces of 0017]** (display face
  for titles and figures, system face for body) and the palette's hues; only
  the subtle grey (and the boundary grey, if needed) is lightened for FR-16.
- **[ASSUMPTION: the record pattern replaces the set-done tap]** rather than
  following it, so one tick never produces two buzzes.
- **[ASSUMPTION: "volume vs last time" compares with the previous workout of
  the same routine]**, and per exercise with that exercise's last session. A
  workout whose routine link was lost (0014) gets the per-exercise comparison
  only.
- **[ASSUMPTION: the share card is a second share option]**, not a
  replacement of the text share of 0028.
- **[ASSUMPTION: empty states may gain one action that leads to an existing
  place]**, a deliberate exception to 0017's "no new control"; no new
  capability is added.
- **[ASSUMPTION: skeletons are only required on the four list screens]**;
  other screens keep the spinner until they need more.

## Open decisions

None blocking. Product calls the owner may still want to override, recorded
above as assumptions: the icon artwork (the lime pulse or a new logo), the
light theme as a separate spec, and whether Phase B waits for new mockups.

## Related

- Builds on: 0017 (visual redesign, its reference mockups and FR-1 colour
  meanings). Touches the presentation of 0011, 0013, 0014, 0018, 0021, 0022,
  0023, 0028, 0029, 0031, 0032.
- Follow-up: light theme (no spec yet).
- Roadmap: no area file — cross-cutting (charts are roadmap area 4's "line
  charts").
- Constitution articles engaged: 1 (scope, two phases), 4 (display unit in
  charts, summary and card), 8 (one item per commit), 9 (haptics, chart
  drawing, image card are dependencies; native ones need a rebuild).
