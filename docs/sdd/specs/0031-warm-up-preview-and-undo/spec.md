---
id: 0031
title: Warm-up sets — preview, mark and undo
status: done
amends: 0024
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-10-17
---

# Warm-up sets — preview, mark and undo

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

Spec 0024 added a one-tap action that adds approach (warm-up) sets ahead of an
exercise's first working set. In the owner's device test (2026-10-17) the tap
felt blind: sets appear without warning, nothing tells them apart from
warm-ups the person typed, and there is no way back except deleting them one by
one. The owner's words: *"Si se le da al botón de calentamiento, debería haber
un aviso de lo que se va a crear, marcarlos de alguna manera y si se le da al
botón quitar esos creados de nuevo."*

On top of that, adding approach sets shifts every later set down, and "last
time" values are paired by set position, so the working sets then show last
time's values for the wrong sets.

## Why now

0024 is code complete and awaiting its device checks; this is the feedback
from those checks. Changing the behaviour now, before the routine side is in
regular use, avoids routines full of generated warm-ups that cannot be told
apart from hand-typed ones.

## What exists today (verified in the code, 2026-10-17)

- One tap on the warm-up action of a weight-and-reps exercise works out the
  approach sets from the first working set's weight (typed, or else its
  ghosted value) and inserts them straight away, typed as warm-ups with their
  weight and reps filled in. No preview, no confirmation.
- Tapping again **replaces** every warm-up set ahead of the first working set
  that is not done — including warm-ups the person typed — and keeps the done
  ones. There is no "remove" action.
- Once inserted, a generated set is indistinguishable from any other warm-up
  set: same marker, same appearance, nothing remembered about its origin.
- With no working weight, or one too close to the empty bar, a short notice
  is shown instead (0024 EF-1, EF-2). This stays.
- In the routine editor the same action replaces **all** warm-up rows ahead of
  the first working row with freshly generated ones. A saved routine records
  only that a set is a warm-up.
- "Last time" values — the ghosted placeholders and the "previous" column —
  pair each set with last time's set at the same position, whatever its type.
  After five approach sets are inserted, the first working set is paired with
  last time's sixth set. The same root cause is the backlog follow-up
  "warm-up taken as last time's first set" (found in 0023).

## Users and scenarios

- **Check before adding.** The owner taps the warm-up action on squats with a
  140 kg working set and sees "20 × 10, 55 × 5, 85 × 3, 105 × 2, 125 × 1 —
  from 140 kg" before anything changes. They confirm and the sets appear.
- **Changed their mind.** On a light day they tap the action, add the sets,
  then decide to skip the ramp. Tapping the same action again removes the
  generated sets; the working sets are untouched.
- **Own warm-up kept.** They typed "20 × 15" as a warm-up by hand, then add
  the generated ramp. Their own set is still there after adding and after
  removing the generated ones.
- **Ramp half done.** They have ticked the first two generated sets and decide
  to stop warming up. Tapping the action removes the three not-done generated
  sets; the two they did stay, because they were performed.
- **Tweaked one.** They change the generated 85 × 3 to 80 × 3. That set is now
  theirs: it loses the generated mark and is not removed with the others.
- **Routine template.** In the routine editor they add the ramp to the bench
  press, save, and reopen the routine a week later. The generated rows are
  still marked and the action still removes them.
- **Right "last time" after the ramp.** After adding approach sets, the first
  working set still shows last time's first working set as its "previous" and
  ghosted value.

## Scope

### In scope
- A preview of the sets about to be added, with confirm and cancel, in the
  active workout and the routine editor.
- A visible mark on generated warm-up sets, distinct from warm-ups the person
  added or typed.
- The warm-up action as a toggle: add when there is nothing generated to
  remove, remove the generated sets otherwise.
- Rules for generated sets that were edited, done, re-typed or removed.
- Keeping the mark across an app restart during a workout, in saved routines,
  and from a routine into a workout started from it.
- Pairing "last time" values by kind: warm-ups with warm-ups, working sets
  with working sets.

### Out of scope
- Changing the scheme, the bar weight or the rounding — 0024's assumptions
  stand; a configurable scheme is still a follow-up.
- Recalculating generated sets automatically when the working weight changes —
  removing and adding again does it in two taps.
- Keeping the mark in a saved workout or showing it in History — once a
  workout is saved, how a set was entered does not matter (see Assumptions).
- An undo for single edits, or a general undo history.
- The plate calculator (0024 follow-up).
- The watch and the lock-screen status (0012, 0025): they keep showing the
  sets as warm-ups, without the generated mark.
- Approach sets for unilateral exercises beyond what 0024 does (one set per
  row) — 0022's call.
- "Last time" rules beyond warm-up vs working (e.g. pairing drop sets with
  drop sets) — drop and failure sets are working sets (glossary).

## Terms

- **Generated warm-up set.** A warm-up set added by the warm-up action and not
  changed since, other than being marked done. A set stops being generated —
  for good — when the person changes one of its values or its set type. The
  term is proposed for `glossary.md` (coordinator).

