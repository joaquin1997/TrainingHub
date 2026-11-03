---
id: 0043
title: Smarter warm-ups and warm-ups marked by hand
status: in-progress
amends: 0024, 0031
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-10-21
---

# Smarter warm-ups and warm-ups marked by hand

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

The warm-up action (0024, 0031) works out the same ramp for every exercise:
an empty 20 kg bar, then 40–90 % of the working weight. On dumbbells, machines
and cables there is no bar, so the ramp starts at a weight that means nothing
(incline dumbbell press at 32.5 kg got 20, 25, 30 kg in the owner's session of
2026-10-21). It also ignores the muscle: a biceps curl gets the five-set ramp
of a squat, and the third chest exercise of the day gets the same ramp as the
first, when the chest is already warm.

And when the person does not want the action, marking their own sets as
warm-ups is hidden: in the workout it only happens by tapping the set's label
repeatedly (normal → warm-up → drop → failure) with nothing saying so, and in
the routine editor it is not possible at all.

## Why now

The owner asked for both after the session of 2026-10-21: *"los cálculos
automáticos deben tener en cuenta el tipo de ejercicio y a qué músculo afecta
para el cálculo y poder modificar las series para marcarlas como calentamiento
si no quieren usar la función de generar calentamiento"*. Warm-ups are done
before almost every exercise; a wrong ramp is either deleted set by set or
followed with nonsense weights.

## What exists today (verified 2026-10-21)

- One ramp for every exercise that records weight and reps: empty bar × 10,
  40 % × 5, 60 % × 3, 75 % × 2, 90 % × 1, rounded to 2.5 kg / 5 lb, never
  below the bar, steps too close together left out.
- Historical state before the reviewed catalog (0044): the catalog recorded
  some equipment per exercise (barbell, dumbbell, EZ bar,
  kettlebell, bench, bodyweight…) but **has no machine or cable at all**:
  machine and cable exercises carry no equipment, and a few are wrong (a cable
  curl listed as bodyweight). Checked on the server's catalog: 862 exercises,
  318 with no equipment.
- Before 0044, the primary muscle was known for 668 of 862 exercises; the body-part
  category (legs, back, chest, arms, shoulders, abs, calves, cardio) for all
  but 16.
- In the workout, a set's type changes by tapping its label, cycling through
  the four types. In the routine editor a set is a warm-up only if the action
  generated it.

### Planning update — 2026-11-03

Spec 0044 has since supplied reviewed loading kinds, equipment and muscles.
Use those loading kinds before name/equipment inference, preserving a person's
explicit correction above both. The existing single barbell ramp and hidden
set-type cycle still need this feature. The chest example and AC-4 now use
two shortened approach sets, matching FR-4's large-muscle row; the former
single-set example contradicted that row. The same fallback rules apply to
custom exercises or old drafts without reviewed metadata.

## Users and scenarios

- **Dumbbell press.** First working set 32.5 kg per dumbbell. The action
  proposes a short ramp from about half of that — no 20 kg "bar" — and the
  preview says it is worked out for dumbbells.
- **Machine row.** First working set 60 kg on the stack. The ramp uses the
  stack's steps and no bar; the person sees "machine or cable" in the preview.
- **Squat first thing.** 140 kg: the full barbell ramp, as today.
- **Third chest exercise.** After bench press and dumbbell press, cable flyes
  at 25 kg: two approach sets, because the chest was already worked in this
  workout.
- **Curls.** A small muscle: two approach sets at most.
- **Wrong guess.** The app thinks a cable curl is a dumbbell exercise. In the
  preview the person switches it to machine or cable; the ramp changes, and
  the next time that exercise is ramped it is already right.
- **Own warm-ups.** The person logs warm-ups by feel. They tap a set's label,
  pick "Warm-up" from the list of set types, and the set becomes a warm-up;
  same in the routine editor.

## Scope

### In scope
- The ramp depends on the exercise's **loading kind** (barbell, dumbbells,
  machine or cable) and on its **muscle** (large or small, and whether it was
  already worked earlier in the workout or routine).
- The app works out the loading kind from what the catalog knows and the
  exercise's name; the person can change it from the preview, and the change
  is remembered for that exercise.
- The preview says what the ramp was worked out for (loading kind, and that
  the muscle was already worked when it was).
