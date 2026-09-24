---
id: 0012
title: Live workout status on the lock screen
status: ready
roadmap: docs/roadmap/08-integrations-and-platform.md
created: 2026-09-24
decided: 2026-09-24
---

# Live workout status on the lock screen

> **No technology in this file.** See `../README.md`.

## Problem

During a workout the phone is mostly locked. To see how long they have been
training, or to pause, the person has to unlock the phone and find the app.
They also cannot see how much energy the session has burned.

## Why now

The owner asked for it (2026-09-24). Pause (0011) and a persisted workout (0010)
make it safe to act on the workout from outside the app.

## Users and scenarios

- **Between sets, phone locked.** Someone glances at the lock screen and sees
  the workout clock and calories without unlocking.
- **Interruption.** Someone pauses the workout from the lock screen when a call
  comes in, and resumes it afterwards.
- **Back to the workout.** Someone taps the status and lands on the workout in
  progress.
- **Done.** Someone taps Finish on the status; the app opens and asks them to
  confirm before saving.

## Scope

### In scope
- A live status on the lock screen and the top-of-screen area of the phone,
  shown while a workout is in progress: routine name, workout clock, active
  calories, paused state.
- Pause / Resume from the status.
- Finish from the status: opens the app on the workout and asks for
  confirmation.
- Tapping the status opens the workout in progress.
- Active calories read from the person's health data (real measurements, e.g.
  from a watch), with permission.

### Out of scope
- Calories estimated by formula — the owner chose real data.
- Finishing without opening the app — saving needs the network and validation.
- Rest timer in the status — possible follow-up.
- Android equivalent (ongoing notification) — iOS first; the code path is a
  no-op elsewhere.
- Writing the workout to the health app — separate roadmap item.
- A watch app — separate roadmap item.

## Functional requirements

- **FR-1.** While a workout is in progress, the system MUST show a live status
  outside the app with the routine name and a workout clock that keeps
  advancing without the app running.
- **FR-2.** The status MUST show active calories burned since the workout
  started, or a clear "unknown" when there is no data.
- **FR-3.** The person MUST be able to pause and resume from the status; the
  clock MUST reflect it and the app MUST show the same state when opened.
- **FR-4.** Tapping the status MUST open the workout in progress.
- **FR-5.** Finish on the status MUST open the app and ask for confirmation; on
  confirm, the workout is finished as from inside the app.
- **FR-6.** The status MUST disappear when the workout is finished or discarded.
- **FR-7.** The system MUST ask for permission to read health data before
  reading it, and MUST keep working if it is refused.

## Behaviour when things go wrong

- **EF-1.** When live statuses are disabled on the phone, the workout MUST work
  exactly as without this feature.
- **EF-2.** When health permission is refused or there is no data, calories
  MUST show as unknown, never as 0.
- **EF-3.** When the app starts with no workout in progress but a status is
  still shown, the status MUST be removed.
- **EF-4.** When the pause state differs between the status and the app, the
  most recent action MUST win.
- **EF-5.** Calories shown while the phone is locked MAY lag: they refresh when
  the app runs, and the watch syncs with a delay. The clock never lags.

## Domain impact

Reads the **active workout**, **pause** and **active duration** (0011). Adds
**active energy** (new glossary term): calories burned as measured by the
health data source, not estimated. First real implementation behind
`HealthIntegration`.

## Acceptance criteria

- **AC-1.** Given a workout starts, then within seconds the status shows the
  routine name and a running clock.
- **AC-2.** Given the phone is locked, when the person taps Pause, then the clock
  stops; when they open the app, it shows the workout paused.
- **AC-3.** Given the status, when tapped, then the app opens on the workout.
- **AC-4.** Given the status, when Finish is tapped, then the app opens and asks
  to confirm; confirming shows the workout summary.
- **AC-5.** Given health permission and watch data, when the app is opened
  mid-workout, then the calories are close to what the health app reports for
  the same period.
- **AC-6.** Given permission refused, then calories show as unknown.
- **AC-7.** Given the workout is finished or discarded, then the status is gone.

## Non-functional requirements

- Platform reach: iOS 17+ for the status and its buttons. Android and web: no
  status; nothing else changes.
- Works with the current free developer account (no push, no shared app
  containers) — verified by the spike, see `plan.md`.

## Assumptions

- **[ASSUMPTION: calories cover start → now, including paused stretches]**
- **[ASSUMPTION: permission is requested when the first workout with the status starts]**

## Open decisions

None blocking. See `TODO(sdd)` in `plan.md` for the lock-screen Face ID prompt.

## Related

- Depends on 0010 and 0011.
- Roadmap: `docs/roadmap/08-integrations-and-platform.md` (Apple Health), `02-rest-timer.md`
- `docs/codex-project-context.md` defers native health integrations "unless
  explicitly requested": the owner explicitly requested real calories.
- Constitution articles engaged: 1, 3, 6, 8, 9, 10