## Functional requirements

### Preview and confirm

- **FR-1.** When the warm-up action adds sets, the system MUST first show what
  it will add — each set's weight and reps in the display unit, lightest first
  — and the working weight they were worked out from. Nothing changes until
  the person confirms.
- **FR-2.** Cancelling, or dismissing the preview any other way, MUST leave
  the exercise exactly as it was.
- **FR-3.** On confirm, exactly the sets shown MUST be added, typed as
  warm-ups, right before the first working set, after any warm-up sets
  already there.
- **FR-4.** The warm-up action MUST NOT remove or change any set when adding.
  Warm-ups the person typed, and generated warm-ups already done, stay where
  they are. When the exercise already has warm-up sets ahead of the first
  working set, the preview MUST say they will be kept.
- **FR-5.** With no working weight, or one too close to the empty bar, the
  action MUST keep showing 0024's notices instead of a preview.

### Mark

- **FR-6.** Generated warm-up sets MUST be visibly marked as generated,
  distinguishable at a glance from warm-up sets the person added or typed, and
  still recognisable as warm-ups.
- **FR-7.** A generated warm-up set MUST lose its mark, permanently, when the
  person changes any of its values (weight, reps, or a side's reps) or changes
  its set type. Marking it done or not done MUST NOT remove the mark.
- **FR-8.** Generated warm-up sets MUST otherwise behave like any warm-up set:
  editable, removable one by one, counted in the sets-done progress, starting
  the rest timer when ticked, counted toward volume and never toward records
  (0013, 0024 FR-2).

### Toggle

- **FR-9.** When an exercise has at least one generated warm-up set that is
  not done, the warm-up action MUST show that it will remove them, and tapping
  it MUST remove every generated warm-up set of that exercise that is not
  done, without a preview.
- **FR-10.** Removing MUST NOT touch sets the person typed, generated sets
  that lost their mark (FR-7), or generated sets that are done.
- **FR-11.** Otherwise — no generated sets, or only done ones — the warm-up
  action MUST add, with the preview (FR-1).
- **FR-12.** The action's two states MUST be distinguishable without relying
  on colour alone, including for screen readers (e.g. "Add warm-up sets" vs
  "Remove generated warm-up sets").

### Routine editor

- **FR-13.** The routine editor MUST offer the same preview, mark and toggle
  (FR-1 to FR-12), where "done" does not apply: removing removes every
  generated row that still carries the mark.
- **FR-14.** A saved routine MUST keep which of its warm-up sets are
  generated, so reopening the editor shows the mark and the action can remove
  them. Duplicating a routine MUST keep the mark.
- **FR-15.** A workout started from a routine MUST bring the mark along: its
  generated routine warm-ups are generated warm-up sets in the workout, which
  the person can remove with the action and add again from today's working
  weight.

### Persistence

- **FR-16.** The generated mark MUST survive the app being closed and
  reopened during an active workout (0010).
- **FR-17.** A saved workout MUST record generated warm-up sets as ordinary
  warm-up sets; the mark is not part of the performed record.

### "Last time" pairs by kind

- **FR-18.** "Last time" values for a set — its ghosted placeholder and its
  "previous" value — MUST come from last time's set of the same kind at the
  same position within that kind: the n-th warm-up set pairs with last time's
  n-th warm-up set, the n-th working set with last time's n-th working set.
- **FR-19.** A set with no counterpart of its kind last time MUST show no
  "last time" value rather than one borrowed from the other kind.
- **FR-20.** Changing a set's type MUST re-pair it under FR-18.

## Behaviour when things go wrong

- **EF-1.** When the exercise is removed or replaced while the preview is
  open, confirming MUST add nothing and the preview MUST close.
- **EF-2.** When the first working set's weight changes while the preview is
  open, confirming MUST add exactly the sets shown (FR-3); the person can
  remove them and add again.
- **EF-3.** When only done generated sets remain and the person adds again,
  the preview MUST show the full ramp and that the done warm-ups stay
  (FR-4) — the system does not silently trim the ramp.
- **EF-4.** When every working set has been removed, removing generated sets
  MUST still work; adding shows 0024's "working weight needed" notice.
- **EF-5.** When the app is closed with the preview open, it MUST reopen with
  no preview and the exercise unchanged.
- **EF-6.** Warm-up sets added under 0024, before this change, carry no mark:
  they MUST be treated as the person's own warm-ups (kept on add and on
  remove).
- **EF-7.** A routine saved from an older version of the app loses the mark;
  its generated rows become ordinary warm-up rows (EF-6 applies).
- **EF-8.** When last time's workout has no warm-up sets (or is a legacy
  session), warm-up sets MUST show no "last time" value (FR-19), and working
  sets still pair with last time's working sets.

## Domain impact

- Introduces **generated warm-up set** (Terms): a property of a warm-up set,
  not a new set type. The set type stays warm-up for volume, records and
  progress (0013).