- Configuring the approach-set count (Automatic or 1–5) and weight increment
  from the preview, with preferences remembered for this person and exercise.
- Picking a set's type from a visible, explained list instead of the blind
  cycle, in the workout (normal, warm-up, drop, failure) and in the routine editor (normal,
  warm-up), with a short explanation of each type.

### Out of scope
- A plate calculator, named gym profiles or editing individual ramp
  percentages/repetition schemes. Count and increment are configurable;
  the person can still edit generated sets individually after adding them.
- Correcting an exercise's muscles or category — the ramp only reads them.
- Exercises that record no weight (bodyweight reps, time, distance): no
  approach sets, as today.
- Warm-ups for added weight on bodyweight exercises (weighted pull-ups) — they
  get the machine-or-cable ramp unless changed; a ramp from bodyweight is a
  follow-up.
- The warm-up block (mobility, cardio) of 0024 — unchanged.
- Changing shared catalog metadata from a personal warm-up preference.
  Personal choices MUST NOT affect anyone else's warm-ups.

## Functional requirements

- **FR-1.** Every exercise that records weight and reps MUST have a loading
  kind: *barbell* (a bar that is loaded with plates, including the EZ bar),
  *dumbbells* (dumbbells or kettlebells; the weight is per hand), or *machine
  or cable*.
- **FR-2.** Until a person sets it, the loading kind MUST be worked out from
  the catalog: a reviewed loading kind first when available, then the exercise's
  name (words for machine, cable, pulley,
  dumbbell, barbell, bar, kettlebell in English and Spanish), then its
  equipment; with neither, *machine or cable*. A personal override takes
  precedence above all of these without changing the shared catalog.
- **FR-3.** Without a personal increment choice, approach sets MUST use
  these loading-kind defaults:
  - *barbell* starts at the empty bar (20 kg / 45 lb; 10 kg / 25 lb for the EZ
    bar) and rounds to 2.5 kg / 5 lb;
  - *dumbbells* never start at a bar and round to 2.5 kg / 5 lb;
  - *machine or cable* never start at a bar and round to 5 kg / 10 lb.
- **FR-4.** How many approach sets the ramp has MUST follow the muscle:

  | | Muscle not worked yet | Muscle already worked |
  |---|---|---|
  | **Large** (legs, glutes, back, chest) | full ramp of the loading kind | 2 |
  | **Small** (arms, shoulders, calves, abs, trapezius, forearms) | 2 | 1 |

  This table applies with Automatic count selected. An explicit count of
  1–5 replaces the table's count while retaining the loading-kind rules and
  safety limits in FR-6. The ramps are in Assumptions.
  The muscle is the exercise's primary muscle;
  without one, its category; with neither, large.
- **FR-5.** In the workout, a muscle is *already worked* when an earlier
  exercise of this workout with that primary muscle (or category, per FR-4)
  has at least one working set done. In the routine editor, when an earlier
  exercise of the routine has that muscle.
- **FR-6.** Every approach set MUST stay below the working weight and at least
  one rounding step above the one before (0024 EF-2 holds); a working weight
  too light for any yields the "too light" message of today.
- **FR-7.** The preview (0031) MUST say what the ramp was worked out for: the
  loading kind, and "already worked" when FR-5 applies.
- **FR-8.** From the preview the person MUST be able to change the loading
  kind; the ramp shown MUST follow at once, and adding uses it.
- **FR-9.** A loading kind changed by a person MUST be remembered for that
  exercise **for that person only** — in later workouts, in the routine
  editor, and on the person's other devices — and MUST NOT be changed back
  by the app's own guess or a catalog refresh. Other users retain their own
  override or the catalog-derived default.
- **FR-10.** In the workout, tapping a set's label MUST show the four set
  types by name, the current one marked; picking one sets it. Picking the
  current one, or dismissing, changes nothing. The blind cycle MUST go.
- **FR-11.** In the routine editor, tapping a set's label MUST offer *normal*
  and *warm-up* the same way.
- **FR-12.** A set typed by hand follows every existing warm-up rule: a
  re-typed generated warm-up becomes the person's own (0031 FR-7), warm-ups
  are numbered apart (0040 FR-1), rest after a warm-up is shorter (0040
  FR-8), warm-ups never count toward records (0013).
