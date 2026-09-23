---
id: 0005
title: "Retro: workouts"
status: retro
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-09-23
---

# Retro: workouts

> **Retro-spec.** Records what exists so a future change has something to build
> on. The most behaviour-dense area in the app.

## What a workout is

A **WorkoutSession** is one real training session actually performed. It holds
**WorkoutExercise** entries, each holding **WorkoutSet** records with what was
actually logged: weight in kilograms, reps, set type, rest, completion time.

A session usually starts from a routine, but once started it is independent:
the routine seeds it and then stops mattering.

## Behaviour today

**Starting.** A workout starts from a routine. **At most one workout is active
at a time.** It is resumable — leaving the screen does not end it — and the
routine it came from is locked from editing until it is finished or discarded.

**Logging.** During an active workout the user can log reps and weight per set
and mark each set done; add and remove sets; add and remove exercises; reorder
both; and set a set's type (warmup, drop, failure). Each set ghosts its
previous or target values as a translucent placeholder; an unedited field logs
that placeholder value, and typing switches the field to normal text.

**Context.** Each set shows "last time" — the most recently logged values for
that exercise — so the user knows what to beat.

**Rest.** A countdown timer with presets (60/90/120s) auto-starts when a set is
marked done and vibrates twice when it finishes. Foreground only.

**Finishing.** The session is saved with its duration and optional notes, and
appears in history with a detail view. A workout with no completed set is
rejected server-side. A workout can also be discarded.

**Units.** The display unit is captured **once, at session start**. It is never
re-read from settings mid-session, so changing the preference during a workout
cannot reinterpret numbers already typed.

## Invariants worth protecting

- **One active workout, resumable.** Two concurrent sessions would make the
  edit-lock meaningless and "last time" ambiguous.
- **The unit is frozen at session start** (Article 4 sub-rule). Breaking this
  silently rewrites what the user believes they typed.
- **Storage is always kilograms.** The active-workout draft carries display-unit
  strings, converted to kg at the boundary. The draft's field name `weightKg` is
  historical and actually means "weight in the display unit" — a naming trap
  worth knowing before touching that code.
- **An unedited set logs its placeholder.** Same load-bearing behaviour as the
  routine builder.
- **A saved workout is immutable history.** Editing the routine afterwards must
  not touch it.
- **No empty workouts.** Enforced on the server, not only in the UI.

## Known gaps

- Background rest notification — needs `expo-notifications` (native dependency,
  full rebuild). Deferred; see roadmap area 2.
- The active workout lives **in memory only**. It survives navigation, not an
  app restart. This is also why spec 0001 EF-4 could only bound its guarantee
  to the running app.

`TODO(sdd): persisting the active workout draft would close both the restart`
`gap and 0001's EF-4 limitation. It is a real piece of work with its own`
`decisions (where it persists, what happens if the server's copy diverges) and`
`deserves its own spec rather than being smuggled into another change.`

## Related

- Glossary: WorkoutSession, WorkoutExercise, WorkoutSet, active workout,
  WorkoutSessionDraft
- Constitution articles engaged: 2, 3, 4
