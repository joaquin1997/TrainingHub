---
id: 0029
title: Supersets that flow in rounds
status: in-progress
decided: 2026-10-17
roadmap: docs/roadmap/05-routines-advanced.md
created: 2026-10-17
---

# Supersets that flow in rounds

> **No technology in this file.** See `../README.md`.

## Problem

Found by the owner on the device (2026-10-17), verbatim: *"cómo funcionan las
superseries? No veo que ocurra nada cuando se unen, entiendo que deberían
intercalarse las series de cada una de los ejercicios de tal forma que el
descanso sea cada 2 series, no?"*

In short: joining two exercises into a superset changes how they look, not how
the workout runs. The person expects the sets to alternate — one set of each
exercise, then rest — and instead rests after every single set, exactly as if
the exercises were not joined.

## Today

Verified in the code on 2026-10-17. What joining does and does not do:

- **How exercises are joined.** In the routine editor each exercise has a free
  "Superset" number field. Exercises that sit next to each other and carry the
  same number form a superset. The same number on exercises that are not next
  to each other silently makes two separate supersets; a number on one
  exercise alone does nothing. The editor itself shows no grouping — only the
  numbers typed.
- **Where joining is visible.** In the routine detail and the active workout a
  superset is drawn as one card headed "Superset N", with a side rail and
  lettered labels (2A, 2B). Inside that card each exercise still shows its
  full list of sets, one exercise after the other: A1 A2 A3, then B1 B2 B3.
  Nothing shows rounds or which set comes next.
