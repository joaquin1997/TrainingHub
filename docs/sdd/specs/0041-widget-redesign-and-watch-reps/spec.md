---
id: 0041
title: Widget redesign and reps on the watch
status: in-progress  # gate 1 self-approved 2026-10-21 (delegated gates, 2026-10-16)
amends: 0025, 0036
roadmap: docs/roadmap/08-integrations-and-platform.md
created: 2026-10-21
---

# Widget redesign and reps on the watch

> **No technology in this file.** See `../README.md`.

## Problem

From the owner's session of 2026-10-21:

- **The widget** "no está centrado, lo veo bastante básico y feo". Its
  content hugs the left edge, it is always dark even with the phone in light
  mode, and it says little: outside a workout a streak, a set count and the
  week's dots; during a workout only the clock — not the set to do, not how
  far along the workout is, not the rest.
- **The watch** can only confirm a set as planned. When the person did 8
  reps instead of 10, the watch logs 10 and the phone has to be corrected
  later, or the set is ticked on the phone instead — which defeats the watch.

The owner put both in one spec and named it the most useful one for their
training.

## Today (verified 2026-10-21)

- Widget sizes: small, medium, lock-screen round and rectangular. Small: the
  brand mark top-left, streak and sets under it. Medium: streak and sets,
  the week's dots, and "Start <routine>". During a workout: routine name and
  clock (and "Paused"). One dark look everywhere.
- The widget is refreshed by the app when it opens, goes to the background,
  or a workout starts, pauses, resumes or ends — not when a set is ticked.
- Watch: exercise name, "Set 2 of 4", the planned values ("60 kg × 8"), Done,
  Pause, Finish, More. Done logs the planned values.

## Users and scenarios

- **Between sets, phone on the bench.** The home screen shows the workout:
  the rest counting down, "Next: Press inclinado · 32.5 kg × 10" and 9 of 20
  sets done. Tapping opens the workout.
- **Monday, before leaving for the gym.** The medium widget shows "Today:
  Pierna B · 6 exercises · last time 6 days ago", the week's dots, and a
  Start button; the large one also lists the exercises.
- **Light mode.** The phone is in light mode; the widget is light too.
- **Fewer reps than planned.** On the watch the set says 10 reps; the person
  did 8, turns the crown (or taps −) to 8 and taps Done; the phone logs 8.
- **More reps.** Same, up to 12.

## Scope

### In scope
- Widget: a redesign of every size, centred and following the phone's light
  or dark mode; richer content outside and during a workout; a large size
  and a one-line lock-screen size.
- Widget: refreshed when a set is ticked, untick­ed or a rest starts or is
  skipped, so the workout view is current.
- Watch: change the reps of the set to do before ticking it, for sets that
  record reps on one side.

### Out of scope
- Ticking a set or skipping a rest from the widget itself — opens the app.
- Changing the weight on the watch — a follow-up if the owner wants it.
- Reps per side on the watch for unilateral exercises: shown as planned,
  ticked as planned (as today).
- Changing a set already ticked, from the watch.
- Widget colours chosen apart from the phone's light or dark mode.
- Android and web widgets.

## Functional requirements

### Widget
- **FR-1.** Every size MUST lay its content out centred or evenly across
  its width; nothing hugs one edge with empty space on the other.
- **FR-2.** The widget MUST follow the phone's light or dark mode, with the
  app's colours for each (0038).
- **FR-3.** Outside a workout, the small size MUST show today's routine (or
  that there is none) and the week: days trained and the streak.
- **FR-4.** Outside a workout, the medium size MUST show today's routine
  with how many exercises it has and when it was last done, a Start button
  (as 0036), the week's days and the week's workouts and sets.
- **FR-5.** A large size MUST show what the medium shows plus today's
  routine's exercises (up to six, then "+N more").
- **FR-6.** During a workout, every home-screen size MUST show the sets done
  out of the total, as a figure and a ring; the clock (stopped while
  paused); and the set to do next, or "All sets done". During a rest the
  rest countdown MUST be the most prominent figure, and it MUST disappear
  when the rest ends even with the app closed — never stuck at 0:00
  (0040 FR-3).
- **FR-7.** A one-line lock-screen size MUST show the clock during a workout
  and the streak and days trained otherwise. Lock-screen sizes MUST NOT show
  routine or exercise names (0036 FR-12) — the next set is shown only on the
  home screen.
- **FR-8.** The widget MUST show a ticked or unticked set, a started or
  skipped rest, and a pause within moments when the app is open.
- **FR-9.** Tapping opens the workout during one and the app otherwise;
  Start starts today's routine (0036, unchanged).

### Watch
- **FR-10.** For a set that records reps (not per side), the watch MUST show
  the reps as a value the person can change before ticking, starting from
  the planned reps (typed, else the ghosted "last time" value).
- **FR-11.** The reps MUST change one at a time with the crown and with −
  and + buttons, never below 0 nor above 100.
- **FR-12.** Done MUST log the reps shown; the phone MUST store them for
  that set exactly as if typed there, then tick it (rest, rounds and
  records as today).
- **FR-13.** The weight (or other planned values) MUST stay visible next to
  the reps.
- **FR-14.** A new set to do MUST start from its own planned reps, not the
  previous set's changed value.

## Behaviour when things go wrong

- **EF-1.** A set without planned reps starts at 0 on the watch; Done with 0
  logs the set with no reps typed (as ticking an empty set on the phone).
- **EF-2.** A watch build without this feature, or a phone build without
  it, keeps working: the phone logs the planned reps, the watch shows the
  planned values.
- **EF-3.** A tick from the watch that arrives late (queued) still logs the
  reps chosen on the watch.
- **EF-4.** Without data yet, the widget shows the brand and "Open
  TrainingHub", never placeholder figures (0036 EF-10).

## Domain impact

No new concept. **WorkoutSet** reps get a second place to be entered (the
watch). The widget reads **today's routine**, the **week streak** and the
active workout's progress; nothing is stored.

## Acceptance criteria

- **AC-1.** In light and dark mode, small, medium and large widgets show
  their content centred, in the app's colours.
- **AC-2.** Mid-workout, after ticking a set on the phone and going home:
  the ring and "9/20" moved, the rest counts down, "Next: …" names the set;
  when the rest ends with the phone locked, the countdown goes away.
- **AC-3.** Monday, no workout yet: the medium widget shows today's routine,
  "6 exercises", "last time 6 days ago" and Start; the large lists the
  exercises.
- **AC-4.** On the watch, a set planned 10 reps; crown down to 8; Done; on
  the phone the set is done with 8 reps and the rest started.
- **AC-5.** The next set on the watch starts from its own planned reps.
- **AC-6.** A unilateral set on the watch shows "× 10/8" and no reps control.

## Non-functional requirements

- Needs a native rebuild (widget, watch app) — rides 0040's.
- iOS only (watch and widget).

## Assumptions

- **[ASSUMPTION: the widget follows the phone's light/dark mode, not the
  app's own appearance setting — iOS draws widgets with the system's.]**
- **[ASSUMPTION: reps only; weight on the watch is a follow-up.]**
- **[ASSUMPTION: "last time" is the last saved workout of that routine.]**

## Related

- Amends: 0025 (watch), 0036 (widget)
- Builds on: 0035 (today's routine, week streak), 0038 (light theme), 0040
  (no 0:00 after a rest)
