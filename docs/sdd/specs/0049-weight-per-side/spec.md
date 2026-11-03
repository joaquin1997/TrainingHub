---
id: 0049
title: Configurable weight per side
status: ready
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-11-03
---

# Configurable weight per side

## Problem

Unilateral sets record separate reps but share one weight. When the person
uses different loads for left and right, a single value misrepresents their
training and makes volume and records unreliable. Separate weights were an
explicit follow-up in 0022 and are now requested by the owner.

## Why now

This extends the existing unilateral flow while retaining its compact
shared-weight default. It must define record and conversion behaviour before
any data changes are planned.

## Users and scenarios

- **Different loads.** Left 20 kg × 12, right 22.5 kg × 12 in split squats.
- **Same load.** A unilateral row stays at one weight and two rep counts.
- **Reuse targets.** A routine with separate side targets starts the next
  session with those targets; its saved history remains unchanged.

## Scope

### In scope

- Optional shared or separate weights for unilateral weight-and-reps
  exercises in an active workout and routine.
- Accurate history, last performance, summary, sharing, watch display,
  volume and records for both modes.
- Lossless handling of existing sessions and side values.

### Out of scope

- Per-side load for time/distance tracking, imbalance charts or coaching.
- Changing the catalog's unilateral classification.
- Editing saved sessions; 0050 owns that behaviour.
- A global catalog setting that changes other people's logging preferences.

## Functional requirements

- **FR-1.** A unilateral weight-and-reps exercise MUST offer a named choice
  of shared weight or different weight per side. Shared weight is the default.
  The choice MUST belong to that exercise occurrence in a workout or routine.
- **FR-2.** Enabling separate weights MUST copy the existing effective
  shared weight to both sides for each set, preserving reps, completion and
  type. Editing one side MUST NOT change the other.
- **FR-3.** Disabling separate weights when any set has unequal weights MUST
  show the affected values and ask the person to choose left or right as
  the shared value for each unequal set. Cancelling MUST preserve both
  weights and mode. Equal pairs may collapse without a prompt.
- **FR-4.** Changes inside a workout MUST NOT silently change its routine or
  catalog. Routine targets MUST preserve the mode and both side targets;
  starting from that routine MUST reproduce them. Last performance MUST
  identify the saved values for each side, without collapsing unequal loads.
- **FR-5.** A performed set's volume MUST sum left weight × left reps and
  right weight × right reps. Shared-weight sets MUST retain today's result.
- **FR-6.** Heaviest-weight records MUST consider each performed side;
  rep-at-weight and estimated-one-rep records MUST use weight and reps from
  the same side. They MUST NOT pair the heavier side's weight with the
  other side's reps. Best set volume MUST sum both sides. Existing unilateral
  most-reps and session-volume rules MUST remain unchanged.
- **FR-7.** History, summary, last performance, sharing and the watch MUST
  identify left and right weight/reps for separate-weight sets. Progress
  and live records MUST follow FR-5–FR-6. Shared-weight sets retain their
  existing presentation and results.
- **FR-8.** Both weights MUST follow the session's captured display unit;
  historical kg/lb display conversion MUST preserve the recorded quantities.
- **FR-9.** Existing workouts and routines MUST retain their single shared
  weight and results. Removing the catalog's unilateral flag MUST NOT erase
  or reinterpret previously saved per-side measurements.

- **FR-10.** For automatically generated approach sets, separate working
  loads MUST use the lower side's working weight as a shared warm-up target
  for the existing ramp. Existing completed/manual side-weight sets MUST NOT
  be regenerated or overwritten. Separate automatic ramps are out of scope.

## Behaviour when things go wrong

- **EF-1.** A side missing weight or reps without a usable suggestion MUST
  remain explicitly incomplete for that measurement, contribute no invented
  load/volume and earn no weighted record. A valid other side retains its
  own contribution under the performed-side rules of 0022.
- **EF-2.** An invalid weight MUST be identified at that side without erasing
  the other side. Zero weight keeps its existing meaning; negative or
  non-finite values MUST NOT be accepted.
- **EF-3.** A phone or watch unable to represent separate weights MUST NOT
  silently display the heavier load as though both sides used it or overwrite
  saved side values. It MUST request an update or show the unsupported state.
- **EF-4.** Changing mode on completed sets MUST recalculate live volume and
  record notices from the resulting values without changing completion.

## Domain impact

A unilateral performed set and a routine set target can have weight per side.
They remain different concepts: performed work versus intended training.
Records stay derived from performed sides; the better-side rule never mixes
measurements from different sides.

## Acceptance criteria

- **AC-1.** Given left 20 kg × 12 and right 22.5 kg × 12, when completed,
  then set volume is 510 kg and every saved representation retains both pairs.
- **AC-2.** Given shared 20 kg with left 10 and right 8 reps, then volume
  remains 360 kg and existing history reads as before.
- **AC-3.** Given shared 20 kg, when separate weights is enabled, then both
  sides start at 20. After changing right to 22.5, disabling asks which side
  to retain; cancelling leaves 20/22.5 intact.
- **AC-4.** Given left 20 kg × 12 and right 25 kg × 5, then no record or
  one-rep estimate uses the fictitious pair 25 kg × 12; a rep-at-weight record
  uses 12 at 20 kg or 5 at 25 kg as appropriate.
- **AC-5.** Given a routine with separate targets, when starting a workout,
  then both targets are preserved. Session-only changes leave the routine as
  saved unless explicitly updated through 0051.
- **AC-6.** Given a missing left load and a valid performed right side, then
  no left load is invented; the right side contributes its own actual volume.
- **AC-7.** Given lb display, historical data or a later catalog flag change,
  then both side measurements remain accurate and identifiable.

- **AC-8.** Given separate working targets of 20/25 kg, when previewing
  automatic approach sets, then the shared ramp uses 20 kg and existing
  completed/manual side values remain unchanged.

## Non-functional requirements

- Spanish/English, both themes and readable at 320 pt width. Large text
  may wrap; fixed row height MUST NOT hide labels or values.
- Data rollout and older-device compatibility must be planned before release.

## Assumptions

- **[ASSUMPTION: “configurable” is per exercise occurrence, retained in its
  routine targets and active session; no extra account-wide preference.]**
- Owner-confirmed: when returning unequal side weights to a shared load,
  explicitly choose which side to retain; cancellation preserves both loads.
- Owner-confirmed: automatic warm-up generation uses the lower working load
  as the common reference for both sides (FR-10).

## Open decisions

Owner reviewed on 2026-11-03 and confirmed both explicit shared-load
selection when side values differ and the lower-load reference for common
warm-ups. No blocking decisions; ready to plan. Implementation and device
acceptance remain pending.

## Related

- Reworks the earlier per-side-weight draft; amends 0022 and 0032.
- Coordinates with 0043 (shared warm-up target from FR-10),
  0048 (record explanations), 0050 and 0051.
- Constitution articles engaged: 2, 3, 4, 5, 9, 11.
