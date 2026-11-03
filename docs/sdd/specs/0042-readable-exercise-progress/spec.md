---
id: 0042
title: Progress per exercise that is easy to read and to find
status: ready
roadmap: docs/roadmap/04-progress-and-prs.md
created: 2026-11-03
requested: 2026-10-21
amends: 0006, 0034
---

# Progress per exercise that is easy to read and to find

## Problem

The owner reported that exercise progress is hard to understand and the
exercise itself is hard to find. Today the person must scroll past general
training summaries and a list of exercises to reach one exercise. Its detail
puts estimated maximum strength ahead of the weight and reps actually logged,
with no choice of what the chart means. Exercises logged with reps alone
still receive weight-oriented labels.

## Why now

The reviewed exercise catalog is in place and records and charts already
exist. The missing part is a short path to the right exercise and figures
that explain what happened in the person's own training. This is the next
progress slice after the warm-up work, as agreed on 2026-10-21.

## Users and scenarios

- **Find bench press.** The person opens Progress, searches for bench press
  immediately and opens its progress without scrolling past weekly summaries.
- **Understand a session.** The person sees “100 kg × 8 reps”, its date, and
  which saved session it came from. A best weight and an unrelated best rep
  count must never appear to be one set.
- **Read a trend.** The person chooses weight or volume and reads the value,
  unit and date of a point, knowing the difference between a best set and
  the total work of that session.
- **Bodyweight exercise.** A push-up exercise recorded as reps shows reps
  and dates, without empty kg figures or estimated maximum strength.
- **Timed exercise.** A plank shows time; a run shows distance and duration.
  The person can inspect the relevant trend without weight terminology.
- **From the exercise.** While viewing exercise information, the person
  opens its progress directly and can return to that same exercise.

## Scope

### In scope

- Finding an exercise with saved training directly from Progress.
- One clear detail per exercise, reachable from search results and exercise
  information, with an explicit choice of chart metric.
- Plain labels, dates and units for latest performance, personal bests,
  chart points and session history.
- A choice of period and a link from a session entry to the saved workout.
- Appropriate presentation for weight/reps, reps-only, time, weight/time and
  distance/time exercises, retaining the existing records by type.

### Out of scope

- New record rules, strength formulas or coaching recommendations.
- Editing or deleting workouts from progress; the existing saved-workout
  view remains the place to inspect their recorded data.
- Combining different exercises, aliases or equipment variants into one
  history. The catalog's exercise identity remains authoritative.
- Muscle distribution, a workout calendar, social comparisons or body
  measurements; these answer different questions.
- Building a general offline history archive or adding new export formats.
- Redesigning the whole Progress overview. Its general summaries remain
  available alongside the clearer entry to exercise progress.

## Functional requirements

- **FR-1.** Progress MUST offer exercise search before the general summaries
  and without scrolling at the normal text size. Searching MUST leave only
  matching exercise results in the results area; it MUST NOT require
  scrolling past the general summaries to reach them.
- **FR-2.** Search MUST match exercise names without sensitivity to case,
  accents or leading/trailing spaces. Known alternate names in either app
  language MUST also match when the catalog supplies them. The results MUST
  show the exercise name in the current app language.
- **FR-3.** Search results MUST contain only exercises with saved performed
  work belonging to the signed-in person. Each result MUST show the name,
  last trained date and number of saved sessions for that exercise. With an
  empty query, results MUST start with the most recently trained exercise;
  equal dates are ordered by displayed name.
- **FR-4.** Opening a result MUST show that exercise's name and a clearly
  labelled latest performance with date, before detailed record history.
  Exercise information MUST also offer a named action to open this same
  progress. Returning MUST restore the preceding search and scroll position.
- **FR-5.** Every displayed weight/reps pair MUST describe one actually
  performed set. If showing independent maxima instead, the values MUST be
  labelled separately and MUST NOT be joined as if they were one set.
  “Latest” MUST mean the latest saved session, not the all-time best.
