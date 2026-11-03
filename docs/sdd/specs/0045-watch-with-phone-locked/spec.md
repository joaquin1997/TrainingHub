---
id: 0045
title: The watch keeps going with the phone locked
status: done
roadmap: docs/roadmap/08-integrations-and-platform.md
created: 2026-11-03
---

# The watch keeps going with the phone locked

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

Found by the owner on the device (2026-11-03): with the iPhone locked, ticking
a set on the watch leaves the watch blank — the next set never appears. It
only shows up after the phone is unlocked and the app opened.

The phone is the source of the logged data (spec 0025): the watch sends the
tick and waits for the phone to say what comes next. When the phone is locked
the phone app is put to sleep within seconds, and a set ticked on the watch
does not wake it, so the tick waits on the watch until the app next runs. Spec
0025's plan anticipated this ("Phone app in the background") and left it to be
measured on the device; the measurement is in, and it fails the spec's own
scenario — *phone away, train from the wrist*.

## Why now

Training from the wrist with the phone in a bag or face-down on the bench is
the reason the watch app exists. As it is, every set needs the phone unlocked,
which defeats the watch.

## Users and scenarios

- **Phone in the bag.** The owner starts a routine on the phone, locks it and
  puts it away. Every set from then on is ticked on the watch; after each one
  the watch shows the rest and then the next set, and the phone, when unlocked
  at the end, has every set done and the workout ready to finish.
- **Phone on the bench, locked.** Same, and the lock screen's live workout
  status shows the rest started from the watch.
- **Phone out of reach.** The owner walks to another room with only the watch.
  Ticks keep queuing as today (0025 EF-1); the watch says plainly that it is
  waiting for the phone instead of showing nothing.

## Scope

### In scope
- While a workout runs on the watch, the phone app keeps working with the
  phone locked or the app in the background, so a set ticked on the watch is
  applied on the phone at once and the watch gets the next set.
- Everything the phone does for a tick made on it also happens for a tick made
  on the watch with the phone locked: the rest timer and its alert (0018), the
  live workout status (0012), the "up next" set.
- The watch telling the person, after a tick, that it is waiting for the phone
  when the next set does not arrive.
- Pause, resume and Finish requested from the watch with the phone locked
  (Finish still asks for confirmation on the phone, 0025).

### Out of scope
- The watch working out the next set on its own (carrying the whole routine)
  — it would duplicate the workout's rules (supersets, warm-ups, rests) on the
  watch; the phone stays the single source (0025).
- Starting a workout from the watch — unchanged from 0025.
- Keeping the phone app awake during a workout *without* a watch running it —
  nothing on the phone needs it today; the rest alert is already scheduled
  ahead (0018).
- Discard from the watch while the phone cannot be reached — still refused, as
  in 0035 EF-8.
- Android / Wear OS.

## Functional requirements

- **FR-1.** While a workout runs on the watch, the phone MUST apply a set
  ticked on the watch, and the watch MUST show the next set, also when the
  phone is locked and the app is not on screen, as long as phone and watch are
  in contact.
- **FR-2.** A set ticked on the watch with the phone locked MUST have the same
  effects on the phone as one ticked in the app: the set is done with its
  reps, the rest timer starts from the tick's instant and alerts when it ends,
  the live workout status shows the rest, and "up next" moves on.
- **FR-3.** Pause, resume and a Finish request made on the watch with the
  phone locked MUST reach the phone at once under the same conditions as FR-1.
- **FR-4.** When the next set has not arrived a few seconds after a tick, the
  watch MUST say it is waiting for the phone, in place of the set; it MUST NOT
  stay blank.
- **FR-5.** The phone app MUST be kept working in the background only while a
  workout runs on the watch; once the workout is finished or discarded it
  MUST go back to sleeping like any app.
- **FR-6.** The workout recorded in Health MUST still be one workout (0025
  FR-5), with the watch's heart rate and active energy.

## Behaviour when things go wrong

