---
id: 0024
title: Warm-up sets
status: ready
decided: 2026-10-16
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
- A general **warm-up block** at the start of a routine: mobility, cardio or
  activation items (e.g. "5 min bike", "band pull-aparts × 15") that are
  ticked off, not logged as lifting.

### Out of scope
- Plate calculator (which plates to load) — follow-up.

## Functional requirements

- **FR-1.** For an exercise with a working weight, the person MUST be able to
  add approach sets in one action.
- **FR-2.** Approach sets MUST be warm-up sets: they count toward volume and
  never toward records (0013).
- **FR-3.** Weights MUST be rounded to the nearest loadable step in the
  person's unit and never be below the empty bar.
- **FR-4.** The person MUST be able to edit or remove generated sets like any
  other.
- **FR-5.** A routine MAY have a warm-up block: an ordered list of items, each
  a name and an optional time or reps target.
- **FR-6.** In the active workout the warm-up block MUST appear first, as a
  checklist; ticking items MUST NOT start the rest timer, count toward volume,
  records or the sets-done progress.
- **FR-7.** A saved workout MUST record which warm-up items were done.

## Behaviour when things go wrong

- **EF-1.** With no working weight yet, the action explains that a weight is
  needed instead of guessing.
- **EF-2.** For a light working weight (close to the bar), fewer approach sets
  are generated, never sets heavier than the working set.

## Domain impact

Creates **warm-up sets** — no new concept. Rounding works in the **display
unit** and stores kg (Article 4). New concept **warm-up block** on **Routine**
(template) and its done items on **WorkoutSession** (performed) — separate,
per Article 2. Migration.

## Acceptance criteria

- **AC-1.** Given squats with a first working set at 140 kg, when approach sets
  are added, then they appear before it, typed warm-up, ascending, all below
  140 kg and multiples of 2.5 kg.
- **AC-2.** Given lb, the same yields multiples of 5 lb.
- **AC-3.** Given a routine with a warm-up block "5 min bike, 15 band
  pull-aparts", when the workout starts, then both appear first as a checklist,
  and ticking them changes neither the sets-done count nor the volume.

## Assumptions

- **[ASSUMPTION: the scheme is empty bar × 10, 40 % × 5, 60 % × 3, 75 % × 2,
  90 % × 1, dropping steps closer than one loadable step; bar 20 kg / 45 lb.]**
  A configurable scheme and bar weight are a follow-up.

## Open decisions

None. Decided by the owner 2026-10-16: **both** — the approach-set calculator
and a general warm-up block. Plan them as two slices (calculator first).

## Related

- 0013 (warm-ups out of records), 0021 (timed sets, for a cardio warm-up).
- Constitution articles engaged: 4.