- **FR-6.** The detail MUST offer these chart metrics by tracking type, using
  only applicable, recorded quantities:

  | Exercise records | Metrics offered | Initial metric |
  |---|---|---|
  | Weight and reps | Heaviest working set, session volume, estimated maximum for one rep | Heaviest working set |
  | Reps only | Most reps in a working set, total working reps per session | Most reps in a working set |
  | Time only | Longest working set | Longest working set |
  | Weight and time | Heaviest working set, longest working set | Longest working set |
  | Distance and time | Longest working-set distance, longest working-set duration | Longest working-set distance |

  Changing the metric MUST update the chart title, units and inspected value
  together. It MUST NOT silently substitute another metric when data is
  absent.
- **FR-7.** Each chart point MUST represent one saved session of that exercise.
  The chart MUST identify its selected metric and units; inspecting a point
  MUST reveal its date and value. Multiple sessions on the same day MUST
  remain distinguishable. Missing values MUST be absent, never invented zeros.
- **FR-8.** The person MUST be able to choose the last month, three months,
  six months or all time. The selected period MUST be visible and apply to
  the chart and session list together. All-time personal records MUST remain
  explicitly labelled all-time and MUST NOT change with this period.
- **FR-9.** The detail MUST explain “session volume” as the sum of weight ×
  reps in that session, with the existing inclusion of performed warm-ups.
  Estimated maximum strength MUST be labelled as an estimate for one rep,
  with a short explanation that it is calculated from working sets, not a
  weight the person necessarily lifted. The explanation MUST be available
  beside the corresponding metric without leaving the exercise.
- **FR-10.** The session list MUST be newest first, with date, applicable
  performance figures and a named action to open the saved workout. The
  workout MUST be the one represented by that entry, including when the
  exercise appears twice in the same workout; that workout contributes one
  combined session entry.
- **FR-11.** Existing personal records MUST remain available by type and date.
  A first-ever session MUST NOT be announced as beating a previous record.
  Working-set maxima and records MUST exclude warm-ups and unfinished sets;
  session volume MUST preserve the performed-work rules already in place.
- **FR-12.** Reps-only exercises MUST NOT show kg/lb placeholders, weight
  volume or estimated maximum strength. Time and distance values MUST show
  their units and readable duration formatting. Weights MUST follow the
  display-unit preference consistently in charts, records and session rows.
- **FR-13.** Opening progress, searching or changing a metric/period MUST NOT
  change saved workouts, routine targets or record definitions. The same
  exercise's progress MUST refresh when revisited after a workout is saved.

## Behaviour when things go wrong

- **EF-1.** With no performed work, show that there is no training history for
  this exercise yet, with a way back; do not show a zero trend or suggest
  the person's performance is zero.
- **EF-2.** With no search matches, keep the query editable, explain there are
  no matching trained exercises and offer to clear it. Do not replace the
  result with an unrelated exercise or the entire catalog.
- **EF-3.** With no points in the selected period or metric, keep the chosen
  controls visible, explain the absence and offer all time. Other available
  personal records remain readable. Do not silently switch the period.
- **EF-4.** A connection or server failure MUST show an error with retry and
  preserve the current exercise, search, metric and period. Values already
  loaded in the current view MUST remain visible with a notice that refresh
  failed. Authentication rejection follows the session rules of 0001.
- **EF-5.** With just one point, show and allow inspecting that value; do not
  draw a trend that implies improvement or decline.
- **EF-6.** A retired or deleted exercise with the person's saved history MUST
  remain identifiable from that history. Progress MUST NOT expose another
  person's private exercises or workouts merely because a name matches.
- **EF-7.** If the person changed the exercise's tracking type, older sessions
  keep their original quantities. Unsupported or missing measurements MUST
  remain absent; they MUST NOT be reinterpreted into the new metric.

## Domain impact

Reads Exercise, WorkoutSession, performed sets, session points and personal
records. Progress remains derived from saved work, not a new source of truth.
A progress session refers to the saved workout it describes, so the person
can inspect the evidence behind a figure. No new training concept or change
to record rules is introduced.

## Acceptance criteria

