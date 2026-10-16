---
id: 0023
title: Personal records by type
status: ready
roadmap: docs/roadmap/04-progress-and-prs.md
created: 2026-10-16
---

# Personal records by type

> **No technology in this file.** See `../README.md`.

## Problem

The owner reported that maximum weight and reps are not shown (2026-10-16).
Verified: a record is only "heaviest set ever". Beating your best reps at a
weight, your best single-set volume or your best session volume is never
recognised, and the screens show no "best reps" or "best volume" figure.

## Why now

Progress and motivation depend on seeing records beyond weight, especially in
hypertrophy ranges where the weight stays and reps go up.

## Users and scenarios

- **More reps, same weight.** 100 kg × 8 after 100 kg × 6 last month: a
  record.
- **Big session.** 12,000 kg of bench volume, the most ever: a record.

## Scope

### In scope
Record types, per exercise, from performed working sets (0013):
- **heaviest weight** (today's record);
- **most reps in one set** (and most reps at a given weight — see FR-2);
- **best set volume** (weight × reps in one set);
- **best session volume** (sum over the session);
- **best estimated 1RM**.

Shown in the exercise progress screen (current best of each type with date),
in the workout summary and History (which records a session beat), and in the
progress overview (record marker).

### Out of scope
- Records for time/distance — 0021 adds them with the same mechanism.
- Notifications or celebrations beyond a marker.

## Functional requirements

- **FR-1.** Each record type MUST be derived from performed working sets only;
  warm-up sets never count (0013).
- **FR-2.** "Most reps" MUST be shown overall and at the person's heaviest
  weights (best reps per weight).
- **FR-3.** The exercise progress screen MUST show the current best of each
  type with its date.
- **FR-4.** A finished workout's summary and its History entry MUST name the
  records it beat.
- **FR-5.** Records MUST be shown in the display unit (Article 4).

## Behaviour when things go wrong

- **EF-1.** The first session of an exercise MUST NOT be announced as beating
  records (there was nothing to beat).
- **EF-2.** Deleting or editing history is out of scope; records are derived,
  so they follow whatever is stored.

## Domain impact

Extends **Personal record (PR)**: now one per record type. Still derived,
never stored. New glossary term: **record type**.

## Acceptance criteria

- **AC-1.** Given 100 kg × 6 then 100 kg × 8, when the second session is
  saved, then its summary says "most reps at 100 kg" and the exercise screen
  shows 8 reps.
- **AC-2.** Given a session with the highest total volume for an exercise,
  then its History entry shows a session-volume record.
- **AC-3.** Given a warm-up set heavier than any working set, then no record.

## Assumptions

- **[ASSUMPTION: "most reps at a weight" is shown for the person's top three
  weights, not every weight ever used.]**

## Open decisions

None.

## Related

- 0006 (progress), 0013 (performed work), 0021 (time/distance records).
- Constitution articles engaged: 3, 4.
