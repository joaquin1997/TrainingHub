---
id: 0047
title: Record badges that can be trusted and read
status: draft
amends: 0032
roadmap: docs/roadmap/04-progress-and-prs.md
created: 2026-10-27
---

# Record badges that can be trusted and read

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

The record badge (0032) is meant to tell the person, the moment they tick a set,
that it beat their best. Two things in the owner's session make it unreliable:

1. **Sometimes there is no badge, and nothing says why.** After ticking sets, some
   exercises showed no record where the owner expected one ("no me marca los
   records cuando le doy a serie hecha"), while others, the Bulgarian split
   squat among them, did. The owner wonders whether the cause is "la migración"
   (the catalog change of 2026-10-21, or an older data change). Today a missing
   badge means one of two opposite things — *this was not a record* or *the app
   could not judge* — and the screen looks the same for both, so the person
   cannot trust the absence.
2. **The number on the badge reads as a difference but is a count.** The badge
   says the most important record beaten, then "+N". On a set of 13 reps where
   last time was 12, it said "Most reps +3". The person reads "3 more reps" and
   it does not add up. The 3 is *how many other records* the same set also beat
   (the same set also beat the best set volume, the best reps at that weight and
   the estimated 1RM). The same happened with "Peso máximo +2" on a set 2 kg
   above last time, by coincidence of the numbers.

## Why now

A record badge exists to motivate at the moment of effort; a badge that is
missing without explanation, or whose number does not add up, does the opposite.
Both are the owner's direct feedback after using the app.

## Users and scenarios

- **Plain record.** Last time 180 kg × 12. Today 180 kg × 13, ticked. The badge
  says what was beaten and by how much in words the person recognises: "Most
  reps · 13 (was 12)".
- **Several records at once.** The same set also beats the best set volume. The
  badge shows the main record and says there are more, without a number that
  could be mistaken for reps or kilos.
- **No badge, honestly.** The exercise has no earlier history, or the records
  could not be loaded. The screen says which, instead of staying silent.
- **Basement gym, then signal.** Records could not be loaded at the start; when
  the connection comes back the badges appear without the person doing anything.

## Scope

### In scope
- What a record badge says: which record, the figure reached and the previous
  best, and how many further records the set beat — in words, in the display
  unit.
- A visible state on an exercise whose records could not be judged, and why it
  could not (no connection, server unavailable, nothing to beat yet).
- Loading the records again when the reason for failing is over, for every
  exercise of the workout, however it entered it.
- Finding why badges were missing in the owner's session, and fixing it if the
  cause is in the app.

### Out of scope
- Changing which records exist or how they are judged — 0023, 0021, 0022.
- Sounds, vibration or celebrations — 0037 owns the celebration after saving.
- Badges on the watch or the lock screen — 0032 out of scope, unchanged.
- Saved-workout records on the summary and History — unchanged and authoritative
  (0032 FR-23).
- A "first time" mark for an exercise with no history — not asked for.

## Functional requirements

### Reading the badge

- **FR-1.** A record badge MUST name the record beaten, the figure the set
  reached, and the previous best it beat, e.g. "Most reps · 13 (was 12)",
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
  as "not a record". The sign MUST NOT block logging and MUST NOT be a modal.
- **FR-6.** When the exercise has no earlier performed history (nothing to beat),
  the exercise MUST NOT show the "unavailable" sign; a missing badge there is
  correct (0032 FR-8).
- **FR-7.** The sign MUST say, briefly, why: no connection, or the server could
  not answer. `[ASSUMPTION: two reasons are enough for the person; the exact
  error stays in the app's logs.]`
- **FR-8.** Records not loaded MUST be loaded again, without the person asking,
  when the app comes back to the foreground, when the connection returns, and
  periodically while the workout is open; once loaded, done sets of that
  exercise MUST be judged at once, without the notice (0032 EF-2).
- **FR-9.** A refusal from the server MUST NOT end the attempts for the whole
  workout without telling the person: the exercise shows the sign of FR-5 with
  the server's refusal as its reason, and the app tries again the next time the
  workout is opened.
- **FR-10.** Every exercise of the workout MUST be judged the same way however it
  got there: from the routine, added during the workout, replaced (0020),
  restored after the app was closed (0010), or started on an older version of
  the app (0032 EF-4).

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

## Domain impact

Presentation and loading of the **record badge** and **starting records** of the
active workout (glossary, 0032). Introduces one term: **records unavailable** (an
exercise of the active workout whose starting records could not be loaded; shown
as a sign, never as a badge). Records stay derived, never stored; no change to
what is saved.

## Acceptance criteria

- **AC-1.** Given last time 180 kg × 12 and a set of 180 kg × 13 ticked, then the
  badge reads "Most reps · 13 (was 12)" (or the equivalent in the other language
  and unit), and no bare "+3".
- **AC-2.** Given a set that also beat the best set volume and the estimated 1RM,
  then the badge reads the main record and "and 2 more records".
- **AC-3.** Given the phone in airplane mode when a workout starts, then each
  exercise shows "records unavailable (no connection)"; given the connection
  back, then within a minute (or at once on returning to the app) the sign goes
  and the done sets are judged.
- **AC-4.** Given an exercise never performed, then no badge and no
  "unavailable" sign.
- **AC-5.** Given the owner's account on the current server, when a workout is
  started from each routine in use, then every exercise that has history shows
  badges for sets that beat it, or the sign.
- **AC-6.** Given a workout started before this change and reopened after it,
  then its exercises are judged as in FR-10.

## Non-functional requirements

- No new request for exercises already loaded; loading again only for those
  missing.
- Works offline once the records are loaded (0032 FR-3, unchanged).
- iOS, Android and web; no native rebuild.

## Assumptions

- **[ASSUMPTION: "+3" means what it does in the code — the number of further
  records — not a difference in reps. The numbers on the owner's screenshots are
  consistent with this (a set of 13 reps at 180 kg beats most reps, reps at that
  weight, set volume and estimated 1RM: four records, "+3").]**
- **[ASSUMPTION: "(was 12)" is the previous *best* of that record, which may
  differ from "last time" on the same row; saying so is the point. It settles
  the owner's *"no me cuadra"* only if those two differ; if they do not, see the
  second open decision.]**

## Open decisions

- **[NEEDS DECISION: for which exercises, and in which workouts, was a badge
  missing when a record was really beaten? "Aunque en búlgaras sí, pero solo en
  esa" says the Bulgarian split squat worked; the owner's screenshots also show
  badges on the leg curl and the leg press. A concrete case — exercise, the
  weight and reps ticked, what "last time" showed — lets the plan separate "the
  app could not judge" from "it was not a record by the rules". Until then FR-5
  to FR-10 make the app say which it is.]**
- **[NEEDS DECISION: the owner's note on the "+3" ends mid-sentence ("pone +3
  cuando …"). Was it "+3 when the difference was 1" (the reading assumed here),
  or did the previous best the badge was judged against differ from "last time"
  and the number looks wrong for that reason too?]**

## Verified against the code (2026-10-27)

- A badge is judged against the starting records loaded for each exercise when
  it entered the workout and kept with the workout. With none loaded the
  exercise shows no badge at all and nothing else; there is no sign of it.
- Loading is retried every 30 seconds while the screen is open, but a refusal
  from the server (any client error except sign-in, time-out and too-many-
  requests) stops the attempts for the rest of that workout, silently.
- An exercise with no earlier performed set has no starting values and so can
  never earn a badge, by design (0032 FR-8).
- Only performed working sets are judged; warm-ups never are.
- The badge's text is the first record beaten, in display order, then "+N" with
  N = the number of further records the same set beat. N is not a figure
  difference. The label is the same text in Spanish and English.
- Records are keyed to the exercise in the workout. The catalog change of
  2026-10-21 carried retired exercises' history over to reviewed ones where they
  matched (0044); an exercise that did not match keeps its own history under its
  own identity. Whether any of the owner's exercises lost a link was **not**
  checked here: it needs the owner's data on the server.

## Related

- Amends: 0032 (FR-13: the badge text; EF-1: silent absence).
- Builds on: 0023 (record types), 0044 (catalog, FR-5/FR-6), 0010 (kept with the
  workout).
- Roadmap: docs/roadmap/04-progress-and-prs.md
- Constitution articles engaged: 3, 4, 10
