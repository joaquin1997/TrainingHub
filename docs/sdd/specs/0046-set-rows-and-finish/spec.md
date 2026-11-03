---
id: 0046
title: Set rows that read right, undo that selects, Finish within reach
status: ready
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-11-03
revises-draft: 2026-10-27
---

# Set rows that read right, undo that selects, Finish within reach

## Problem

Three small frictions in the active workout, reported by the owner and carried forward from the earlier draft:

1. **A ticked set still looks half-done.** When a set is ticked without typing
   its weight (the ghosted suggestion is taken as logged), that figure stays in
   the pale "suggestion" colour while the reps the person did type are in full
   colour. In the same row, "180" is grey and "13" is white. The row is done,
   but it reads as if part of it were still a suggestion, and the person cannot
   tell at a glance what was logged and what was only proposed.
2. **Undoing a set does not bring the person back to it.** Unticking a set
   leaves the "next set" marker where the last tick put it. If the mistaken tick
   was on an earlier exercise, nothing points back at the set to redo; the
   person scrolls to find it.
3. **Finish is at the very bottom.** The only way to save the workout from the
   screen is the button after the last exercise. With eight exercises that is a
   long scroll, every time, at the end of a session when the person is tired.

## Why now

All three come from one real session and cost a little on every set or every
workout. They are cheap, they touch the same screen, and they are the owner's
direct feedback from using the app.

## Users and scenarios

- **Taking the suggestion.** The person does 47 kg × 15 as suggested, types
  nothing, ticks the set. The row now shows 47 and 15 the same way as if they
  had typed them.
- **Wrong tick.** The person ticks the set of the wrong exercise, notices two
  exercises later, and unticks it. The app now treats that set as the one to do
  next, and the person goes straight to it.
- **Last set done.** The person finishes the last set and wants to save without
  scrolling to the bottom of a long workout.

## Scope

### In scope
- A done set shows every logged value in full-strength text, whether it was
  typed or taken from the ghosted suggestion.
- Unticking a set makes it the set to do (**up next**) and cancels an active
  rest only when that exact set completion started it.
- A Finish action reachable at the top of the active workout, without scrolling.

### Out of scope
- Naming and explaining the set types — spec 0043 (FR-10, FR-11) replaces the
  blind cycle with named, explained choices.
- Cancelling rests started by other sets or changing configured rest lengths.
- A second way to save a workout in progress. The active workout already
  survives closing the app (0010); "Finish" is the only save there is.
- Any change to what is saved, to records or to "last time".
- The ghosted look of sets *not yet done* — unchanged, it is how a suggestion is
  told from a logged value.

## Functional requirements

- **FR-1.** A set marked done MUST show each of its values (weight, reps, time,
  distance, both sides of a unilateral set) in the same full-strength text
  colour, whether the value was typed or is the ghosted suggestion that gets
  saved for it (0013 FR-6).
- **FR-2.** A set that is not done MUST keep showing an unedited value as a
  ghosted suggestion, as today.
- **FR-3.** Unticking a done set MUST make that set the **up next** set, so the
  up-next marker, the compact header, the rest bar's "next" text, the rest-over
  alert and the watch name it.
- **FR-4.** When several sets are unticked in turn, the **most recently
  unticked** one MUST be the up-next set; ticking it again MUST put up next
  where a tick puts it today.
- **FR-5.** The active workout MUST offer a Finish action at the top of the
  screen, in view without scrolling, that does exactly what the Finish button at
  the bottom does today: same checks (at least one set done), same save, same
  errors, same summary.
- **FR-6.** The top Finish action MUST NOT save anything by accident: it asks
  for confirmation the same way the lock-screen Finish does (0012 FR-5).
  `[ASSUMPTION: confirmation, because a header button sits next to the Back
  button and is easy to hit by mistake; the bottom button, which needs a scroll
  to reach, keeps asking nothing as today.]`
- **FR-7.** While the workout is being saved the top Finish action MUST show it
  is working and MUST NOT be usable a second time, as the bottom button does.

- **FR-8.** The selection after undo MUST survive leaving and reopening the
  workout. Removing the selected set MUST restore the usual next-set order.
  Undoing MUST preserve all entered values and remove any live record earned
  by that set until it qualifies again after completion.

- **FR-9.** Unticking a set MUST cancel the active rest only if it was started
  by that set's completion being undone, including a rest currently paused.
  Cancellation MUST remove that rest's countdown and pending rest-end alert
  and update the phone, live workout status and connected watch. The watch
  MUST cancel its pending local buzz for that rest when it receives the change.
  A rest started by another set MUST retain its remaining time and alert;
  only the announced up-next set may change. The same rule applies when the
  undone completion started a superset round's rest.

