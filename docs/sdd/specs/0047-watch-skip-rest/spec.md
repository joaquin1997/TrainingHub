---
id: 0047
title: Skip a rest from the watch
status: planned
roadmap: docs/roadmap/08-integrations-and-platform.md
created: 2026-11-03
---

# Skip a rest from the watch

## Problem

The person can complete sets on the watch but cannot end a rest early there.
Reaching for the phone interrupts training from the wrist. The separate
problem of the next set not appearing with the phone locked is already
covered by 0045, accepted on the devices on 2026-11-03.

## Why now

Skipping rest is the remaining watch action in the owner's checklist.
It should extend the accepted phone-led workout flow, preserving its order
and recovery behaviour.

## Users and scenarios

- **Ready early.** During a three-minute rest, the person taps Skip rest on
  the watch and sees the next set without unlocking the phone.
- **Brief disconnection.** A skip waits for the phone and must not cancel a
  different rest that has since begun.

## Scope

### In scope

- A named Skip rest action during an active rest on the watch.
- Ending that same rest across the watch, phone and live workout status.
- Safe delivery, confirmation and recovery when contact is interrupted.

### Out of scope

- Independent progression through an entire workout without the phone;
  0045 keeps the phone responsible for workout order.
- Adding or subtracting seconds, editing weights or starting workouts on
  the watch.
- Changing the owner's accepted double buzz at natural rest end (0045).

## Functional requirements

- **FR-1.** While an unpaused rest is running, the watch MUST offer a named
  Skip rest action. Without an active rest, it MUST offer no enabled skip.
- **FR-2.** A skip MUST end the targeted rest on the watch immediately and
  request the same change on the phone. With contact available and the phone
  locked, both MUST agree within five seconds without opening the phone.
- **FR-3.** The watch MUST show the same next set as the phone, preserving
  warm-up order, superset rounds and planned reps. Skipping MUST NOT mark a
  set done or change any logged measurement.
- **FR-4.** An accepted skip MUST remove that rest's phone countdown, live
  workout countdown and pending rest-end alert. The watch MUST cancel its
  own rest-end buzz for that rest.
- **FR-5.** A skip MUST identify the rest it concerns. Repeated delivery or
  delivery after that rest ended MUST change nothing; it MUST NOT end a
  newer rest or affect a different workout.
- **FR-6.** Without acknowledgement, the watch MUST show that the change is
  waiting for the phone. On reconnection, it MUST apply only a still-relevant
  skip and display the phone's authoritative workout state.

## Behaviour when things go wrong

- **EF-1.** If the phone is unreachable, the local countdown ends but its
  scheduled phone alert may still fire until the phone can process the skip.
  The watch MUST indicate the pending change rather than claim both devices
  have synchronized. No new rest or completed set may result from that alert.
- **EF-2.** If Skip coincides with natural expiry, both actions MUST leave
  the same next set and no running rest. A buzz already emitted cannot be
  undone; no additional buzz may be scheduled for that rest.
- **EF-3.** A build that cannot process skips MUST leave the workout usable,
  show that skipping requires the phone, and MUST NOT silently report success.
- **EF-4.** While the workout is paused, Skip is unavailable. Its independent
  rest countdown retains the existing behaviour of 0011; pausing workout
  time does not introduce a rest-timer pause. Resuming restores Skip only
  if a rest is still active.

## Domain impact

The rest timer gains a watch-originated skip, tied to a particular rest of
the active workout. Performed sets and workout order retain their meaning.

## Acceptance criteria

- **AC-1.** Given a running rest and a locked, connected phone, when Skip is
  tapped on the watch, then within five seconds neither device nor live
  workout status shows that rest; the same next set is available on both.
- **AC-2.** Given AC-1 before natural expiry, when the former end time passes,
  then no rest-end alert or watch buzz occurs for the skipped rest.
- **AC-3.** Given a delayed skip for rest A and a new rest B, when the phone
  receives the skip, then B keeps running and no logged set changes.
- **AC-4.** Given no contact, when Skip is tapped, then the watch ends its
  countdown and shows pending contact; reconnecting reconciles with the phone.
- **AC-5.** Given a superset or generated warm-up, when skipping its rest,
  then the next set and reps match the phone's existing ordering rules.
- **AC-6.** Given no rest or a paused workout, then no enabled skip is shown.
  Repeated taps or replay of one skip never affects a later rest.

## Non-functional requirements

- Spanish and English; an accessible named control at least 44 × 44 pt.
- Apple Watch and paired phone; retain 0045's locked-phone behaviour.
- Acceptance requires a physical phone/watch check, including reconnection.

## Assumptions

- **[ASSUMPTION: skipping a rest needs no confirmation, like the phone action.]**
- **[ASSUMPTION: five seconds matches 0045's connected-device response budget.]**

## Open decisions

None blocking. Owner reviewed and accepted this behaviour on 2026-11-03,
including one-tap skip, specific-rest synchronization and the disconnected
phone alert limitation in EF-1. Plan and tasks prepared; implementation and physical
device acceptance remain pending.

## Related

- Builds on 0018, 0025, 0029, 0041 and the accepted 0045.
- Replaces the rest-skip portion of the earlier watch draft; its independent
  progression proposal is intentionally not carried forward.
- Constitution articles engaged: 1, 6, 9, 10.
