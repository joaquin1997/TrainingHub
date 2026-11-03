---
id: 0048
title: Trustworthy records and feedback against last training
status: planned
amends: 0032
roadmap: docs/roadmap/04-progress-and-prs.md
created: 2026-11-03
revises-draft: 2026-10-27
---

# Trustworthy records and feedback against last training

## Problem

The record badge (0032) is meant to tell the person, the moment they tick a set,
that it beat their best. Two things in the owner's session make it unreliable:

1. **Sometimes there is no badge, and nothing says why.** After ticking sets, some
   exercises showed no record where the owner expected one ("no me marca los
   records cuando le doy a serie hecha"), while the Bulgarian split squat did. The owner wonders whether the cause is
   "la migración"
   (the catalog change of 2026-10-21, or an older data change). Today a missing
   badge means one of two opposite things — *this was not a record* or *the app
   could not judge* — and the screen looks the same for both, so the person
   cannot trust the absence.
2. **The number on the badge reads as a difference but is a count.** The
   current badge uses a bare "+N" to count additional record types.
   This can be read as a difference in reps or weight. The current report
   does not establish whether that ambiguity explains the numerical mismatch.

## Why now

A record badge exists to motivate at the moment of effort; a badge that is
missing without explanation, or whose number does not add up, does the opposite.
Both are the owner's direct feedback after using the app. The owner also
wants improvement against the last session to be visible even when it does
not beat an all-time best.

## Users and scenarios

- **Plain record.** Starting all-time most-reps best 12 at 180 kg. Today 180 kg × 13, ticked. The badge
  says what was beaten and by how much in words the person recognises: "Most
  reps · 13 (previous best 12)".
- **Improving again.** Last session reached 45 kg, the historical best is
  50 kg and today reaches 47 kg. Show improvement from last session without
  calling 47 kg a personal record.
- **Several records at once.** The same set also beats the best set volume. The
  badge shows the main record and says there are more, without a number that
  could be mistaken for reps or kilos.
- **No badge, honestly.** Records could not be loaded: the screen says so.
  Confirmed empty history is distinguished from a failed lookup.
- **Basement gym, then signal.** Records could not be loaded at the start; when
  the connection comes back the badges appear without the person doing anything.

## Scope

### In scope
- Distinct feedback for beating an all-time best versus improving the same
  metric against the latest saved session of that exercise.
- What a record badge says: which record, the figure reached and the previous
  best, and how many further records the set beat — in words, in the display
  unit.
- A visible state on an exercise whose records could not be judged, and why it
  could not (no connection or service unavailable).
- Loading the records again when the reason for failing is over, for every
  exercise of the workout, however it entered it.
- Correct handling of missing starting records and exercise identity after
  catalog changes, without assuming the migration caused the reported issue.

### Out of scope
- Changing which personal records exist or how they are judged — 0023,
  0021, 0022. Last-session improvements are separate feedback, not new PRs.
- Sounds, vibration or celebrations — 0037 owns the celebration after saving.
- Badges on the watch or the lock screen — 0032 out of scope, unchanged.
- Saved-workout records on the summary and History — unchanged and authoritative
  (0032 FR-23).
- A "first time" mark for an exercise with no history — not asked for.

## Functional requirements

### Reading the badge

- **FR-1.** A record badge MUST name the record beaten, the figure the set
  reached, and the previous best it beat, e.g. "Most reps · 13 (previous best 12)",
  "Heaviest weight · 47 kg (was 45 kg)". Weights in the display unit
  (Article 4).
- **FR-2.** When a set beat more than one record, the badge MUST show the most
  significant one as in FR-1 and say how many others in words ("and 3 more
  records"), never as a bare "+N" beside a figure.
- **FR-3.** The screen reader's text for the badge MUST list every record beaten
  with its figures, as today for the names (0032 FR-13).
- **FR-4.** The badge text MUST be in the person's language (ES / EN), both with
  the same structure.

### Records that could not be judged

- **FR-5.** When an exercise's starting records are not available — not yet
  loaded, or the load failed — the exercise MUST show a quiet, non-blocking
  sign that its records are unavailable, so the absence of a badge is not read
  as "not a record". The sign MUST NOT block logging and MUST NOT be a modal. While loading, it
  MUST say “checking records” rather than invent an error reason.
- **FR-6.** When a successful lookup confirms no earlier performed history (nothing to beat),
  the exercise MUST NOT show the "unavailable" sign; a missing badge there is
  correct (0032 FR-8).
- **FR-7.** The sign MUST say, briefly, why: no connection, or the server could
  not answer. `[ASSUMPTION: two reasons are enough for the person; the exact
  error stays in the app's logs.]`
- **FR-8.** Records not loaded MUST be loaded again, without the person asking,
  when the app comes back to the foreground, when the connection returns, and
  periodically while the workout is open; once loaded, done sets of that
  exercise MUST be judged at once, without the notice (0032 EF-2).
- **FR-9.** An expired sign-in MUST follow 0001 without treating missing records as
  empty history. A refusal from the server MUST NOT end the attempts for the whole
  workout without telling the person: the exercise shows the sign of FR-5 with
  the server's refusal as its reason, and the app tries again the next time the
  workout is opened.
- **FR-10.** Every exercise of the workout MUST be judged the same way however it
  got there: from the routine, added during the workout, replaced (0020),
  restored after the app was closed (0010), or started on an older version of
  the app (0032 EF-4).

- **FR-11.** Opening a badge MUST reveal all record types beaten, with their
  current and starting-best values. A reps-at-weight record MUST name the
  weight; session volume MUST be labelled as an exercise total. Unmarking or
  editing a set, including changing it to warm-up, MUST update its badges.

### Improvement against the previous session

- **FR-12.** On completing a working set, the system MUST distinguish a
  personal record (strictly above the starting all-time best) from an
  improvement over the latest saved session of this exercise. The latter
  MUST be labelled “Better than last session” with its metric and previous/
  current values; it MUST NOT count as a personal record or trigger a
  record-only celebration. Equality earns neither kind of improvement.
- **FR-13.** Last-session feedback MUST compare the same existing metric
  and exercise identity, not row positions or independent measurements
  paired into a fictitious set. Per-set metrics compare against that metric's
  best eligible working set in the previous session; reps-at-weight compares
  only at the same weight. Session-volume comparisons use the exercise's
  performed working-set total in both sessions and are labelled as totals.
  The reference MUST be the latest saved session preceding this workout's
  start, with its date available in detail. Repeated appearances in one
  workout MUST form one exercise session for comparison.
- **FR-14.** When the same metric beats both the historical and last-session
  bests, the main label MUST be “Personal record”; its detail MUST show both
  references clearly without two competing notices for the same metric.
  If only the latest session is beaten, show only the last-session improvement
  label for that metric. Editing, undoing or retyping a set as warm-up MUST
  recalculate both kinds of feedback under the same eligibility rules.
- **FR-15.** The last-session reference MUST remain stable during the active
  workout and survive reopening. Missing, failed or incomparable last-session
  data MUST NOT suppress an otherwise evaluable historical PR, or be treated
  as a zero baseline. Conversely, loaded last-session data may show improvement
  while historical records are unavailable, explicitly without claiming a PR.
  No prior session means neither a beaten PR nor last-session improvement.

## Behaviour when things go wrong

- **EF-1.** When the records of an exercise cannot be loaded and the person ticks
  its sets anyway, the workout MUST save exactly as normal; the saved result is
  authoritative (0032 FR-23), and the summary shows the records beaten.
- **EF-2.** When a record badge shown during the workout is not confirmed by the
  saved workout, nothing is said about it (0032 FR-23, unchanged).
- **EF-3.** An exercise whose history sits under a different exercise than the
  one in the workout (a retired or merged one, 0044, or a deleted one, 0033)
  MUST be judged against the history the person sees for it in Progress; if that
  cannot be done, it MUST show FR-5's sign rather than judge against nothing.
  Only an established catalog identity or explicit merge relationship may
  connect that history; matching names alone MUST NOT combine exercises.

## Domain impact

Presentation and loading of the **record badge** and **starting records** of the
active workout (glossary, 0032). Introduces one term: **records unavailable** (an
exercise of the active workout whose starting records could not be loaded; shown
as a sign, never as a badge). Records stay derived, never stored; no change to
what is saved. A **last-session improvement** is separate feedback derived
from the latest previous exercise session; it never changes the definition
or count of personal records.

## Acceptance criteria

- **AC-1.** Given an all-time most-reps best of 12 at 180 kg and a set of 180 kg × 13 ticked, then the most-reps entry of the
  badge reads "Most reps · 13 (previous best 12)" (or the equivalent in the other language
  and unit), and no bare "+3".
- **AC-2.** Given a set beating exactly three record types,
  then the badge reads the main record and "and 2 more records".
- **AC-3.** Given the phone in airplane mode when a workout starts, then each
  exercise without previously loaded starting records shows "records unavailable (no connection)"; given the connection
  back, then within a minute (or at once on returning to the app) the sign goes
  and the done sets are judged.
- **AC-4.** Given a successful lookup confirming no earlier performed history, then no badge and no
  "unavailable" sign.
- **AC-5.** Given the owner's account on the current server, when a workout is
  started from each routine in use, then every exercise that has history shows
  badges for sets that beat it, or the sign.
- **AC-6.** Given a workout started before this change and reopened after it,
  then its exercises are judged as in FR-10.

- **AC-7.** Given a record for reps at 100 kg, when its badge is opened, then
  its current and previous reps explicitly refer to 100 kg. Undoing that set
  removes its badge; marking it warm-up excludes it from record evaluation.
- **AC-8.** Given an earlier all-time best above the last-session figure,
  then the comparison names the all-time best and does not claim a record
  merely for beating last time. A service refusal shows an unavailable state
  and a later reopen retries without blocking workout logging.

- **AC-9.** Given starting records still loading, then the exercise says
  checking records; a successful empty response clears it without a PR.
  Authentication rejection prompts the existing session recovery, preserving
  training and never treating inaccessible data as empty history.

- **AC-10.** Given a historical heaviest weight of 50 kg, last-session best
  of 45 kg and today's performed 47 kg, then feedback says “Better than last
  session · 47 kg (previous session 45 kg)”, with no heaviest-weight PR.
  Today's 52 kg instead earns a personal-record label against 50 kg, and its
  detail also shows last session's 45 kg without a duplicate notice.
- **AC-11.** Given last-session sets of 100 kg × 5 and 80 kg × 12, then no
  comparison uses 100 kg × 12. A reps-at-100-kg comparison uses 5 reps; if
  the previous session has no set at today's weight, that comparison is absent
  rather than using a different session/weight or a zero baseline. Equality,
  warm-ups and unfinished sets earn no last-session improvement.
- **AC-12.** Given a last-session improvement on a completed set, when undone
  or retyped as warm-up, then it disappears/recalculates as appropriate.
  Reopening preserves its reference. Missing one comparison source leaves
  feedback from the other usable and correctly labelled. First-session
  exercises show neither kind of beaten-best announcement.

## Non-functional requirements

- Reuse loaded historical and last-session references; retry only missing
  sources rather than loading comparisons on every completion.
- Works offline once the records are loaded (0032 FR-3, unchanged).
- iOS, Android and web; no native rebuild.

## Assumptions

- **[ASSUMPTION: the bare "+N" is one plausible cause of the confusing
  number; it is not a diagnosis of the owner's report.]**
- **[ASSUMPTION: “previous best” means the starting all-time best for that
  metric, not the last session. The full list of beaten records is available
  by opening the badge; its main entry follows the existing priority.]**

- Owner-confirmed: support both comparisons. A personal-record label has
  priority; last-session improvement is separate feedback using the same
  metrics, without increasing personal-record counts.

## Investigation acceptance

The original missing/wrong-record report MUST remain labelled unconfirmed
until a concrete expected-vs-observed case is reproduced and its cause fixed
and verified, or the owner checks that case and accepts an explained result.
Passing presentation criteria alone MUST NOT close the original defect.

## Open decisions

Owner review on 2026-11-03 accepted explicit extra-record wording, load/error
states, recalculation after edits, and no beaten record on a first session.
The owner also confirmed the distinct all-time and last-session feedback:
historical PR takes priority, detail shows both references when applicable,
and last-session improvements do not count as PRs. No blocking decision for
these behaviours.
The reported data discrepancy remains
unconfirmed, separate from the Specify gate.

`TODO(sdd): capture an affected exercise, session, entered values and expected
previous best to reproduce the original mismatch; compare live records,
saved records and visible history before attributing it to catalog or account
migration. No personal data repair is authorized by this spec.`

## Related

- Amends: 0032 (FR-13: the badge text; EF-1: silent absence).
- Builds on: 0023 (record types), 0044 (catalog, FR-5/FR-6), 0010 (kept with the
  workout).
- Roadmap: docs/roadmap/04-progress-and-prs.md
- Constitution articles engaged: 3, 4, 10
