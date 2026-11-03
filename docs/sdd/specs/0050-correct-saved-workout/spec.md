---
id: 0050
title: Correct mistakes in a saved workout
status: ready
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-11-03
---

# Correct mistakes in a saved workout

## Problem

A mistyped weight or forgotten completion remains in a saved workout and
continues to affect progress, records and last performance. The owner asks
to correct mistakes after training. This deliberately relaxes the saved
history immutability described in 0005 for the owner's explicit corrections.

## Why now

Records must remain trustworthy after an input mistake. Correction is a
separate action from updating the routine used for future training (0051).

## Users and scenarios

- **Wrong weight.** Correct 100 kg to 10 kg the next day and inspect true PRs.
- **Forgotten tick.** Mark a set that was actually performed as complete.
- **Change of mind.** Leave an edit without saving; history remains unchanged.

## Scope

### In scope

- Correct saved set measurements, completion, set type and workout/exercise
  notes, including existing unilateral, time and distance measurements.
- Explicit save/cancel and consistent refresh of affected derived views.
- Existing older workouts and future per-side weights when 0049 ships.

### Out of scope

- Adding/removing sets or exercises, swapping exercises, deleting workouts,
  changing session dates or duration. These need a concrete follow-up case.
- Editing routines, catalog names, translations or another person's history.
- An edit audit timeline or revision undo.
- Rewriting health measurements, exported images or previously shared text.

## Functional requirements

- **FR-1.** The owner MUST be able to enter correction mode from saved
  workout detail, edit existing measurements/notes/type/completion and
  explicitly save or cancel. Until save succeeds, stored history stays as it was.
- **FR-2.** Leaving with unsaved edits MUST offer Save, Discard changes and
  Keep editing. Leaving without any edits MUST require no confirmation.
- **FR-3.** A save MUST retain workout identity, date, duration, exercise
  order and routine link; it MUST change neither routine targets nor other
  workouts or an active session.
- **FR-4.** Accepted corrections MUST refresh workout detail, personal
  records, progress, last performance and relevant summaries before their
  next successful display. Records in later sessions MUST be judged against
  the corrected preceding history, not frozen erroneous bests.
- **FR-5.** Only performed sets contribute according to existing rules;
  retyping a set as warm-up removes it from working-set PRs. Corrections
  MUST retain at least one performed set and validate applicable quantities.
- **FR-6.** Correcting a past session MUST NOT silently replace starting
  records already captured by a different active workout. Its live notices
  remain provisional and its saved result uses the corrected history.
- **FR-7.** Only the signed-in owner may inspect or correct the workout.
  Repeated submission of the same correction MUST NOT create a new workout.
- **FR-8.** Previously exported health data MUST stay as recorded. When a
  workout was exported, correction mode MUST explain that training edits do
  not rewrite that health entry.

## Behaviour when things go wrong

- **EF-1.** A save leaving no performed set or invalid measurements MUST
  explain the problem and retain the edit for correction.
- **EF-2.** On connectivity/server failure, edits MUST remain available for
  retry and no partial correction may appear as saved. An expired sign-in
  MUST follow 0001 without discarding the edit or showing another account's data.
- **EF-3.** If another device changed the workout, saving MUST report the
  conflict and preserve the person's pending edit for comparison or copying;
  it MUST NOT silently overwrite either version.
- **EF-4.** If the workout disappeared or is no longer accessible, the edit
  MUST NOT recreate it or overwrite another workout; explain the failed save.

## Domain impact

Saved performed training becomes explicitly correctable by its owner. The
immutability guarantee against routine edits remains. Records and progress
continue to derive from saved work; a correction is not a second session.

## Acceptance criteria

- **AC-1.** Given 100 kg entered instead of 10, when corrected and saved,
  then detail and subsequent progress/PR views use 10 kg without a duplicate
  session; later sessions' record history reflects the corrected baseline.
- **AC-2.** Given an unfinished set, when marked performed and saved, then
  its actual measurements contribute to volume and last performance.
- **AC-3.** Given an edited set, when leaving, then Save, Discard and Keep
  editing are offered. Discard restores the saved version; Keep retains edits.
- **AC-4.** Given a correction removing the last performed set or entering
  invalid weight, then saving fails visibly and no saved value changes.
- **AC-5.** Given lost connectivity or concurrent modification, then edits
  are retained and no partial save or silent overwrite occurs.
- **AC-6.** Given a workout predating this feature, then it can be corrected
  under the same rules, leaving its routine and any active workout untouched.
- **AC-7.** Given a completed set changed to warm-up, then affected PRs
  refresh; previously shared artifacts and health measurements remain intact.

## Non-functional requirements

- Spanish/English, iOS/Android/web, both themes and accessible field labels.
- Weights keep their existing storage and display-unit meaning.

## Assumptions

- Owner-confirmed initial scope: correct existing training measurements,
  completion, set types and notes; structural changes and deletion wait.
- **[ASSUMPTION: corrections do not change independently measured duration,
  heart rate or active energy and therefore do not rewrite health exports.]**

## Open decisions

Owner accepted this initial scope on 2026-11-03, including explicit save/exit
choices, derived-view refresh, preserved routine targets and unchanged health
exports. Adding/removing sets or exercises, date/duration edits and workout
deletion remain future follow-ups. No blocking decision; ready to plan,
with implementation and acceptance checks still pending.

## Related

- Reworks the earlier saved-workout correction draft; amends 0005.
- Builds on 0013, 0014, 0021, 0022, 0023, 0032 and 0001.
- Coordinates with 0049; updating a routine is separate (0051).
- Constitution articles engaged: 2, 3, 4, 8, 11.
