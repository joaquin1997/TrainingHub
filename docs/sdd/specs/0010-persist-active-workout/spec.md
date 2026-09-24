---
id: 0010
title: Persist the active workout
status: planned
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-09-24
decided: 2026-09-24
amended: 2026-09-24
---

# Persist the active workout

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

The active workout exists only while the app is running. If the phone closes
the app in the background — which it does during long sessions with the
screen locked — every set logged so far is lost, and reopening the app shows
no workout in progress.

## Why now

The live workout status on the lock screen (spec 0012) will send people back
into the app from outside it, often after the app has been closed. Without
this, that entry point leads to a workout that no longer exists. It also closes
the known gap recorded in spec 0005 and lifts the "running app only" bound on
spec 0001's EF-4.

## Users and scenarios

- **Long session, phone locked.** Someone logs half a workout, locks the phone
  for twenty minutes, and the system closes the app. When they reopen it, they
  expect to continue exactly where they were.
- **Coming back from the lock screen.** Someone taps the workout status on the
  lock screen; the app starts from scratch and must open the same workout.
- **Shared device.** Someone signs out — or their session expires — and a
  different person signs in on the same phone; the first person's workout must
  not appear, and must not be saved under the second person's account.

## Scope

### In scope
- Keeping the active workout on the device across the app being closed and
  reopened, including every logged value, set completion, set types, notes and
  the display unit fixed at start.
- Restoring it before any screen that depends on it is shown.
- Opening the active workout without a connection when it is already on the
  device.
- Removing the stored workout when it is finished, discarded, or the person
  explicitly signs out.

### Out of scope
- Syncing the active workout to the server or across devices — there is no
  server copy of an unfinished workout today, so nothing can diverge; a
  multi-device need would change that.
- Expiring old stored workouts automatically — the person can discard them;
  revisit if stale workouts turn out to be common.
- Offline saving of a finished workout — finishing still needs the server
  (roadmap area 8, offline support).

## Functional requirements

- **FR-1.** The system MUST restore the active workout, with every value logged
  so far, after the app is closed and reopened.
- **FR-2.** The system MUST store every change to the active workout without the
  person doing anything to save it.
- **FR-3.** The system MUST restore the workout only for the person who started
  it.
- **FR-4.** The system MUST remove the stored workout when it is finished
  successfully or discarded.
- **FR-5.** The system MUST ask for confirmation before an explicit sign-out
  while a workout is in progress, and remove the stored workout if the person
  confirms.
- **FR-6.** The system MUST open an active workout that is already on the device
  without needing a connection.
- **FR-7.** The system MUST NOT lose the stored workout when the session ends
  involuntarily (expired or rejected credentials).
- **FR-8.** When someone signs in and the active workout on the device belongs
  to a different person, the system MUST discard it — whether it is in the
  running app or only in storage.

## Behaviour when things go wrong

- **EF-1.** When the stored workout cannot be read or is from an older,
  incompatible format, the system MUST discard it and start with no active
  workout, without crashing.
- **EF-2.** When the stored workout belongs to a different person, the system
  MUST discard it.
- **EF-3.** When saving a finished workout fails, the system MUST keep the
  stored workout so the person can retry, even after reopening the app.
- **EF-4.** When device storage is unavailable, the app MUST keep working with
  an in-memory workout, as it does today.
- **EF-5.** When saving a finished workout is rejected for a reason that
  retrying cannot fix (the server refuses the workout itself, not the
  connection or the session), the system MUST keep the workout, show the
  reason, and let the person discard it. A stored workout that can never be
  saved and never be removed is the failure this prevents.
- **EF-6.** When the app starts signed out, the stored workout MUST stay in
  storage untouched and be restored after the next sign-in, subject to FR-3 and
  FR-8.

## Domain impact

Changes the lifetime of the **active workout** (and its
**WorkoutSessionDraft**): from "survives navigation" to "survives the app being
closed". Invariants unchanged: at most one active workout, its routine locked
from editing until finished or discarded, unit fixed at start.

## Acceptance criteria

- **AC-1.** Given a workout with sets logged, when the app is closed from the
  app switcher and reopened, then the same workout is in progress with every
  value intact.
- **AC-2.** Given a workout in progress and no connection, when the person opens
  it, then it opens with all its data.
- **AC-3.** Given a finished or discarded workout, when the app is reopened,
  then no workout is in progress.
- **AC-4.** Given a workout in progress, when the person signs out and confirms,
  then after signing in as someone else no workout is in progress.
- **AC-5.** Given a workout in progress, when the session expires and the person
  signs in again as the same user, then the workout is still in progress.
- **AC-6.** Given a failed save on finish, when the app is reopened, then the
  workout is still in progress and can be finished again.
- **AC-7.** Given a workout in progress and an expired session, when a
  different person signs in, then no workout is in progress.
- **AC-8.** Given a finished workout the server refuses, when the person
  chooses to discard it, then no workout is in progress, including after
  reopening the app.
- **AC-9.** Given a workout in progress and a session that expired while the
  app was closed, when the app starts and the same person signs in, then the
  workout is in progress.

## Non-functional requirements

- Platform reach: iOS, Android and web (web keeps it in browser storage).
- Saving must not make logging a set feel slower.

## Assumptions

- **[ASSUMPTION: one stored workout per device is enough]** — the app allows
  one active workout, and switching people on one device is rare.

## Open decisions

None. Decided 2026-09-24: include persistence now, alongside the live workout
status (0012) and pause (0011).

## Related

- Closes the known gap in 0005; extends 0001 EF-4 beyond the running app.
- Prerequisite for 0012.
- Depends on spec 0014 (a save that can be retried without creating a
  duplicate, and that survives the routine being deleted) before the stored
  workout is switched on: persisting makes retries across restarts routine.
- Roadmap: `docs/roadmap/01-live-workout-logging.md`
- Constitution articles engaged: 1, 3, 6, 8, 9
