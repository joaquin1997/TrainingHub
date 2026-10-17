---
id: 0015
title: Custom exercises are private
status: in-progress
roadmap: docs/roadmap/06-exercises-advanced.md
created: 2026-10-17
---

# Custom exercises are private

> **No technology in this file.** No file paths, no library names, no endpoint
> shapes, no schema. Those go in `plan.md`. See `../README.md`.

## Problem

Owner decision, 2026-10-17 (verbatim): *"Los ejercicios propios deben ser
solamente visibles por cada usuario que lo creó."* — a custom exercise must be
visible only to the person who created it. This confirms the direction first
recorded on 2026-09-24 (retro-spec 0007).

Today every custom exercise is visible to, and usable by, everyone on the
server. Verified against the current behaviour (2026-10-17):

- **Catalog and search.** The catalog lists every exercise of every person,
  with no regard to who is asking — the Exercises tab, search, the favourites
  filter and every picker (routine builder, add and replace in the workout,
  spec 0020) all read from it. A request without a signed-in person gets the
  same full list.
- **Detail.** Anyone can open any custom exercise's detail by its identifier.
- **Create with the same name.** Creating an exercise whose name matches an
  existing one (ignoring case) returns that existing exercise instead of
  creating a new one — whoever created it. Typing "Hammer row" can silently
  hand someone another person's "Hammer row", with its muscles, tracking type,
  unilateral mark and photo.
- **Routines.** A routine may include any exercise that exists, including
  another person's custom one; the routine keeps the exercise's name as it was
  when added.
- **Saved workouts.** A workout is accepted when every exercise in it merely
  exists, so it may contain another person's custom exercise. History shows
  each exercise's *current* name, read from the exercise itself — if its
  creator renamed it (not possible yet), someone else's history would change.
- **Favourites.** Anyone can favourite any exercise, including another
  person's custom one.
- **Photo (spec 0026).** Only the creator can set or remove it, but anyone
  signed in can view it once they know the exercise.
- **Unilateral mark (spec 0022).** Only the creator can change it on a custom
  exercise; anyone signed in can change it on a catalog exercise, and the
  change applies to everyone.
- **Tracking type (spec 0021, 0030).** Set at creation; no one can change it
  afterwards yet. Spec 0030 plans the same rule as the unilateral mark.
- **"Last time" and progress for an exercise** are already limited to the
  person's own workouts: asking about someone else's exercise shows nothing of
  theirs, only "no data".

## Why now

The owner decided it explicitly. It was agreed (2026-09-24) to ship before the
app is shared beyond the household, next to auth session hardening (spec
0001), because once more people use the server their custom exercises mix into
each other's pickers and the same-name rule starts handing people each other's
exercises. Each day it is deferred, more routines and workouts may come to
reference someone else's exercise, which this spec then has to carry along.
Spec 0033 (delete custom exercises) is simpler once this is in place.

## Users and scenarios

- **Two people, one server.** Ana creates "Hip thrust (máquina gym)". Ben
  must not see it in his catalog, search, pickers or favourites.
- **Same name.** Ben, later, creates his own "Hip thrust (máquina gym)". He
  gets a new exercise of his own, not Ana's.
- **Catalog name.** Ana types "Sentadilla" and the catalog already has it; she
  gets the catalog exercise, as today, rather than a private duplicate.
- **Guessing.** Ben somehow has the identifier of Ana's exercise and asks for
  its detail, its photo, or to favourite it. He is told it does not exist —
  the same answer as for an identifier that never existed.
- **Already shared.** Before this ships, Ben picked Ana's custom exercise into
  one of his routines and logged it in 12 workouts. After it ships, his
  routine still works and his 12 workouts still read correctly, but the
  exercise no longer shows in his catalog or pickers.
- **My own settings.** Ana marks her own custom exercise as unilateral or
  changes its tracking type; Ben cannot change either.

## Scope

### In scope
- Who can see and use a custom exercise: its creator, plus the catalog
  (system) exercises for everyone.
- The catalog, search, favourites filter, every exercise picker and the
  exercise detail.
- The same-name rule on creation.
- Favourites and photos.
- Who may change a custom exercise's per-exercise settings (unilateral mark,
  tracking type).
- What happens to routines, workouts and history that already reference
  another person's custom exercise.

### Out of scope
- **Sharing** a custom exercise with someone on purpose, or a shared routine
  that carries its custom exercises along — social features (roadmap area 7).
- **Copying** someone else's custom exercise into my own (see Assumptions).
- **Per-person settings for catalog exercises** (unilateral mark, tracking
  type) — recorded as an open item below, not solved here.
- **Editing** a custom exercise (rename, muscles) — follow-up, as in 0033.
- **Deleting** a custom exercise — spec 0033.
- **Merging** two people's same-named exercises into one.
- Catalog (system) exercises themselves — unchanged, visible to everyone.

