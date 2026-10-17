---
id: 0025
title: The workout on the Apple Watch
status: in-progress
decided: 2026-10-16
roadmap: docs/roadmap/08-integrations-and-platform.md
created: 2026-10-16
---

# The workout on the Apple Watch

> **No technology in this file.** See `../README.md`.

## Problem

Found by the owner on the device (2026-10-16):

- The calories shown do not match the watch.
- There is nothing on the watch: no clock, heart rate, calories, rest, or way
  to tick a set.
- The rest end does not buzz the watch (covered by 0018 while the phone is
  locked).

Why the calories differ (not a defect in the arithmetic): the app sums the
active energy that Health has recorded since the workout started. Without a
workout running on the watch, the watch records active energy sparsely; the
app also re-reads only once a minute and only while it is open. The watch's
Workout app measures continuously from its own start. They will only agree
when the workout itself runs on the watch.

## Why now

The owner trains with a watch on; the phone is often in a bag or on the
bench.

## Users and scenarios

- **Phone away.** Someone checks the clock, heart rate and rest on the wrist,
  ticks the set there, and feels the buzz when the rest ends.

## Scope

Two levels — the open decision chooses.

**Level 1 — the lock-screen status on the watch.** The existing live
workout status (0012) is also shown on the watch's Smart Stack: routine,
clock, calories, rest countdown (0018). Read-only. Calories keep today's
precision.

**Level 2 — a watch app.** The workout runs on the watch while it runs on the
phone: heart rate and calories measured continuously (matching the watch),
current exercise and set, tick a set, start/skip the rest, haptic at rest
end, pause/finish. The phone stays the source of the logged data.

### Out of scope
- Starting a workout from the watch without the phone.
- Editing weights/reps on the watch beyond confirming the planned values.

## Functional requirements

Level 1:
- **FR-1.** The live workout status MUST be readable on the watch with clock,
  calories (when known) and rest countdown.

Level 2 (in addition):
- **FR-2.** Starting a workout on the phone MUST start it on the watch when
  the watch app is installed, and finishing/discarding MUST end it.
- **FR-3.** The watch MUST show heart rate and active calories measured during
  the workout; the phone's figure MUST come from the same measurement.
- **FR-4.** The watch MUST show the current exercise and set, allow ticking it
  done, and run the rest with a haptic at the end.
- **FR-5.** The workout recorded in Health MUST be one workout, not two.

## Behaviour when things go wrong

- **EF-1.** When phone and watch lose contact, both keep the workout; ticks
  made on the watch are applied when they reconnect, in order.
- **EF-2.** No permission for heart rate → the rest works, heart rate is
  hidden (never 0).

## Domain impact

Level 1: none. Level 2: **active energy** becomes measured during the
workout; **live workout status** gains a second surface; a Health workout
record is written (the existing `HealthSyncRecord` metadata).

## Acceptance criteria

- **AC-1 (L1).** Given a workout in progress, when the watch's Smart Stack is
  opened, then routine, clock and rest countdown are visible.
- **AC-2 (L2).** Given a 45-minute workout, when it is finished, then the
  calories in the app equal the watch's for that workout (±5 %).
- **AC-3 (L2).** Given a running workout, when a set is ticked on the watch,
  then it shows done on the phone and the rest starts on both.

## Non-functional requirements

- Level 1: a change to the existing lock-screen extension; device rebuild.
- Level 2: a new watch app target, installed with the phone app; device
  rebuild; free signing applies to the watch as well (7-day expiry).

## Assumptions

- **[ASSUMPTION: watchOS 11 or later (the owner has an Apple Watch Ultra 2).]**

## Open decisions

None. Decided by the owner 2026-10-16: **Level 1 now, Level 2 next** — plan
and tasks deliver Level 1 first as its own shippable slice; Level 2 follows.

## Related

- 0012 (live workout status), 0018 (rest timer), 0011 (pause).
- Constitution articles engaged: 6, 9.
