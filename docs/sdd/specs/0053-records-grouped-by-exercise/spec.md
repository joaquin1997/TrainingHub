---
id: 0053
title: Group records by exercise
status: ready
roadmap: docs/roadmap/04-progress-and-prs.md
created: 2026-11-03
---

# Group records by exercise

## Problem

A workout can beat several records for the same exercise. Flat record lists
repeat the exercise name across entries and make it difficult to see which
exercise improved and in how many ways. The owner asks to group those records
by exercise.

## Why now

Grouping complements trustworthy badge wording (0048) and clearer progress
(0042) without changing which performances qualify as records.

## Users and scenarios

- **Session recap.** Bench press beats weight, set volume and estimated
  maximum; all three belong under one Bench press heading.
- **Several exercises.** Squat and leg press each retain their own records,
  even if translated exercise names coincide.
- **Evidence.** The person opens a dated record's workout to inspect the
  measurements that earned it.

## Scope

### In scope

- Grouping existing multi-exercise record lists in post-workout summary by exercise identity, with an exercise heading and record entries.
- Keeping type, value, units, dates and existing evidence links readable.
- A useful empty/error state and accessible reading order.

### Out of scope

- New record types, qualification rules, comparisons or celebrations.
- Creating a new cross-exercise record-history screen where none exists.
- Combining different exercises by name or equipment; catalog identity holds.
- Redesigning single-exercise record lists, live set badges or share artifacts.

## Functional requirements

- **FR-1.** Each exercise MUST appear once per multi-exercise record section,
  with its name as a heading and all its records as entries within that group.
  Grouping MUST use exercise identity, never matching displayed names alone.
- **FR-2.** Every record entry MUST retain its type, actual value, display
  unit and any existing supporting set, date and saved-workout reference.
  Grouping MUST NOT hide a record or combine independent maxima into a
  fictitious set. Group headings MUST NOT repeat as metadata on each entry.
- **FR-3.** Session-summary groups MUST follow exercise order in the saved
  workout. If an exercise occurs twice, it MUST still form one record group
  at its first occurrence. Any existing multi-exercise record section encountered during planning
  MUST use the same grouping; this does not require creating one in Progress.
- **FR-4.** Within a group, records MUST retain the established record-type
  priority and dated-history ordering. The group may show a count, but it
  MUST be labelled “records”, not an ambiguous bare “+N”.
- **FR-5.** Available evidence actions MUST open the correct exercise or
  saved workout. Viewing groups MUST NOT change record calculations or
  produce another celebration for an already viewed workout.
- **FR-6.** Group headings and entries MUST form an accessible reading order:
  exercise first, then each record's type, figure, unit and date when present.
  Groups MUST initially show all their entries without requiring expansion.

- **FR-7.** Last-session improvements specified in 0048 MUST retain their
  separate label wherever displayed alongside these groups. They MUST NOT
  increase personal-record counts or be presented as historical records.

## Behaviour when things go wrong

- **EF-1.** No records MUST retain the screen's existing empty-state behaviour;
  no empty exercise groups or zero-valued PRs may be invented.
- **EF-2.** Failed loading MUST show retry without clearing loaded groups or
  presenting failure as no records. Authentication errors follow 0001.
- **EF-3.** A retired/deleted exercise MUST keep an identifiable saved name
  and its records; inability to open catalog information MUST NOT hide its
  saved-workout evidence or merge it into an unrelated exercise.

## Domain impact

Presentation of existing personal records. Exercise identity, metric
qualification, performed training and all-time bests retain their meaning.

## Acceptance criteria

- **AC-1.** Given three bench records and two squat records, when viewing
  the workout summary, then two exercise headings contain all five entries,
  in workout order, with no repeated per-entry exercise caption.
- **AC-2.** Given two distinct exercises with the same displayed name, then
  they remain distinct groups. Two occurrences of one exercise form one group.
- **AC-3.** Given the same exercise appearing twice in a workout, then its group
  appears at the first occurrence and retains every record type/value/date.
- **AC-4.** Given kg/lb or Spanish/English display, then every grouped value
  and heading follows those preferences without changing the record itself.
- **AC-5.** Given a record's evidence action, then it opens the correct
  saved workout. Reading groups aloud starts with their exercise headings.
- **AC-6.** Given no records, unavailable catalog data or failed refresh,
  then no fake groups appear, saved evidence stays usable and retry is offered
  where applicable.

- **AC-7.** Given two personal records and a last-session improvement that
  is not a historical record, then the personal-record count remains two;
  the improvement retains its distinct last-session label wherever shown.

## Non-functional requirements

- iOS/Android/web, both themes and Spanish/English.
- At 320 pt width and large text, headings, figures and units remain readable;
  values may wrap rather than overlap or lose their exercise context.

## Assumptions

- Owner-confirmed scope: group Records today in the saved-workout summary.
  Existing per-exercise Progress needs no new cross-exercise list.
- Owner-confirmed presentation: follow workout exercise order, keep every
  record initially visible without collapsed groups, and count only PRs.

## Open decisions

Owner reviewed and accepted the presentation on 2026-11-03, including one
heading per exercise, all records visible in workout order, summary scope
and last-session improvements excluded from PR counts. No blocking decisions;
ready to plan, with implementation and device acceptance pending.

## Related

- Builds on 0023 and 0034; complements 0042 and 0048.
- Reuses 0050's corrected saved data once corrections are available.
- Constitution articles engaged: 1, 2, 4, 11.