## Behaviour when things go wrong

- **EF-1.** When Finish is used with no set done, the top action MUST show the
  same notice as the bottom one (mark at least one set) and save nothing.
- **EF-2.** When saving fails, the error and the "discard" choice for a
  permanently rejected workout (0010 EF-5) MUST be shown where the person can
  see them, wherever Finish was tapped from.
- **EF-3.** When the set just unticked is in a superset, up next MUST follow the
  superset's round order (0029): the unticked set is next only when it belongs to
  the lowest unfinished round, otherwise the round's own order wins.
  `[ASSUMPTION: round order beats "most recently unticked" inside a superset, so
  the rest-per-round rule of 0029 is never broken.]`
- **EF-4.** With no active rest, or a rest whose originating completion
  cannot be established (for example an older restored workout), unticking
  MUST NOT cancel a rest by guessing from the exercise name or position.
  A delayed/repeated cancellation MUST NOT cancel a newer rest, including a
  newer rest from completing the same set again.
- **EF-5.** If the watch is disconnected when the phone cancels the rest,
  it MUST converge to the phone's current rest/selection on reconnection.
  A local buzz may already have occurred before the watch receives the change;
  no new buzz may be scheduled for the cancelled rest after it is received.

## Domain impact

Presentation of the **active workout** (the session being logged) and the rule
for **up next**. No new stored training concept or change to records. Up next gains an explicit
selection after undo: the latest unticked set takes priority, subject to
superset round order. Without that selection, the existing order applies.
The active rest must be attributable to the particular set completion that
started it so undo cannot cancel an unrelated or newer rest. Configured rest
lengths and historical performed training keep their meaning.

## Acceptance criteria

- **AC-1.** Given a set with a ghosted weight of 180 and reps typed as 13, when
  it is ticked, then 180 and 13 are the same colour and weight of text.
- **AC-2.** Given the same set, when it is unticked, then 180 is ghosted again
  and 13 stays as typed.
- **AC-3.** Given exercise 2's third set ticked while the person is on exercise
  5, when they untick it, then it is the up-next set in the row, the compact
  header and the rest bar.
- **AC-4.** Given two sets unticked one after the other, then the second one
  unticked is up next.
- **AC-5.** Given a workout of eight exercises scrolled to the top, then Finish
  is visible and tapping it asks for confirmation; confirming saves the workout
  and shows the summary.
- **AC-6.** Given no set done, when Finish is tapped at the top, then the usual
  notice appears and nothing is saved.
- **AC-7.** Given a failed save started from the top, then the error is visible
  without scrolling to the bottom.

- **AC-8.** Given a set selected by undo, when the app is reopened, then that
  selection remains; removing it chooses the next valid unfinished set.

- **AC-9.** Given set A just completed and its rest running, when A is
  unticked, then its countdown disappears on the phone, live workout status
  and connected watch, and no alert/buzz occurs at its former end time.
  A paused rest from A is also cancelled; entered values remain intact.
- **AC-10.** Given an earlier set A completed and a rest now running from
  set B, when A is unticked, then B's remaining time and alert stay unchanged,
  even when A and B belong to the same exercise.
- **AC-11.** Given the completion that started a superset round's rest,
  when that completion is undone, then its rest is cancelled and up next
  follows round order. Replaying the cancellation after a new completion
  MUST NOT stop the new rest. An older restored rest without known origin
  remains unchanged rather than being matched by exercise alone.

## Non-functional requirements

- Both themes (0038): "full-strength" is the theme's normal text colour, not
  literally white.
- Accessibility (0034): the top Finish action is at least 44 × 44 pt, has an
  accessible name, and works with the largest text size without covering the
  Back button or the title.
- iOS, Android and web. No native rebuild expected.

## Assumptions

- **[ASSUMPTION: "poner blanco el número" means every logged figure of a done
  set, not only the weight; in the light theme, the normal text colour.]**
- **[ASSUMPTION: "botón de guardar arriba" is the Finish action. The workout
  saves itself on the device as it goes (0010); the only save the person means is
  the one that sends it to History.]**

## Open decisions

None blocking. Owner review on 2026-11-03 confirmed cancelling an active
rest only when it came from the set completion being undone; rests from
other sets remain untouched. Other presentation assumptions remain reversible.

## Related

- Builds on: 0034 (set status area, up next, compact header), 0029 (rounds),
  0013 (the ghosted value is what gets saved), 0019 (workout always at hand),
  0018 (rest lifecycle) and 0045 (phone/watch synchronization).
- Companion: 0043 explains each set type in its picker.
- Roadmap: docs/roadmap/01-live-workout-logging.md
- Constitution articles engaged: 1, 8
