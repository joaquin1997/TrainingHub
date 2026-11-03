---
id: 0040
title: Fixes from the device test of 2026-10-21
status: in-progress
roadmap: docs/roadmap/01-live-workout-logging.md
created: 2026-10-21
decided: 2026-10-21
---

# Fixes from the device test of 2026-10-21

> **No technology in this file.** See `../README.md`.

## Problem

The owner used the app for a real session and listed what got in the way
(2026-10-21). Most are defects in behaviour already specified; a few are
small additions. This spec gathers the ones with a clear answer; the rest
are listed under *Open* until the owner says what they mean.

## Requirements

- **FR-1. Set numbers count working sets only.** Warm-ups and working sets
  are numbered apart, each from 1: after three warm-ups the first working
  set is set 1, not 4 — in the workout row, the compact header, the rest
  bar and the rest-over alert, the watch ("Warm-up 2 of 3", "Set 1 of 3"),
  the summary and the workout detail. Drop and failure sets are working
  sets and keep their place in the count.
  `[ASSUMPTION: drop and failure sets count as working sets, as they do for
  superset rounds.]`
- **FR-2. The set to do now is always outlined.** A generated warm-up that
  is up next shows the up-next outline instead of its warm-up mark; the
  other generated warm-ups keep the mark. Amends spec 0034 FR-19's priority,
  which put the warm-up mark first and left no outline on screen while a
  generated warm-up was next.
- **FR-3. No 0:00 on the lock screen.** Once a rest ends, the lock-screen
  and Dynamic Island status shows the workout clock, never a countdown
  stopped at 0:00 — also when the status is updated after the end (e.g. a
  calorie refresh) and before the app clears the rest.
- **FR-4. The rest-over alert also shows with the app open.** When a rest
  ends with the app in front, the system alert appears as a banner too, not
  only the vibration.
- **FR-5. A rest end that can be felt.** The in-app signal at the end of a
  rest is a full vibration (the set timer's), on top of the haptic knock.
  `[ASSUMPTION: stronger by default instead of a setting; a setting is added
  only if the owner still finds it weak.]`
- **FR-6. Share as text works every time.** Choosing "Share as text" opens
  the system share sheet every time, not only sometimes.
- **FR-7. Body weight with two decimals.** A body weight in kg keeps two
  decimals (78.35 kg) when saved, shown and edited. In lb one decimal is
  kept, so a weight logged in kg does not read as 181.66 lb.
  `[ASSUMPTION: "permitir 2 dígitos" means two decimals.]`
- **FR-8. Shorter rest after a warm-up.** Ticking a warm-up starts a rest of
  at most 1:00 (the exercise's rest when shorter; none when it is off).
  Working sets keep the exercise's rest. The watch shows the same rest.
  `[ASSUMPTION: a fixed 1:00 cap rather than a new setting.]`
- **FR-9. History moves between weeks.** Arrows on the week strip go to the
  week before or after, down to the first week with a workout and up to this
  week. This week lists every workout, as before; an earlier week lists only
  its own workouts, with "Show all" back to this week. Picking a day still
  filters to that day.

## Open (owner to clarify)

- *"Si quieres iniciar otro entrenamiento te tiene que decir…"* — already
  built by spec 0019 (ask, save when a set is done, discard otherwise) from
  Routines and the routine detail. Which way of starting skipped the
  question?
- *"Hacer más manejable el progreso por ejercicio"* — what is hard: the
  length of the list, finding an exercise, the detail screen?
- *"La aplicación del reloj no cambia de color con el móvil"* — the watch
  app is always dark, as watchOS apps are; is it that, or the accent colour?
- *"Cambiar el número de repes hechas en el reloj"* — a feature (edit reps
  on the watch before ticking); its own spec.
- *"Arreglar un poco el widget"* — what looks wrong?
- *"Revisar calentamientos"* — FR-1 and FR-2 cover what the screenshot
  shows; anything else?

## Acceptance criteria

- **AC-1.** Three warm-ups and three working sets read C, C, C, 1, 2, 3 on
  the row; the rest bar after the third warm-up says "set 1"; the watch says
  "Set 1 of 3". (FR-1)
- **AC-2.** With a generated warm-up up next, its status area is outlined.
  (FR-2)
- **AC-3.** After a rest ends with the phone locked, the lock screen shows
  the workout clock, never 0:00. (FR-3, device)
- **AC-4.** A rest ending with the app open shows the banner and vibrates
  clearly. (FR-4, FR-5, device, needs a rebuild)
- **AC-5.** "Share as text" from the summary and the detail opens the share
  sheet five times in a row. (FR-6, device)
- **AC-6.** 78.35 kg saved, reopened and listed reads 78.35 kg. (FR-7)
- **AC-7.** Ticking a warm-up of an exercise with 2:30 rest starts 1:00.
  (FR-8)
- **AC-8.** History goes back week by week to the first workout and forward
  to this week; an empty week says so. (FR-9)