- **Routine** (template): a routine's warm-up sets record whether they are
  generated (FR-14). **WorkoutSessionDraft**: the active workout's warm-up
  sets record it too (FR-16). **WorkoutSession / WorkoutSet** (performed): no
  change (FR-17). Template and performed stay separate (Article 2); the mark
  is copied from routine to workout at start, as every other target is.
- **"Last time"** changes meaning: paired by kind and position within kind
  instead of by absolute position (FR-18). It needs to know which of last
  time's sets were warm-ups — saved workouts already record it.
- Weights in the preview are in the display unit; storage stays kg
  (Article 4).

## Acceptance criteria

- **AC-1.** Given squats with a first working set of 140 kg, when the warm-up
  action is tapped, then a preview lists 20 × 10, 55 × 5, 85 × 3, 105 × 2,
  125 × 1 "from 140 kg" and the exercise's sets are unchanged until confirm.
- **AC-2.** Given that preview, when it is cancelled, then the exercise has
  the same sets as before.
- **AC-3.** Given the preview confirmed, then five warm-up sets appear before
  the working set, each visibly marked as generated, and the action now reads
  as "remove".
- **AC-4.** Given a hand-typed warm-up "20 × 15" ahead of the working set,
  when generated sets are added and then removed, then "20 × 15" is still
  there, unmarked, both times; and the preview said it would be kept.
- **AC-5.** Given five generated sets with the first two done, when the action
  is tapped, then the three not-done generated sets are removed and the two
  done ones stay, still marked.
- **AC-6.** Given a generated set changed from 85 × 3 to 80 × 3, then it is no
  longer marked, and removing the generated sets leaves it in place.
- **AC-7.** Given generated sets in an active workout, when the app is closed
  and reopened, then they are still marked and the action still removes them.
- **AC-8.** Given generated sets saved in a workout, when it is opened in
  History, then they show as ordinary warm-up sets.
- **AC-9.** Given the routine editor, when the ramp is previewed, confirmed,
  the routine saved and reopened, then the generated rows are still marked and
  the action removes them; and a workout started from that routine shows them
  as generated warm-up sets.
- **AC-10.** Given last time's squats were 2 warm-ups then 3 working sets at
  100 kg, 105 kg, 110 kg, when today's squats have 5 generated warm-ups ahead
  of 3 working sets, then the working sets show 100, 105, 110 as last time and
  the first two warm-ups show last time's two warm-ups.
- **AC-11.** Given last time's first set was a warm-up at 20 kg, when a new
  workout starts, then the first working set does not show 20 kg as last time
  (closes the 0023 follow-up).
- **AC-12.** Given lb as the display unit, the preview shows lb values
  (multiples of 5, bar 45).

## Non-functional requirements

- Works on iOS, Android and web, at phone width, in light and dark themes.
- The generated mark and the action's state are not conveyed by colour alone
  (FR-12).
- The preview is reachable and confirmable with one hand during a set — no
  more than one extra tap compared with 0024.

## Assumptions

Gates delegated by the owner; these are the calls made, recorded so they can
be reversed cheaply.

- **[ASSUMPTION: an edited generated set becomes the person's own (loses the
  mark, kept on remove).]** "Quitar esos creados" read as "remove what the app
  created and I did not touch". The alternative — remove edited ones too —
  would silently throw away the person's input.
- **[ASSUMPTION: done generated sets are kept on remove.]** They are logged
  work; deleting them with one tap would lose performed training. They can
  still be deleted one by one.
- **[ASSUMPTION: removing needs no confirmation.]** It only removes untouched,
  not-done sets, and adding them back is one tap plus confirm.
- **[ASSUMPTION: adding never replaces existing warm-ups.]** This reverses
  0024's assumption that tapping again replaces not-done warm-ups ahead of the
  first working set: with a toggle, the second tap removes instead, and
  regenerating after a weight change is remove + add.
- **[ASSUMPTION: generated sets go after any existing warm-ups, right before
  the first working set.]** Keeps the ramp adjacent to the work it leads to.
- **[ASSUMPTION: the mark is kept in saved routines and carried into the
  workout, but not kept in saved workouts.]** A routine is reopened and edited
  for months, so the toggle must keep working there; a saved workout is a
  record of what was lifted, where the origin of a set adds nothing.
- **[ASSUMPTION: the routine detail screen shows generated rows as warm-ups,
  without the mark.]** The mark matters where the action lives (editor,
  workout).
- **[ASSUMPTION: "last time" pairing by kind is included here.]** Inserting
  approach sets is exactly what exposes the position shift (0024 plan risk),
  and the same rule closes the 0023 follow-up.

## Open decisions

None. Questions worth confirming with the owner on the next device pass are
listed in the report, not as blockers.

## Related

- Amends: 0024 (FR-1, FR-4 and its "adding again replaces" assumption; closes
  its plan risk "last time by set order").
- Closes backlog follow-up: "Warm-up taken as last time's first set" (0023).
- Depends on: 0010 (persisted active workout), 0013 (warm-ups out of
  records), 0022 (per-side reps count as values for FR-7).
- Roadmap: docs/roadmap/01-live-workout-logging.md
- Constitution articles engaged: 1, 2, 4.
