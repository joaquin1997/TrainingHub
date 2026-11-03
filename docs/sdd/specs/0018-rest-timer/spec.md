---
id: 0018
title: Rest timer that keeps running
status: done
roadmap: docs/roadmap/02-rest-timer.md
created: 2026-10-16
---

# Rest timer that keeps running

> **No technology in this file.** See `../README.md`.

## Problem

Found by the owner on the device (2026-10-16):

- When a rest starts the person has to scroll up to see it, and when it ends
  scroll back down to the next set.
- The rest only alerts while the app is open: with the phone locked or another
  app in front, nothing vibrates — neither the phone nor the watch.
- A rest set by hand during the workout is ignored: the next ticked set uses
  the routine's rest again.
- Rest per exercise exists in the routine, but cannot be changed for an
  exercise during the workout.

Verified in the code: the rest countdown lives only inside the active workout
screen, so it is lost when the person leaves that screen, it is not part of
the active workout, and its only alert is a vibration from the open app.

## Why now

The rest timer is used every set. It is also what the workout bar (0019), the
watch (0025) and the lock-screen status need to show.

## Users and scenarios

- **Phone on the bench, locked.** The rest ends; the phone and the watch on the
  wrist buzz.
- **Long list.** Someone ticks a set at the bottom of a long workout; the
  countdown is visible right there, and when it ends the next set to do is in
  view.
- **Heavier day.** Someone lengthens the rest of squats to 3:30 mid-workout;
  every following squat set rests 3:30.

## Scope

### In scope
- The rest countdown belongs to the active workout: it survives leaving the
  screen, closing the app (spec 0010) and is shown by the workout bar (0019)
  and the lock-screen status.
- An alert when a rest ends, also with the app in the background or the phone
  locked (the system forwards it to a paired watch).
- Rest per exercise, editable during the workout; a manual change wins.

### Out of scope
- A watch app — spec 0025.
- Rest between exercises of a superset — keeps today's rule (the rest of the
  exercise whose set was ticked).
- Custom alert sounds.

## Functional requirements

- **FR-1.** Ticking a set as done MUST start a rest with that exercise's rest:
  the one set by hand in this workout if any, otherwise the routine's,
  otherwise the default rest from Settings.
- **FR-2.** The person MUST be able to change an exercise's rest during the
  workout; it applies to every later set of that exercise in this workout and
  MUST NOT change the routine.
- **FR-3.** −15 s / +15 s / skip MUST affect only the running countdown.
- **FR-4.** While a rest runs, its countdown MUST be visible without scrolling,
  wherever the person is in the workout.
- **FR-5.** When a rest ends, the next set to do MUST be brought into view.
- **FR-6.** When a rest ends the person MUST be alerted by sound or vibration
  whether the app is open, in the background or the phone is locked.
- **FR-7.** A running rest MUST survive leaving the workout screen and
  restarting the app; it ends at the same instant it would have.
- **FR-8.** The lock-screen status SHOULD show the running rest countdown.

## Behaviour when things go wrong

- **EF-1.** When the person has not allowed alerts, the rest still runs and
  alerts inside the app; the app asks once, the first time a rest starts.
- **EF-2.** When a rest is skipped, changed, the workout is finished or
  discarded, the pending alert MUST be cancelled or moved — never fire late.
- **EF-3.** When the app is restarted after the rest already ended, no stale
  countdown is shown and no alert fires again.

## Domain impact

The **active workout** gains a running rest (when it ends, for which
exercise) and per-exercise rest overrides. Both live on the device with the
workout; nothing is saved to the server beyond the rest already recorded per
set. New glossary term: **rest timer**.

## Acceptance criteria

- **AC-1.** Given a routine rest of 2:00 for squats, when the person sets 3:30
  during the workout and ticks the next squat set, then the rest is 3:30 and the
  routine still says 2:00.
- **AC-2.** Given a running rest and the phone locked, when it ends, then the
  phone and the paired watch buzz.
- **AC-3.** Given a running rest, when the person goes to History and back,
  then the countdown kept running.
- **AC-4.** Given the last exercise of a long workout, when a set is ticked,
  then the countdown is on screen without scrolling; when it ends, the next
  set is in view.
- **AC-5.** Given a running rest, when it is skipped, then no alert fires.

## Non-functional requirements

- An alert outside the app needs a system permission and, on iOS, a native
  module: this ships with a device rebuild.

## Assumptions

- **[ASSUMPTION: the countdown is a compact bar pinned above the bottom of the
  workout screen rather than auto-scrolling to the rest card.]** Pinning
  solves "it does not go up" without moving the list under the person's thumb.
- **[ASSUMPTION: the watch buzz relies on the system forwarding the phone's
  alert, which happens only while the phone is locked or asleep.]** Buzzing
  the watch with the phone in hand needs the watch app (0025).

## Open decisions

None.

## Related

- Builds on 0005 (rest timer), 0010 (persisted workout), 0012 (lock screen).
- Consumed by 0019 (workout bar) and 0025 (watch).
- Constitution articles engaged: 6, 8, 9.