- **EF-1.** Phone and watch lose contact (phone out of range or switched off):
  the watch keeps the workout, ticks queue in order and are applied when they
  reconnect, as in 0025 EF-1; the watch shows the waiting message (FR-4) and
  the rest it started counts down.
- **EF-2.** The phone app was closed (swiped away, or ended by the system)
  during a workout on the watch: when the system can bring it back for the
  watch's workout, it MUST pick up the active workout where it was (0010) and
  apply the queued ticks; when it cannot, ticks wait until the app is opened,
  exactly as today. Never lost, never applied twice.
- **EF-3.** A tick arrives twice (by the live path and the queue) — it MUST be
  applied once (as 0025's replay rule).
- **EF-4.** The watch app ends or restarts mid-workout: the phone's workout
  goes on; the phone MUST NOT be kept awake for a watch workout that no longer
  runs (FR-5).
- **EF-5.** No permission for Health on the phone or the watch: the watch
  workout and the background behaviour work as far as the system allows;
  without it, behaviour is today's (ticks applied when the app opens), never
  an error shown mid-set.
- **EF-6.** The person ticks a set on the phone and on the watch at the same
  moment: each set is ticked once; the phone's order wins, as today.

## Domain impact

Reads and writes the **active workout** exactly as today; no new stored
concept. Introduces **workout on the watch** as a named term (glossary): the
phone app keeps working in the background only during one. **Live workout
status**, **rest timer** and **up next** now follow ticks from the watch with
the phone locked.

## Acceptance criteria

- **AC-1.** Given a workout started on the phone with the watch app running
  it and the phone then locked, when a set is ticked on the watch, then within
  5 seconds the watch shows the rest and, below it, the next set — without
  touching the phone.
- **AC-2.** Given AC-1, when the phone's lock screen is looked at, then the
  live workout status shows the rest started from the watch; when the rest
  ends, the wrist buzzes.
- **AC-3.** Given a whole routine ticked on the watch with the phone locked,
  when the phone is unlocked, then every set is done with the reps chosen on
  the watch, in order, and the workout can be finished.
- **AC-4.** Given the phone switched off mid-workout, when a set is ticked on
  the watch, then the watch shows that it is waiting for the phone; when the
  phone is back and the app opened, the tick is applied once.
- **AC-5.** Given the workout finished, when the phone is locked for some
  minutes, then the app is no longer running in the background (it does not
  appear as using battery in the background in the system's battery list for
  the time after the workout).
- **AC-6.** Given Pause tapped on the watch with the phone locked, when the
  phone is unlocked, then the workout shows paused from that instant.
- **AC-7.** Given a workout with no watch app, when the phone is locked, then
  everything behaves as today.

## Non-functional requirements

- Native change on the phone app: needs the native rebuild and reinstall on
  the iPhone and the watch.
- Battery: the phone app may run in the background only for the length of a
  workout on the watch (FR-5).
- iOS only (the watch app is iOS only).

## Assumptions

- **[ASSUMPTION: the owner's phone and watch run system versions recent
  enough for the phone to follow a watch workout in the background (iPhone on
  iOS 17 or later, watch on watchOS 10 or later); today: iOS 26 and an Apple
  Watch Ultra 2 on watchOS 11+.]**
- **[ASSUMPTION: "a few seconds" in FR-4 is 5 seconds — long enough not to
  flash on every normal tick.]**
- **[ASSUMPTION: the waiting message is text only, in the app's language, in
  the place of the set (no new control).]**

## Open decisions

None. Decided by the owner 2026-11-03: the rest end may buzz the wrist twice
(the watch's own buzz and the phone's rest alert passed on to the watch) —
kept on purpose to try it on the device.
`TODO(sdd): if the double buzz bothers in the device test, add a requirement
to keep only one — the owner's call after trying it.`

## Related

- Builds on 0025 (workout on the watch), 0041 (reps on the watch), 0035
  (discard from the watch), 0018 (rest timer), 0012 (live workout status),
  0010 (persist the active workout).
- Roadmap: `docs/roadmap/08-integrations-and-platform.md`
- Constitution articles engaged: 1, 6, 9 (native rebuild), 10.
