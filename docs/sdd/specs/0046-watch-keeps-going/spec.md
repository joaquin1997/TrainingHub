---
id: 0046
title: The watch keeps going with the phone away, and can skip a rest
status: draft
amends: 0025, 0041
roadmap: docs/roadmap/08-integrations-and-platform.md
created: 2026-10-27
---

# The watch keeps going with the phone away, and can skip a rest

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

The point of the watch (0025) is to train with the phone in a bag or on the
bench. Two things break that, from the owner's session:

1. **The next set does not appear on its own.** The person ticks a set on the
   watch and the rest counts down. When the rest ends, the watch shows no set
   to do: nothing to read, nothing to tick. It comes back only after the person
   takes out the phone and opens the app. The watch can start the rest by
   itself, but it cannot move on to the following set without the phone app
   running.
2. **A rest cannot be skipped from the watch.** The phone can skip a rest
   (0018); the watch can only wait it out or be put down and the phone reached
   for.

## Why now

The owner named 0041 (reps on the watch) the most useful spec for their
training, and this is what stops it being usable: with the phone locked in a
bag, the watch stalls after the first tick of each rest. Every set of a real
workout hits it.

## Users and scenarios

- **Phone in the bag, whole session.** The person ticks a set on the watch,
  rests, and when the rest ends the watch already shows the next set — and the
  one after that — without the phone ever being opened.
- **Ready early.** Two minutes into a three-minute rest the person is ready,
  taps Skip rest on the watch, and the next set is there at once.
- **Back at the phone.** At the end of the session the person opens the phone
  and finds every set they ticked on the watch done, with the reps they chose,
  in the order they did them.

## Scope

### In scope
- The watch moving on to the next set to do when a rest ends, and right after a
  tick, using only what it already knows — whatever the state of the phone app.
- The watch showing the next set during the rest, ready for when it ends.
- A control on the watch to end the rest early.
- The phone catching up with everything done on the watch the next time it runs,
  as it does for ticks today (0025 EF-1).

### Out of scope
- Starting a workout from the watch without the phone — 0025 out of scope.
- Editing the workout's structure on the watch (adding, removing or reordering
  sets and exercises) — the phone does that; the watch follows.
- Changing the weight on the watch — 0041 out of scope, unchanged.
- Adding or taking away rest time on the watch (±15 s) — only skipping; a
  follow-up if the owner wants it.
- Records and "last time" on the watch (0032 out of scope, unchanged).

## Functional requirements

- **FR-1.** After a set is ticked on the watch, the watch MUST show the set to do
  after it — name, set position, planned values and the reps control (0041) —
  without needing the phone app to be open or running. The rest keeps counting
  beside it.
- **FR-2.** The set the watch moves on to MUST be the one the phone would have
  named: the same order, superset rounds included (0029), warm-ups first, and
  numbered as the phone numbers them (0040 FR-1).
- **FR-3.** The watch MUST be able to go through every remaining set of the
  workout this way, one after another, without hearing from the phone in
  between. A set the phone changed in the meantime replaces what the watch had
  as soon as the phone's update arrives.
- **FR-4.** The watch MUST show a control to skip the rest while one is running
  and MUST end it at once on the wrist: the countdown goes, the next set is
  offered, no rest-end buzz sounds for that rest.
- **FR-5.** Skipping the rest on the watch MUST end the same rest on the phone —
  the rest bar, the lock-screen status, the widget and the pending rest-over
  alert — as skipping on the phone does (0018, 0040 FR-3).
- **FR-6.** A rest skipped on the watch, a set ticked on the watch and the reps
  chosen there MUST all reach the phone and be applied in the order they
  happened, also when the phone app only runs later (0025 EF-1, 0041 EF-3).
- **FR-7.** When all sets are done, the watch MUST say so, as it does when it is
  told by the phone.

## Behaviour when things go wrong

- **EF-1.** When the person ticks on the watch and the phone then changes the
  workout (a set removed, an exercise reordered) before the watch's tick is
  applied, the phone's rules decide: a tick for a set that no longer exists is
  dropped, and the watch is corrected by the phone's next update (0025 EF-1).