## Functional requirements

Visibility

- **FR-1.** The catalog, search, the favourites filter and every exercise
  picker MUST show only catalog exercises and the person's own custom
  exercises.
- **FR-2.** Asking for the detail, the photo, or any exercise-specific action
  (favourite, unilateral mark, tracking type) on another person's custom
  exercise MUST answer exactly as for an exercise that does not exist. The
  answer MUST NOT reveal that it exists, who created it, or its name — except
  as stated in FR-8.
- **FR-3.** Nothing a person can see MUST reveal the existence of another
  person's custom exercises (counts, facets such as category or equipment
  chips, suggestions).

Creating

- **FR-4.** Creating an exercise whose name matches (ignoring case) a catalog
  exercise or one of the person's own custom exercises MUST return that
  exercise, as today. A deleted exercise (spec 0033) does not count.
- **FR-5.** Creating an exercise whose name matches only another person's
  custom exercise MUST create a new custom exercise owned by the person
  creating it. The other person's exercise MUST NOT be returned or changed.

Using

- **FR-6.** A routine or workout MUST NOT gain another person's custom
  exercise: saving a routine or a workout that introduces one MUST be refused
  as if the exercise did not exist, unless FR-7 applies.
- **FR-7.** An exercise of someone else that a person's routines or saved
  workouts already contained before this ships (a **held exercise**) MUST keep
  working where it is: the routine still shows, starts, and saves when edited;
  a workout started from it still saves (including saves that were waiting
  offline); the saved workouts still show it.
- **FR-8.** Wherever a held exercise already appears in the person's own data
  (routine, active workout, history, workout detail, sharing per 0028,
  progress, records, "last time"), it MUST show under its name with every set.
  This is the only place another person's custom exercise is ever named.
- **FR-9.** A held exercise MUST NOT appear in the person's catalog, search or
  pickers, and MUST NOT be addable anew to any routine or workout. The person
  MAY replace it (spec 0020) or remove it from a routine as any other.
- **FR-10.** "Last time" and progress for an exercise MUST stay limited to the
  person's own performed work (as today) and MUST answer "no data" — not
  "forbidden" — for any exercise the person never performed.

Favourites and photos

- **FR-11.** A person MUST be able to favourite only exercises they can see
  (FR-1). Favouriting another person's custom exercise MUST answer as not
  found.
- **FR-12.** Existing favourites of another person's custom exercises MUST NOT
  appear anywhere for the person who made them.
- **FR-13.** A custom exercise's photo MUST be shown only to its creator. A
  held exercise shows the neutral tile to everyone else.

Per-exercise settings

- **FR-14.** Only the creator MUST be able to change a custom exercise's
  unilateral mark and tracking type (when 0030 adds that control). For anyone
  else the exercise does not exist (FR-2).
- **FR-15.** For catalog exercises, who may change these settings and whether
  a change applies to everyone stays as today (0022, 0030) — see Open items.

## Behaviour when things go wrong

- **EF-1.** A workout saved offline before this ships, containing another
  person's custom exercise the person had in a routine, MUST still save (FR-7);
  it MUST NOT become permanently rejected (spec 0014).
- **EF-2.** A workout that contains another person's custom exercise that is
  *not* held (e.g. a crafted request) MUST be refused as an unknown exercise,
  the same answer as today for an exercise that does not exist.
- **EF-3.** When the creator of a custom exercise no longer exists, the
  exercise MUST be visible to nobody in the catalog; people holding it keep
  it per FR-7 and FR-8.
- **EF-4.** A device that still shows another person's custom exercise from a
  list loaded before this ships MUST get "not found" if it is picked, with a
  clear message, and the lists MUST refresh.
- **EF-5.** Two people creating the same new name at the same moment MUST end
  up with one exercise each, never sharing one.

## Domain impact

- **Exercise** gains a visibility rule: a catalog exercise is visible to
  everyone; a custom exercise only to its creator.
- New glossary term **held exercise**: another person's custom exercise that
  someone's routines or saved workouts contained before this spec; readable
  there, never pickable. Same reading behaviour as a **deleted exercise**
  (0033): kept where it already is, gone from catalog and pickers.
- **Routine / RoutineExercise / WorkoutSession / WorkoutExercise / WorkoutSet**
  are read, never rewritten (Article 2). No reference is moved to a copy.
- **Personal records, session points, training volume** are unchanged; already
  per person.
- **Favourites** and **photos** follow exercise visibility.

## Acceptance criteria

- **AC-1.** Given Ana created "Hip thrust (máquina gym)", when Ben opens the
  Exercises tab, searches "hip thrust", filters favourites or opens any
  picker, then he does not see it; Ana does.