- **FR-13.** Each type choice MUST include its full name, a short meaning
  and its effect on recording. Normal means an ordinary working set;
  warm-up means preparation, excluded from working-set records; drop means
  a working set after reducing load; failure means a working set taken to
  failure. Drop and failure remain working sets for records. Picking a type
  MUST NOT itself change weight, reps or completion, and MUST NOT be presented
  as prescribing that the person train to failure. Both workout and routine
  choices MUST explain the types they offer in the current app language.

- **FR-14.** The preview MUST offer Automatic count and explicit counts from
  1 to 5, with Automatic as the initial default. Changing the count MUST
  update the proposed ramp before insertion. It MUST never produce more
  than five sets, repeat weights to reach a count, or include working weight.
  If fewer valid weights fit, the preview MUST show the actual count and
  explain that the weight/increment limits prevent the requested count.
- **FR-15.** The preview MUST offer an editable positive weight increment in
  the current display unit, including 2.5 kg and 5 kg for machines/cables.
  The chosen increment replaces the loading-kind default for that exercise;
  it MUST apply to the spacing and rounding of generated weights. The preview
  MUST show the resulting weights immediately without requiring insertion.
- **FR-16.** Loading-kind override, count mode and weight increment MUST be
  remembered per person and exercise, shared across that person's workouts,
  routine editor and devices after a successful save. Changing one person's
  choice MUST NOT affect another person, existing sets or routine targets.
  Resetting to Automatic count MUST restore muscle/context-based counting;
  resetting loading kind or increment MUST restore their catalog/default rules.

## Behaviour when things go wrong

- **EF-1.** With no working weight, the action says a weight is needed (as
  today); the loading kind is still shown and can be changed.
- **EF-2.** When remembering a personal warm-up preference fails (offline, server
  error), the ramp for this time still uses the person's choice and the
  preview says it could not be saved; the next attempt saves it.
- **EF-3.** A custom exercise someone else owns (0015) or a deleted one (0033)
  may use metadata already present in the workout for its local preview.
  The person MUST NOT gain access to private catalog details or a persistent
  preference write for an inaccessible exercise. Existing logged data stays intact.
- **EF-4.** Changing a set's type while it is done keeps it done; a done set
  turned into a warm-up stops counting toward records shown live (0032).
- **EF-5.** An exercise whose muscle and category are both unknown counts as
  large and as not worked yet — the longer ramp, never a missing one.

- **EF-6.** A count outside 1–5 or a zero, negative or invalid increment
  MUST be rejected visibly without changing the last valid preview or
  inserting invalid sets. Preference loading failure MUST use known local
  choices or defaults and MUST NOT block training or imply they were synced.

## Domain impact

- **Loading kind** remains reviewed catalog metadata. New **personal warm-up
  preferences** associate a person and exercise with an optional loading-kind
  override, Automatic/explicit count and optional weight increment. They do
  not rewrite the exercise catalog or anyone else's preferences.
- Reads the primary muscle and category of **Exercise**; reads which
  **WorkoutExercise** working sets are done (performed) or which
  **RoutineExercise** come earlier (template) — never mixing the two
  (Article 2).
- Approach sets stay ordinary **warm-up sets**, rounded in the display unit
  and stored in kg (Article 4).
- No change to set types; only how they are picked. Changing generation
  preferences never regenerates existing performed or intended sets.

## Acceptance criteria

- **AC-1.** Given incline dumbbell press, first of the workout, first working
  set 32.5 kg, when previewing approach sets, then none is 20 kg-as-a-bar,
  with no increment override every weight is a multiple of 2.5 below 32.5, and the preview says
  dumbbells.
- **AC-2.** Given a machine row at 60 kg, then with default increment the approach sets are multiples
  of 5 kg below 60 and the preview says machine or cable.
- **AC-3.** Given back squat at 140 kg first in the workout with Automatic count
  and default increment, then the ramp is
  today's (20 × 10, 55 × 5, 85 × 3, 105 × 2, 125 × 1).
- **AC-4.** Given bench press done and Automatic count, when previewing cable flyes (chest), then
  two approach sets are proposed and the preview says the chest was already
  worked.
- **AC-5.** Given barbell curls first in the workout with Automatic count, then at most two
  approach sets.