- **EF-2.** When the phone has done the work meanwhile (the person ticked the
  same set on the phone), the tick from the watch MUST change nothing, as for
  an already-done set today (0029).
- **EF-3.** When the rest is skipped on the watch while the phone app is not
  running, the phone's own rest-over alert MAY still sound at the original time,
  because the phone cannot cancel it until it runs. When that happens it MUST
  NOT start another rest or change the workout.
  `[ASSUMPTION: accepted for now; the plan checks whether the alert can be
  cancelled or replaced from the watch's side. TODO(sdd): decide after the
  device test, if the late alert is noticeable.]`
- **EF-4.** When the watch has no further set to offer (the phone has not yet
  sent the plan beyond the current set, for example just after the workout
  started), it MUST say it is waiting for the phone, not stay blank.
- **EF-5.** A phone or watch build without this feature keeps working with the
  other: the watch waits for the phone as it does today (0041 EF-2).

## Domain impact

No new concept. The watch shows more of the **active workout** than the one set
to do; the **rest timer** gains a skip that can come from the watch. Everything
the watch logs is still logged on the phone as **performed sets** (0025: the
phone stays the source of the logged data), so no stored data changes.

## Acceptance criteria

- **AC-1.** With the phone locked in a bag, a set ticked on the watch followed by
  a full rest, then the watch shows the next set; ticking five sets in a row
  never needs the phone.
- **AC-2.** Given a superset, the order on the watch matches the order on the
  phone round by round.
- **AC-3.** Given a rest running, when Skip rest is tapped on the watch, then the
  countdown ends, the next set shows, and the phone (opened afterwards) shows no
  rest running.
- **AC-4.** Given sets ticked on the watch with the phone closed, when the phone
  app is opened, then they are done, in order, with the reps chosen on the
  watch.
- **AC-5.** Given the last set ticked on the watch, then the watch says all sets
  are done.
- **AC-6.** Given a workout just started, when the watch has not yet received the
  plan, then it says it is waiting for the phone.

## Non-functional requirements

- Needs a native rebuild of the watch app, and of the phone app if what the phone
  sends the watch changes. iOS and watchOS only; nothing changes elsewhere.
- Works with the current free developer signing (0025).
- Must not make the watch noticeably slower to open or drain more battery: the
  watch works from what it has, with no polling of the phone.

## Assumptions

- **[ASSUMPTION: "le doy a hecha en el reloj y no carga la siguiente" means the
  next set does not appear until the phone app is opened. If the *tick itself*
  is also missing on the phone, that is the queued-delivery case of 0025 EF-1 and
  FR-6 here.]**
- **[ASSUMPTION: only "skip the rest" is asked for. "Saltar descanso en reloj" has
  no other reading than the phone's skip (0018).]**
- **[ASSUMPTION: the watch shows the next set during the rest, not only after it
  ends. The owner asked for it "when the rest ends"; showing it earlier costs
  nothing and lets the person look ahead.]**

## Open decisions

None blocking. EF-3 is the one to watch on the device.

## Verified against the code (2026-10-27)

- After a tick, the watch hides the set it ticked and starts the rest itself,
  then shows nothing in the set area until the phone sends the next update. Only
  the phone app's own logic can work out the next set (superset rounds
  included), so the watch cannot move on by itself. Whether the phone app runs
  at all when a tick arrives with the phone locked is not established by
  reading the code; the owner's report (blank until the app is opened) says it
  does not in practice. The plan starts by confirming that on the device.
- The watch holds one set to do, never the sets after it.
- The requests the watch can send are: set done (with reps), pause, resume,
  finish and discard. There is no request to skip a rest.
- The phone's rest rules decide the rest after a tick, including supersets; the
  watch only starts a local countdown of the length the phone sent for that set.

## Related

- Amends: 0025 (watch app, FR-4), 0041 (reps on the watch: FR-14 "a new set to
  do starts from its own planned reps" now also applies to a set the watch
  moved on to by itself).
- Builds on: 0018 (rest and its skip), 0029 (rounds), 0040 (set numbering, no
  0:00 after a rest).
- Roadmap: docs/roadmap/08-integrations-and-platform.md, 02-rest-timer.md
- Constitution articles engaged: 1, 6, 9, 10