- **AC-2.** Given Ben has the identifier of Ana's exercise, when he asks for its
  detail, its photo, to favourite it, or to mark it unilateral, then each
  answer is the same "not found" as for an identifier that never existed.
- **AC-3.** Given Ana's "Hip thrust (máquina gym)", when Ben creates "hip
  thrust (Máquina gym)", then he gets a new exercise of his own, and Ana's is
  unchanged.
- **AC-4.** Given the catalog has "Sentadilla", when Ana creates "sentadilla",
  then she gets the catalog exercise; given Ana already has her own "Remo
  Hammer", when she creates "remo hammer", then she gets hers.
- **AC-5.** Given Ben's routine and 12 saved workouts contain Ana's custom
  exercise from before, when this ships, then the routine shows it, starts,
  saves when edited, and its workout saves; the 12 workouts show it by name
  with every set; its progress and records still show; it is in none of his
  pickers; its photo shows as the neutral tile.
- **AC-6.** Given Ben has no routine or workout with Ana's exercise, when a
  workout or routine containing it is sent on his behalf, then it is refused
  as an unknown exercise.
- **AC-7.** Given Ben had favourited Ana's exercise before, when this ships,
  then his favourites filter does not show it.
- **AC-8.** Given Ana's own custom exercise, when she opens its detail, then she
  can change its unilateral mark (and tracking type once 0030 ships); Ben
  cannot reach it at all.
- **AC-9.** Given someone not signed in, when they browse the catalog, then they
  see catalog exercises plus only the transitional fallback account's own
  custom exercises (see Assumptions), never those of signed-in people.

## Non-functional requirements

- Same behaviour on iOS, Android and web.
- **Existing data.** No routine, saved workout or set is changed, moved or
  lost when this ships. References to other people's custom exercises stay as
  they are (FR-7).

## Assumptions

- **[ASSUMPTION: existing references stay read-only rather than becoming a
  private copy per person.]** A held exercise keeps working where it already
  is (FR-7, FR-8) and is never pickable (FR-9). A per-person copy was rejected:
  it means rewriting the exercise reference of saved workouts, which
  Article 2 forbids in spirit (performed work is not rewritten), duplicates
  photos and settings, and splits "last time" and progress for nobody's
  benefit. On today's single-household server the number of such references
  is small. Cheap to reverse: a copy can still be made later from a held
  reference.
- **[ASSUMPTION: a held exercise is identified by the person's own data — it
  appears in one of their routines or saved workouts — not by a stored list.]**
  So it needs no migration of data, and a reference removed from the last
  routine and never logged stops being held.
- **[ASSUMPTION: the creator may still change a held exercise's settings
  (unilateral mark, tracking type), and the holder sees the change.]** Saved
  workouts already show their own values (0021 EF-1); only the routine and new
  workouts follow. Rare, and the holder can replace the exercise.
- **[ASSUMPTION: the photo of a held exercise is not shown to the holder
  (FR-13).]** The owner's rule is "visible only to the creator"; the name is
  what keeps history readable, the photo is not — same reasoning as 0033.
- **[ASSUMPTION: matching the name of another person's exercise is not
  revealed (FR-5).]** No "this name is taken" message.
- **[ASSUMPTION: a request without a signed-in person is treated as the
  account it falls back to today (the dev user, spec 0001), with no special
  case.]** It sees catalog exercises plus that account's own. When 0001
  removes the fallback, the same rule applies to whatever replaces it.
- **[ASSUMPTION: favourites of other people's custom exercises are hidden, not
  kept for later.]** Removing them outright is equally acceptable; neither is
  observable.
- **[ASSUMPTION: this spec ships before 0033 and 0033 depends on it.]** 0033's
  counts and "who else uses it" questions reduce to the creator's own data plus
  held references.

## Open decisions

None blocking. One open item, deliberately left for a later spec:

- **Catalog exercise settings: shared or per person?** Today the unilateral
  mark of a catalog exercise (0022) — and, with 0030, its tracking type — is
  one value shared by everyone on the server, and any signed-in person can
  change it. With private custom exercises that is now the one place where one
  person's choice changes another's app. Whether these settings should become
  per person (each person's own preference over the catalog's default), stay
  shared with a restricted editor, or stay as they are, is a product call for
  before distribution. `TODO(sdd): decide shared vs per-person catalog
  settings — owner decision; would become its own spec touching 0022 and
  0030.`

## Related

- Builds on: 0007 (retro exercises; first recorded the gap), 0020 (create and
  replace), 0022 (unilateral), 0026 (photos), 0021 / 0030 (tracking type).
- Required by: 0033 (delete custom exercises).
- Related: 0001 (auth session hardening; ships alongside), 0013 (performed
  work), 0014 (workout save integrity — unknown exercises).
- Roadmap: docs/roadmap/06-exercises-advanced.md
- Constitution articles engaged: 1, 2, 3.
