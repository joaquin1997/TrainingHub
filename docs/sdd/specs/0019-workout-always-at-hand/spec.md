---
id: 0019
title: The workout in progress is always at hand
status: done
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-10-16
---

# The workout in progress is always at hand

> **No technology in this file.** See `../README.md`.

## Problem

Found by the owner on the device (2026-10-16):

- After leaving the workout (to look at history, an exercise, progress), the
  only way back is the card on the Routines tab.
- Starting a different routine while a workout is in progress silently opens
  the old workout instead; there is no "finish this one and start that one".
- While typing notes the keyboard covers the field and the screen does not
  scroll, so the text being written is hidden.

## Why now

These three break the flow during a real session; they are cheap compared to
the features in 0020–0028.

## Users and scenarios

- **Checking last week.** Mid-workout someone opens History to see last
  week's numbers, then taps the workout bar to go back.
- **Wrong routine.** Someone started "Torso A" by mistake, logged nothing, and
  taps "Start" on "Pierna A": asked once, Torso A is dropped and Pierna A
  starts.
- **Changed plan.** Someone did half of Torso A and wants to switch: Torso A
  is saved with what was done and the new routine starts.

## Scope

### In scope
- A workout bar visible on every screen while a workout is in progress.
- A confirmation when starting a routine while another workout is in progress.
- Text fields of the active workout stay visible above the keyboard.

### Out of scope
- Two workouts at once — at most one active workout (glossary).
- Editing a finished workout.

## Functional requirements

- **FR-1.** While a workout is in progress, every screen except the workout
  itself MUST show a bar with the routine name, the clock (running or
  paused) and, when one runs, the rest countdown (0018).
- **FR-2.** Tapping the bar MUST open the workout in progress.
- **FR-3.** Starting a routine other than the active workout's MUST ask
  first, naming both workouts, with three choices: finish the current one and
  start the new one, go back to the current one, cancel.
- **FR-4.** "Finish and start" MUST save the current workout when at least one
  set is done and discard it otherwise, then start the new routine.
- **FR-5.** Starting the active workout's own routine MUST open it without
  asking.
- **FR-6.** A text field being edited in the active workout (notes, weights,
  reps) MUST stay visible above the keyboard.

## Behaviour when things go wrong

- **EF-1.** When saving the current workout fails in "finish and start", the
  new routine MUST NOT start; the current workout stays, with the save error
  shown as on finish (spec 0014).
- **EF-2.** The bar MUST NOT cover the last item of a list or the tab bar.

## Domain impact

Reads the **active workout**. "Finish and start" uses the existing finish
rules: only **performed sets** count (0013), the **workout identity** keeps the
save idempotent (0014). New glossary term: **workout bar**.

## Acceptance criteria

- **AC-1.** Given a workout in progress, when History is opened, then the bar
  shows the routine and a running clock; tapping it opens the workout.
- **AC-2.** Given Torso A in progress with no set done, when Start is tapped on
  Pierna A and "finish and start" chosen, then Torso A is not in History and
  Pierna A is in progress.
- **AC-3.** Given Torso A with 3 sets done, the same action saves Torso A to
  History with those 3 sets.
- **AC-4.** Given the active workout, when notes are typed with the keyboard
  open, then the text being typed stays on screen.

## Assumptions

- **[ASSUMPTION: "finish and start" saves without showing the summary.]** The
  person asked to start something else; the summary is one tap away in
  History.

## Open decisions

None.

## Related

- Supersedes the redirect to the active workout from 0004/0014.
- Uses 0018 (rest countdown in the bar).
- Constitution articles engaged: 1, 2, 8.
