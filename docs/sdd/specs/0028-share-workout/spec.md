---
id: 0028
title: Share a workout
status: done
roadmap: docs/roadmap/07-social.md
created: 2026-10-16
---

# Share a workout

> **No technology in this file.** See `../README.md`.

## Problem

There is no way to send a finished workout to someone (a coach, a training
partner, a chat). The owner asked for a share option (2026-10-16).

## Why now

Cheap, and the first step of roadmap area 7 without accounts talking to each
other.

## Users and scenarios

- **Coach check-in.** After training someone sends today's session to their
  coach on WhatsApp.

## Scope

### In scope
- Sharing a finished workout as text through the phone's share sheet, from
  the summary and from the workout detail.

### Out of scope
- An image card of the workout — follow-up (needs drawing a view to an image).
- Sharing routines, links that open in the app, a feed — roadmap area 7.

## Functional requirements

- **FR-1.** The summary and the workout detail MUST offer "share".
- **FR-2.** The shared text MUST contain date, routine, duration, volume, and
  each exercise with its done sets (weight × reps, type), in the person's
  language and unit.
- **FR-3.** Records beaten (0023) SHOULD be marked when known.

## Behaviour when things go wrong

- **EF-1.** Cancelling the share sheet does nothing.

## Domain impact

Reads a **WorkoutSession**. Nothing new.

## Acceptance criteria

- **AC-1.** Given a saved workout, when share is tapped and Notes chosen, then
  the note contains the date, every exercise and its done sets, in the app's
  language and unit.

## Assumptions

- **[ASSUMPTION: unticked sets are left out of the shared text.]**

## Open decisions

None.

## Related

- 0023 (records), roadmap area 7.
- Constitution articles engaged: 4.