- **Rest.** Ticking *any* set starts a rest, with the rest of the exercise
  whose set was ticked — including A1 in the middle of a round. This was a
  deliberate carry-over in spec 0018 ("rest between exercises of a superset —
  keeps today's rule"). This is the main thing the owner noticed.
- **Next set.** The order used to pick "the next set to do" already alternates
  inside a superset (A1 → B1 → A2 → B2), and uneven counts fall through
  correctly. But it only surfaces when a rest *ends*: the next set is scrolled
  into view, the "Rest over" alert says "Next: {exercise}", and the watch
  offers that set. Because a full rest runs after A1, the alternation is only
  seen after waiting it out. With the rest off, nothing is brought into view
  at all. The rest bar itself never names the next set.
- **Watch.** Offers the same alternating next set, and a tick from the watch
  starts the same per-set rest as on the phone.
- **Active workout changes.** An exercise added during the workout cannot join
  a superset, and a workout started without a routine has no way to make one.
  Moving an exercise up or down keeps its number, so it can split a superset
  or silently join an adjacent one with the same number. Replacing an exercise
  keeps its superset. Removing one leaves the rest; a superset left with one
  exercise is drawn as a normal exercise.
- **Saved workout.** The grouping is not kept in the saved workout; history
  shows the exercises as unrelated.

## Why now

Supersets were marked done in the roadmap, but the part that makes them a
superset — alternating sets and resting once per round — was never built. The
owner trains with them and the current behaviour costs a full rest per set,
roughly doubling the time of a superset block.

## Users and scenarios

- **Classic pair.** Bench press (4 sets, rest 2:00) joined with barbell row
  (4 sets). The person does bench 1, goes straight to row 1, then rests 2:00;
  then bench 2, row 2, rest… Four rests, not eight.
- **Uneven pair.** Curls (4 sets) joined with triceps pushdowns (3 sets).
  Rounds 1–3 alternate; round 4 is curls alone, then rest.
- **Tri-set.** Lateral raise, face pull and shrug joined. A1 → B1 → C1 → rest
  → A2 → B2 → C2 → rest.
- **Out of order.** The row station is busy, so the person does row 1 before
  bench 1. The rest starts when the second of the two is ticked, whichever it
  is.
- **Watch only.** Phone in the bag. After ticking bench 1 on the watch, the
  watch immediately offers row 1 with no countdown; after row 1, the rest
  runs and the watch then offers bench 2.

## Scope

### In scope
- **Rounds.** Round *n* of a superset is set *n* of every exercise in it that
  has a set *n*.
- **Rest once per round.** A rest starts only when a tick completes a round.
- **Next-set guidance in round order**, shown right after each tick, not only
  when a rest ends — on the phone, in the rest bar, in the rest-over alert and
  on the watch.
- **Clear grouping in the active workout**: which round the person is on and
  which set is next.
- **Joining and splitting in the routine editor** as an action on adjacent
  exercises, with the grouping drawn the same way as in the routine detail.
- Supersets of any size: pairs, tri-sets, giant sets.
- What happens to a superset when its exercises are moved, removed, replaced
  or get sets added or removed during a workout.

### Out of scope
- Joining or splitting supersets **during** the active workout, and supersets
  in a workout started without a routine — the routine editor is where they
  are made. Follow-up if the owner asks.
- A short transition time between the exercises of a round — rest between
  members is zero.
- A rest set on the superset itself, separate from its exercises' rests — see
  Assumptions.
- Keeping the grouping in the saved workout and showing it in history —
  follow-up; needs its own record on the performed side (Article 2).
- Circuits that repeat a whole routine as laps, EMOM/AMRAP timers — different
  features.
- Showing sets interleaved as one combined table (A1, B1, A2, B2 in a single
  list) — see Assumptions.

## Functional requirements

### Rounds and rest

- **FR-1.** A **round** of a superset MUST be, for a given set position *n*,
  set *n* of each exercise in the superset that has one. Warm-up sets are not
  part of rounds (FR-9).
- **FR-2.** Ticking a set done in a superset MUST start a rest only if that
  tick leaves no set of the same round not done. Otherwise no rest starts.
- **FR-3.** The rest that starts when a round completes MUST be the rest of the
  last exercise of the superset that has a set in that round — the one listed
  last, regardless of which set was ticked last. The usual rules for that
  exercise's rest apply (one changed during the workout wins, otherwise the
  routine's, otherwise the default from Settings; spec 0018).
- **FR-4.** Ticking a set of a superset that does not complete its round while
  a rest is running MUST end that rest quietly, without the rest-over alert —
  the person has already moved on.
- **FR-5.** Un-ticking a set MUST leave a running rest alone (unchanged from
  spec 0018) and MUST NOT start one.
- **FR-6.** Exercises not in a superset MUST keep today's behaviour exactly:
  every tick starts that exercise's rest.

### Next set and guidance

- **FR-7.** The next set to do inside a superset MUST follow round order: the
  first exercise of the superset with a set not done in the lowest
  unfinished round, in listed order. After the superset's last round, the
  next set is the first set not done after the superset (then before it), as
  today.
- **FR-8.** After a tick that does not start a rest, the next set to do MUST be
  highlighted and brought into view immediately. After a tick that starts a
  rest, it MUST be highlighted at once and brought into view when the rest
  ends (as today).
- **FR-9.** Warm-up sets of an exercise in a superset MUST come before round 1,
  done in listed order exercise by exercise, and each one MUST start a rest as
  for an exercise not in a superset.
- **FR-10.** While a rest runs, the rest bar MUST name the next set to do
  (exercise and set number). The rest-over alert MUST name the same set.
- **FR-11.** The watch MUST offer the same next set as the phone at every
  moment, and a tick from the watch MUST follow the same rest rules (FR-2 to
  FR-5).

### Grouping in the active workout and routine detail

- **FR-12.** A superset MUST be shown as one visually distinct group, labelled
  by size: "Superset" for two exercises, "Tri-set" for three, "Giant set" for
  four or more.
- **FR-13.** In the active workout the group MUST show the current round and
  the number of rounds (e.g. "Round 2 of 4"); once every round is done it MUST
  read as complete.
- **FR-14.** Within the group, every set MUST show which round it belongs to,
  and the next set to do MUST stand out from the rest.

### Routine editor

- **FR-15.** The routine editor MUST show supersets grouped exactly as the
  routine detail does.
- **FR-16.** The person MUST be able to join an exercise with the one below it
  in one action, and to take an exercise out of its superset in one action.
  Joining an exercise to one already in a superset adds it to that superset.
  The person MUST NOT have to type or manage group numbers.
- **FR-17.** Removing an exercise from a superset of two MUST turn the other
  into a normal exercise.

### Moving, removing and changing exercises

These apply both in the routine editor and in the active workout.

- **FR-18.** Moving an exercise within its superset MUST reorder it inside the
  superset; rounds then follow the new order.
- **FR-19.** Moving the first exercise of a superset up, or the last one down,
  MUST take it out of the superset. A superset left with one exercise becomes
  a normal exercise.
- **FR-20.** Moving an exercise not in a superset past a superset MUST move it
  past the whole group; it MUST never join a superset by being moved.
- **FR-21.** Removing an exercise from a superset during a workout MUST keep the
  superset for the others, with rounds recomputed; its done sets leave with it
  as they do today.
- **FR-22.** Replacing an exercise MUST keep its place in the superset
  (unchanged from spec 0020).
- **FR-23.** Adding or removing a set of an exercise in a superset MUST recompute
  rounds at once; sets already done stay done, and the current round and next
  set update accordingly.
- **FR-24.** An exercise added during the workout MUST be added as a normal
  exercise, never into a superset.

## Behaviour when things go wrong

- **EF-1.** When the exercise whose rest applies (FR-3) has its rest off, no
  rest starts at the end of the round, and the next set is brought into view
  at once.
- **EF-2.** When sets are ticked out of round order (B2 before A1), each tick
  still follows FR-2: a rest starts only when a round becomes complete. A
  later round can never complete an earlier one.
- **EF-3.** When every set of the superset is done, the last tick starts the
  rest per FR-3 and the next set is the first set to do outside the superset;
  with none left anywhere, no next set is shown.
- **EF-4.** A routine saved before this change keeps its supersets exactly as
  they are drawn today: adjacent exercises that shared a number stay joined;
  a number on an exercise alone, or repeated on exercises that are not next to
  each other, is treated as the separate groups it already appears as.
- **EF-5.** An active workout restored after the app was closed (spec 0010)
  MUST compute rounds, the next set and the rest rule the same way as before
  it closed.
- **EF-6.** When phone and watch were out of contact and both ticked sets,
  the rest and next set after they reconnect follow the combined state, by the
  same rules (spec 0025 EF-1).

## Domain impact

Gives **Superset** its intended meaning: a group of `RoutineExercise` entries
performed in **rounds** with one rest per round. Adds the term **Round**
(added to the glossary). No new stored concept: rounds, current round and next
set are derived from set positions and done marks. The **Rest timer** gains a
rule for supersets, overriding spec 0018's out-of-scope note. The
**WorkoutSessionDraft** keeps the grouping it already copies from the routine;
the saved **WorkoutSession** is unchanged. Routines keep the grouping they
already store; only how a person sets it changes.

## Acceptance criteria

- **AC-1.** Given bench press (4 sets, rest 2:00) joined with barbell row
  (4 sets, rest 1:00), when bench 1 is ticked, then no rest starts and row 1
  is highlighted and in view; when row 1 is ticked, a 1:00 rest starts and the
  rest bar reads the next set as bench press set 2.
- **AC-2.** Given AC-1's superset, when all four rounds are done in order, then
  exactly four rests have started.
- **AC-3.** Given curls (4 sets, rest 1:30) joined with pushdowns listed
  after it (3 sets, rest 1:00), when rounds 1–3 are done, then each ends with
  a 1:00 rest; when curls set 4 is ticked, a 1:30 rest starts (round 4 has
  only curls) and the group reads as complete.
- **AC-4.** Given a tri-set A, B, C, when A1 and B1 are ticked, then no rest has
  started; when C1 is ticked, C's rest starts; the group is labelled
  "Tri-set" and reads "Round 2 of N" afterwards.
- **AC-5.** Given AC-1's superset, when row 1 is ticked before bench 1, then no
  rest starts; when bench 1 is then ticked, row's rest starts.
- **AC-6.** Given a rest running after round 1, when bench 2 is ticked early,
  then the rest ends with no alert and row 2 is highlighted.
- **AC-7.** Given the phone locked and only the watch in use, when bench 1 is
  ticked on the watch, then the watch offers row 1 with no countdown; after
  row 1 the watch runs the rest and then offers bench 2.
- **AC-8.** Given a routine with three exercises not joined, when the person
  joins the first with the second in the editor and saves, then the routine
  detail and the next workout show them as a superset, and no number was
  typed.
- **AC-9.** Given a superset of two in the active workout, when its first
  exercise is moved up, then both are drawn as normal exercises and each tick
  of either starts its own rest.
- **AC-10.** Given an exercise not in a superset directly below a superset,
  when it is moved up, then it lands above the whole superset and the superset
  keeps its members.
- **AC-11.** Given an exercise with two warm-up sets in a superset, when the
  workout starts, then the warm-up sets each start a rest when ticked, and
  round 1 begins with that exercise's first working set.
- **AC-12.** Given a routine saved before this change with two adjacent
  exercises numbered 1 and a third, not adjacent, also numbered 1, then the
  first two form a superset and the third is a normal exercise, as drawn
  today.

## Non-functional requirements

- Works on iOS, Android and web; the watch parts on iOS with a paired watch
  (spec 0025).
- Works offline: everything here is derived on the device during the workout.
- No migration of stored routines is required (EF-4).

## Assumptions

- **[ASSUMPTION: the rest after a round is the rest of the exercise listed last
  among those with a set in that round (FR-3).]** It matches how people set up
  a superset in the editor ("rest goes on the last one") and needs no new
  setting. A single rest on the superset itself is the alternative; reversible
  without touching stored data.
- **[ASSUMPTION: zero rest between exercises of a round.]** A transition timer
  is out of scope.
- **[ASSUMPTION: an early tick during a rest ends it quietly (FR-4).]** Letting
  it keep counting would alert in the middle of the next round.
- **[ASSUMPTION: warm-up sets sit outside rounds and rest as normal sets
  (FR-9).]** Warm-ups ramp one exercise at a time; pairing them by position
  would produce odd rounds when only one exercise has warm-ups.
- **[ASSUMPTION: the active workout keeps one set list per exercise inside the
  group, adding round markers and a highlighted next set (FR-13, FR-14),
  rather than one interleaved table.]** Keeps logging, adding sets and
  per-exercise columns (tracking type, unilateral) as they are. An interleaved
  view is a later, reversible presentation change.
- **[ASSUMPTION: groups are labelled Superset / Tri-set / Giant set by size
  (FR-12)]**, with no upper limit on members.
- **[ASSUMPTION: joining and splitting happen only in the routine editor
  (Out of scope).]** The owner's routines are built ahead; mid-workout
  joining is a follow-up.
- **[ASSUMPTION: existing group numbers are interpreted as drawn today
  (EF-4)]**, so no routine changes shape when this ships.

## Open decisions

None blocking. Gate passed under delegation (2026-10-17); the calls above are
recorded as assumptions. Worth confirming with the owner on the next device
check: FR-3 (whose rest applies after a round) and the round-marker layout
versus an interleaved table.

## Related

- Builds on 0004 (retro routines), 0017 (block labels), 0018 (rest timer —
  replaces its out-of-scope note on supersets), 0020 (replace exercise), 0024
  (warm-up sets), 0025 (watch), 0010 (restore).
- Roadmap: docs/roadmap/05-routines-advanced.md (also touches
  docs/roadmap/02-rest-timer.md).
- Constitution articles engaged: 1, 2.
