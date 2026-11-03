---
id: 0051
title: Offer to update the routine after training
status: ready
roadmap: docs/roadmap/05-routines-advanced.md
created: 2026-11-03
---

# Offer to update the routine after training

## Problem

During training the person adjusts targets or changes exercises, but those
choices do not become the next session's routine. They want an explicit
offer to keep useful changes after finishing, while retaining an accurate
record of what they actually performed.

## Why now

The owner confirmed that “guardar cambios después” means offering to update
the routine, rather than another workout-save confirmation.

## Users and scenarios

- **New working load.** Finish with 62.5 kg instead of the routine's 60 kg
  and choose whether 62.5 becomes the next target.
- **One-off variation.** Replace a busy machine for one day, save the workout
  and decline to change the routine.
- **Routine changed elsewhere.** Review the current routine rather than
  overwrite another device's edits with an old session's snapshot.

## Scope

### In scope

- An optional offer after a successful workout save when its source routine
  has eligible differences from the routine captured at session start.
- A review of eligible exercise/target changes with explicit confirmation.
- Saving the routine independently of the already saved workout.

### Out of scope

- Automatically changing routines from workout results or PRs.
- Copying completion, actual rests, session notes, timestamps, calories or
  other performed-only information into targets.
- Creating a routine from a workout with no surviving source routine.
- Correcting saved training; 0050 handles that separately.
- General merge tools or editing other routines from this offer.

## Functional requirements

- **FR-1.** After the workout is successfully saved, the person MUST receive
  an optional offer to review routine changes if eligible differences exist.
  With no eligible difference, no offer is shown. Declining MUST leave the
  routine unchanged and MUST NOT undo or repeat the workout save.
- **FR-2.** Eligible differences MUST include added/removed/replaced/reordered
  exercises and changes to set count, compatible set types and target
  weight/reps/time/distance, including unilateral targets where supported.
  Untouched suggestions MUST NOT count as edits. Completion alone MUST NOT
  remove unperformed exercises or sets from a routine.
- **FR-3.** Review MUST show the routine name and before/after differences,
  allowing the person to select which compatible changes to retain before
  one explicit Update routine action. Default selection is all eligible changes.
- **FR-4.** Completed set values explicitly changed during the workout may
  be proposed as future targets, but MUST be labelled as targets in review.
  Actual completion, recorded rest duration and session timing MUST NOT
  become routine instructions.
- **FR-5.** Generated approach sets MUST NOT automatically become permanent
  routine sets. Manually added warm-up sets may be proposed. Set types the
  routine cannot represent MUST be labelled as excluded, never silently
  converted into another type.
- **FR-6.** Updating MUST affect only the owned source routine's future
  targets. Saved workout values, PRs, history and other routines MUST remain
  unchanged. A future workout MUST start with the accepted routine changes.
- **FR-7.** If the routine changed since the workout began, review MUST show
  the newer version and require a fresh selection against it. Confirmation
  MUST NOT overwrite unseen edits made after that review.
- **FR-8.** The saved-workout summary MUST remain accessible whether the
  person updates, declines or encounters a routine-update failure. Multiple
  taps MUST NOT create duplicate exercises or sets.

## Behaviour when things go wrong

- **EF-1.** A workout save failure MUST NOT offer or apply a routine update.
  Retrying the workout save MUST retain its original identity.
- **EF-2.** A routine update failure MUST keep the review and selected edits
  for retry, make clear the workout is already saved, and offer leaving the
  routine unchanged.
- **EF-3.** A deleted or inaccessible routine MUST NOT be recreated or
  replaced automatically; show that it cannot be updated and retain history.
- **EF-4.** A draft started before its original routine could be retained
  MUST NOT guess a difference against today's routine. Explain that the
  comparison is unavailable and leave its routine unchanged.
- **EF-5.** Signing out MUST hide pending review from other accounts. An
  authentication rejection MUST follow the existing reauthentication flow.

## Domain impact

A comparison relates the routine's original intended training, the session's
explicit changes and the routine now saved. Confirmed changes produce new
routine targets; performed history remains separate and authoritative.

## Acceptance criteria

- **AC-1.** Given a routine target of 60 kg explicitly changed to 62.5 during
  training, when the workout saves, then an offer opens a review of 60 → 62.5;
  confirming makes 62.5 the next target while preserving the saved session.
- **AC-2.** Given that same offer, when declined, then the workout remains
  saved and the next routine workout still targets 60 kg.
- **AC-3.** Given only completion changes or untouched suggestions, then no
  routine-update offer appears. Unticked sets are not proposed for removal.
- **AC-4.** Given an explicit exercise replacement and generated warm-ups,
  then review offers the replacement but excludes generated warm-ups; manual
  warm-ups may be selected and unsupported types are visibly excluded.
- **AC-5.** Given workout-save failure, then no routine changes are applied.
  Given a later routine-update failure, then the workout remains saved and
  review supports retry without duplicating its sets.
- **AC-6.** Given the routine edited from another device, when reviewing,
  then the new values are visible and must be selected anew. A subsequent
  conflicting edit is reported instead of overwritten.
- **AC-7.** Given a deleted source routine or an older draft with no original
  comparison, then no automatic recreation or overwrite occurs.

## Non-functional requirements

- Spanish/English, iOS/Android/web and both themes; differences must be
  readable with large text and without relying only on color.
- Failure to update a routine must not require repeating saved training.

## Assumptions

- **[ASSUMPTION: review comes after successful workout saving, so preserving
  performed training never depends on acceptance of new routine targets.]**
- **[ASSUMPTION: changes to set count and exercise selection are eligible;
  generated warm-ups and unsupported types remain explicitly excluded.]**
- **[ASSUMPTION: the offer is made once per completed session; declining does
  not create a recurring reminder. General routine editing remains available.]**

## Open decisions

Owner reviewed and accepted the proposed flow on 2026-11-03, including all
compatible changes selected initially with the ability to deselect one-off
changes. Workout saving precedes the optional routine update; generated
approach sets remain excluded. No blocking decision; ready to plan, with
implementation and acceptance checks pending.

## Related

- Builds on 0004, 0014, 0020, 0022, 0024, 0029 and 0043.
- Coordinates with 0049 and 0050; amends the finish-to-summary flow only.
- Constitution articles engaged: 1, 2, 3, 4, 11.
