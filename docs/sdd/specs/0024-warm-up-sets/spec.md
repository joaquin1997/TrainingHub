---
id: 0024
title: Warm-up sets
status: draft
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-10-16
---

# Warm-up sets

> **No technology in this file.** See `../README.md`.

## Problem

The owner asked for a "warm-up section" and "calculating approach sets"
(2026-10-16). Today warm-up sets exist only as a set type the person adds and
fills by hand; nothing helps work out the ramp up to the working weight.

## Why now

Every heavy compound lift starts with 3–5 approach sets; working them out
mid-session is friction.

## Users and scenarios

- **Heavy squat day.** Working weight 140 kg. One tap adds 20 × 10, 60 × 5,
  90 × 3, 115 × 2, 130 × 1 as warm-up sets before the first working set.

## Scope

### In scope
- Generating approach (warm-up) sets for an exercise from its first working
  set's weight, in the active workout and in the routine editor.
- Rounding to loadable weights.

### Out of scope
- Plate calculator (which plates to load) — follow-up.
- A general warm-up block — depends on the open decision.

## Functional requirements

- **FR-1.** For an exercise with a working weight, the person MUST be able to
  add approach sets in one action.
- **FR-2.** Approach sets MUST be warm-up sets: they count toward volume and
  never toward records (0013).
- **FR-3.** Weights MUST be rounded to the nearest loadable step in the
  person's unit and never be below the empty bar.
- **FR-4.** The person MUST be able to edit or remove generated sets like any
  other.

## Behaviour when things go wrong

- **EF-1.** With no working weight yet, the action explains that a weight is
  needed instead of guessing.
- **EF-2.** For a light working weight (close to the bar), fewer approach sets
  are generated, never sets heavier than the working set.

## Domain impact

Creates **warm-up sets** — no new concept. Rounding works in the **display
unit** and stores kg (Article 4).

## Acceptance criteria

- **AC-1.** Given squats with a first working set at 140 kg, when approach sets
  are added, then they appear before it, typed warm-up, ascending, all below
  140 kg and multiples of 2.5 kg.
- **AC-2.** Given lb, the same yields multiples of 5 lb.

## Assumptions

- **[ASSUMPTION: the scheme is empty bar × 10, 40 % × 5, 60 % × 3, 75 % × 2,
  90 % × 1, dropping steps closer than one loadable step; bar 20 kg / 45 lb.]**
  A configurable scheme and bar weight are a follow-up.

## Open decisions

- **[NEEDS DECISION: does "warm-up section" mean (a) only the approach-set
  calculator above, or also (b) a general warm-up block at the start of a
  routine (mobility, cardio, activation exercises) that is not logged as
  lifting?]** (b) is a separate, larger feature.

## Related

- 0013 (warm-ups out of records), 0021 (timed sets, for a cardio warm-up).
- Constitution articles engaged: 4.
