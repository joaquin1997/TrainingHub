---
id: 0021
title: Timed and distance sets
status: in-progress
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-10-16
---

# Timed and distance sets

> **No technology in this file.** See `../README.md`.

## Problem

Every set is logged as weight × reps. A plank, a farmer's carry, a dead hang
or a row on the ergometer cannot be logged as what it is (time, distance).
Verified: a performed set can already hold a duration and a distance, but no
screen lets the person enter them and exercises do not say what they track.

## Why now

Owner request (2026-10-16). Common in real routines (core, carries, cardio
finishers).

## Users and scenarios

- **Plank.** 3 × 60 s, logged as time; next week it shows last time's 60 s.
- **Weighted plank / carry.** 20 kg for 40 m, or 24 kg × 45 s.
- **Rower finisher.** 500 m in 1:45.

## Scope

### In scope
- Each exercise tracks one of: weight & reps (today), reps only, time,
  weight & time, distance & time.
- Routines set targets, and the workout logs values, for that tracking.
- A countdown or stopwatch inside a timed set.
- History, summary and progress show those values.

### Out of scope
- Pace, speed, heart-rate zones.
- GPS distance.

## Functional requirements

- **FR-1.** An exercise MUST have a tracking type; existing exercises are
  weight & reps.
- **FR-2.** Creating a custom exercise MUST let the person pick its tracking
  type.
- **FR-3.** The routine editor and the active workout MUST show the fields of
  the exercise's tracking type and only those.
- **FR-4.** A timed set SHOULD offer a timer that fills the time when stopped.
- **FR-5.** Time and distance MUST NOT count toward training volume (kg); they
  have their own figures in summary, history and progress.
- **FR-6.** Records for timed exercises are the longest time; for distance,
  the longest distance (and see 0023).

## Behaviour when things go wrong

- **EF-1.** Changing an exercise's tracking type MUST NOT alter workouts
  already saved; they keep showing what was logged.
- **EF-2.** A time entered as "90" MUST be read as 90 seconds and shown 1:30.

## Domain impact

New glossary term **tracking type** on **Exercise**. **RoutineExercise**
targets and **WorkoutSet** values gain time and distance (the set already has
fields for them). **Training volume** keeps its meaning (kg only). Schema
change on exercises and routine sets → migration.

## Acceptance criteria

- **AC-1.** Given a custom "Plank" tracked by time, when a set of 60 s is
  logged and saved, then History shows 1:00 and volume is unchanged.
- **AC-2.** Given a routine with Plank 3 × 45 s, when the workout starts,
  then each set shows 0:45 as target.
- **AC-3.** Given a catalog exercise, nothing changes: weight × reps.

## Assumptions

- **[ASSUMPTION: catalog exercises start as weight & reps; a small curated list
  (planks, hangs, carries, cardio machines) gets time or distance by a data
  script.]** wger does not say what an exercise tracks.
- **[ASSUMPTION: distance is stored in metres and shown in m/km
  regardless of the weight unit.]**

## Open decisions

None.

## Related

- 0013 (performed sets), 0023 (records by type), 0020 (custom exercises).
- Constitution articles engaged: 2, 3, 4, 5.