- **AC-6.** Given an exercise guessed as dumbbells, when the person switches
  it to machine or cable in the preview and adds the sets, then the sets
  follow the machine ramp; and in a later workout (and in the routine editor,
  and on the web build) the same exercise is already machine or cable for that person. A second
  account with no override still uses its catalog-derived default.
- **AC-7.** Given a normal set in the workout, when its label is tapped, then
  four types are listed by name with "normal" marked; picking warm-up makes it
  "C" and renumbers the working sets.
- **AC-8.** Given the routine editor, when a set's label is tapped and
  warm-up is picked, then the saved routine has it as a warm-up and a workout
  started from it shows it as one.
- **AC-9.** In lb, the same cases round to 5 lb (barbell, dumbbells) and
  10 lb (machine or cable), and the empty bar is 45 lb.

- **AC-10.** Given the set-type picker in Spanish or English, when it opens,
  then each offered type has its full name and meaning. Warm-up explains its
  exclusion from working-set records; drop and failure remain working sets.
  Choosing a type preserves the entered values and completion. Routine
  choices explain normal and warm-up without offering unsupported types.

- **AC-11.** Given a 140 kg barbell target and default increment, when the
  person selects 1, 2, 3, 4 or 5 sets, then the preview shows the selected
  count with increasing weights below 140 kg. Selecting Automatic restores
  the muscle/context-based count; a lighter target may yield fewer sets with
  a visible explanation, never duplicate or working-weight sets.
- **AC-12.** Given a 60 kg cable target, when changing the increment from
  5 kg to 2.5 kg, then the preview recalculates using the selected step.
  Saving and reopening on another device retains that person's choice;
  another account's preview remains unchanged.
- **AC-13.** Given a saved custom count and increment, when previewing the
  same exercise in the routine editor and a later workout, then both use
  those preferences. Resetting restores the defaults without editing sets
  already added. Invalid count/increment input leaves the valid ramp intact.

## Non-functional requirements

- Works offline in the workout: the ramp needs nothing from the network
  (FR-9's saving can wait, EF-2).
- iOS, Android and web; no native rebuild.
- Existing exercises start with a worked-out kind; nothing a person did is
  lost.

## Assumptions

- **[ASSUMPTION: Automatic keeps the existing proposed ramps: full barbell
  = empty bar × 10, 40% × 5, 60% × 3, 75% × 2, 90% × 1; full dumbbell/machine
  = 50% × 8, 70% × 5, 85% × 2; two sets = 50% × 8, 75% × 4; one = 60% × 6.]**
- **[ASSUMPTION: explicit counts use the one/two/three schemes above;
  four = 40% × 8, 60% × 5, 75% × 3, 90% × 1; five = empty bar × 10 plus
  40% × 5, 60% × 3, 75% × 2, 90% × 1 for barbell, or 40% × 10,
  50% × 8, 60% × 5, 75% × 3, 90% × 1 for dumbbell/machine. These numeric
  defaults remain tunable after trying them; the configurable count is confirmed.]**
- **[ASSUMPTION: configuration lives in the preview and is remembered per
  person/exercise, with no separate settings screen or named gym profiles.]**
- **[ASSUMPTION: absent an increment override, defaults remain 2.5 kg / 5 lb
  for barbell/dumbbells and 5 kg / 10 lb for machine/cable. A personal custom
  increment is a physical load quantity and retains its equivalent value when
  the display unit changes rather than being silently replaced.]**
- **[ASSUMPTION: "already worked" needs a working set done, so an exercise
  only ticked as warm-ups, or skipped, does not count.]**
- **[ASSUMPTION: large = quads, glutes, hamstrings, lats, chest, and the
  legs, back and chest categories; everything else is small.]**

## Open decisions

None blocking. Owner review on 2026-11-03 confirmed configurable counts up
to five, adjustable increments (including cable steps of 2.5/5 kg), and
per-user preferences. Placement, explicit-count schemes and reset behaviour
are recorded as reversible assumptions; numeric schemes can be tuned after
trying them on the device.

## Related

- Amends: 0024 (approach sets: FR-3's single ramp), 0031 (preview: shows and
  changes the loading kind; FR-7 re-typing unchanged)
- Builds on: 0030 (worked-out vs set-by-a-person value), 0040 (FR-1 numbering,
  FR-8 warm-up rest)
- Roadmap: docs/roadmap/01-live-workout-logging.md
- Constitution articles engaged: 2, 3, 4, 5
