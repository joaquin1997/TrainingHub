---
id: 0022
title: Unilateral exercises (left / right)
status: ready
decided: 2026-10-16
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-10-16
---

# Unilateral exercises (left / right)

> **No technology in this file.** See `../README.md`.

## Problem

Single-arm or single-leg exercises (Bulgarian split squat, one-arm row) are
done per side, often with different reps. Today a set is one weight and one
rep count, so the person either logs one side or adds them up.

## Why now

Owner request (2026-10-16). Low urgency: works around today by logging one
side.

## Users and scenarios

- **Imbalance.** Someone does 10 reps left and 8 right on split squats and
  wants to see both, and see the gap close over weeks.

## Scope

### In scope
- Marking an exercise as unilateral.
- Logging left and right for its sets.
- Volume and records counting both sides.

### Out of scope
- Different weights per side within one set — same weight for both sides; follow-up if needed.

## Functional requirements

- **FR-1.** An exercise MAY be marked unilateral.
- **FR-2.** Each set of a unilateral exercise MUST show left and right side by
  side in one row and record them separately.
- **FR-3.** Training volume MUST count both sides.
- **FR-4.** "Last time" placeholders MUST be per side.

## Behaviour when things go wrong

- **EF-1.** A side left empty counts as not done for that side.

## Domain impact

New glossary term **unilateral exercise** on **Exercise**; **WorkoutSet** gains
per-side values (left and right in the same set). Migration.

## Acceptance criteria

- **AC-1.** Given split squats marked unilateral, when 10 L / 8 R at 20 kg are
  logged, then History shows both and volume is 360 kg.

## Assumptions

- **[ASSUMPTION: estimated 1RM and records use the better side.]**

## Open decisions

None. Decided by the owner 2026-10-16: **one row per set with left and right
values side by side.**

## Related

- 0021 (tracking types), 0023 (records).
- Constitution articles engaged: 2, 3, 5.
