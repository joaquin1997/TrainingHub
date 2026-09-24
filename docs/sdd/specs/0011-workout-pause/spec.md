---
id: 0011
title: Pause the active workout
status: planned
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-09-24
decided: 2026-09-24
---

# Pause the active workout

> **No technology in this file.** See `../README.md`.

## Problem

A workout's clock cannot be stopped. An interruption — a phone call, a long
break between blocks — keeps counting, so the recorded duration overstates the
time actually spent training.

## Why now

The live workout status (spec 0012) needs a pause action, and the duration it
shows must agree with what is saved. Pause is useful on its own inside the app.

## Users and scenarios

- **Interruption.** Someone gets a ten-minute call mid-workout, pauses, then
  resumes; the saved duration excludes those ten minutes.
- **Forgot to resume.** Someone pauses and finishes without resuming; the paused
  stretch still does not count.

## Scope

### In scope
- Pausing and resuming the active workout, any number of times.
- Showing the workout as paused, with the clock stopped.
- Saving how long the workout was paused, and showing **active duration**
  (elapsed minus paused) wherever a workout's duration appears.

### Out of scope
- Pausing the rest timer — it keeps its own behaviour.
- Auto-pause on inactivity — no signal to base it on; revisit with health data.
- Editing pause time after finishing.

## Functional requirements

- **FR-1.** The person MUST be able to pause and resume the active workout.
- **FR-2.** While paused, the workout clock MUST NOT advance.
- **FR-3.** The saved workout MUST record the total paused time.
- **FR-4.** Every place showing a finished workout's duration MUST show active
  duration.
- **FR-5.** Finishing while paused MUST count the ongoing pause as paused time.
- **FR-6.** Logging sets MUST remain possible while paused.

## Behaviour when things go wrong

- **EF-1.** When a paused time larger than the elapsed time reaches the server,
  the save MUST be rejected with a clear error.
- **EF-2.** Workouts saved before this feature MUST show the same duration as
  before (no paused time).

## Domain impact

Introduces **pause** and **active duration** (new glossary terms) on the
**active workout** and on the performed **WorkoutSession**. Templates
(routines) are untouched.

## Acceptance criteria

- **AC-1.** Given a running workout, when the person pauses, then the clock
  stops and the workout shows as paused.
- **AC-2.** Given a paused workout, when the person resumes, then the clock
  continues from where it stopped.
- **AC-3.** Given a workout paused for 10 minutes during a 60-minute session,
  when it is finished, then history shows 50 minutes.
- **AC-4.** Given a paused workout, when it is finished without resuming, then
  the ongoing pause is excluded from the duration.
- **AC-5.** Given an older workout, when viewing history, then its duration is
  unchanged.

## Non-functional requirements

- Platform reach: iOS, Android, web.
- An older app bundle keeps working against the new server (paused time optional).

## Assumptions

- **[ASSUMPTION: paused time is stored as whole seconds]**

## Open decisions

None. Decided 2026-09-24: paused time does not count toward the saved duration.

## Related

- Consumed by 0012 (pause from the lock screen).
- Roadmap: `docs/roadmap/01-live-workout-logging.md`
- Constitution articles engaged: 2, 3, 5, 8