- **AC-1.** Given saved bench press and squat sessions, when Progress opens,
  then search is available before the general summaries; entering a bench
  press name shows its result and opening it reaches that exercise directly.
- **AC-2.** Given a trained exercise with an accented Spanish name and a known
  English alternate name, when searching either name, in capitals or without
  accents, then the same exercise appears once, named in the app language.
- **AC-3.** Given a latest session with 100 kg × 5 and 80 kg × 12, when
  inspecting its heaviest set, then it shows 100 kg × 5, never 100 kg × 12.
  The date belongs to that session.
- **AC-4.** Given several weighted sessions, when weight progress opens,
  then heaviest working-set weight is selected; choosing volume changes its
  title, values and units and offers the session-volume explanation. Choosing
  the one-rep estimate labels it as an estimate.
- **AC-5.** Given reps-only push-ups, when progress opens, then reps and dates
  are shown and no kg, weight volume or one-rep estimate appears. Given a
  plank or run, applicable time/distance choices and units are shown.
- **AC-6.** Given sessions both inside and outside three months, when choosing
  three months, then chart and session list agree on the included sessions;
  choosing all time restores older ones without changing all-time records.
- **AC-7.** Given two sessions on one date, when inspecting each point and
  opening its session entry, then each opens its own saved workout. Repeating
  the exercise twice inside one workout still yields one progress session.
- **AC-8.** Given a heavier warm-up and an unfinished working set, when showing
  heaviest-set progress and records, then neither contributes a working-set
  maximum. Performed warm-ups retain their existing session-volume contribution.
- **AC-9.** Given an exercise with a single session, when opening progress,
  then its value and date can be inspected without implying a trend or a new
  beaten record. Given an empty period, its controls and all-time option remain.
- **AC-10.** Given loaded progress and a connection failure on refresh, when
  retrying, then already shown data and the selected exercise/metric/period
  survive. An empty search result offers clearing the query.
- **AC-11.** Given exercise information, when opening its named progress
  action and returning, then the same exercise information is restored.
  Returning from a search result preserves the query and result position.
- **AC-12.** Given a kg/lb preference change or an older session lacking the
  current tracking quantities, when reopening progress, then labels and
  numbers agree on units and missing measurements remain absent.

## Non-functional requirements

- Support iOS, Android and web in Spanish and English.
- At normal text size and 320 pt width, the search and named metric/period
  controls remain usable without horizontal scrolling. With large text,
  controls may wrap and values must not overlap their labels.
- Every metric/period choice and chart value is accessible without relying
  on color or a drag gesture alone. Screen readers announce labels, dates,
  units and selected states.
- Filter already loaded results without another loading screen per keystroke.
- Retain existing saved data and active-workout behaviour; no background
  history download is required for offline operation.

## Assumptions

- **[ASSUMPTION: three months is the initial chart/list period; all-time
  records remain a separate, explicitly labelled section.]**
- **[ASSUMPTION: recent exercises come first; no favorites, muscle filters or
  multiple sort controls in this slice.]**
- **[ASSUMPTION: the latest weighted set is the heaviest working set of the
  latest session, ties resolved by highest reps and then logged set order.
  It is explicitly labelled as that session's heaviest set.]**
- **[ASSUMPTION: a month means the same local calendar date one, three or six
  months earlier, clamped to the last valid day; both boundary dates are
  included. Session dates follow the person's local time.]**
- **[ASSUMPTION: extra chart metrics beyond the table, pace comparisons and
  comparisons at a fixed rep count can wait for later feedback.]**

## Open decisions

None blocking. This specifies the reported findability and readability
problem; the defaults above are reversible assumptions under the delegated
gates. Ready to plan; no implementation is authorized by this document alone.

## Related

- Builds on 0006 (progress), 0013 (performed work), 0021 (tracking types),
  0023 (records), 0034 (charts), 0044 (reviewed names and aliases).
- Uses 0001 for expired and unreachable-session behaviour.
- Constitution articles engaged: 1, 2, 3, 4, 8, 9.
