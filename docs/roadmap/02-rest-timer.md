# 2. Rest timer

A configurable countdown timer between sets, like Hevy.

## Checklist
- [x] Countdown timer with configurable duration
- [x] Auto-start when a set is marked done
- [x] Notification / vibration when it finishes (vibration)
- [x] Keeps running outside the active workout screen and across restarts;
  rest per exercise editable mid-workout (spec 0018)
- [x] Alert when the rest ends with the app in the background or the phone
  locked; countdown on the lock screen (spec 0018, iOS — device check pending)

## Progress log
- Countdown (useRestTimer), presets 60/90/120s, auto-start on set done, and a
  double vibration on completion. **Point 2 complete** for foreground use.
- Follow-up: background OS notifications (so it fires when the app is backgrounded)
  need `expo-notifications` (install + permissions + a scheduled local
  notification). Deferred — vibration covers the foreground case.
- (2026-10-16 → 2026-10-17) Spec 0018 — rest timer that keeps running. The
  running rest lives in the active workout (an end instant, persisted with
  0010), so it survives leaving the screen and restarting the app; one
  app-wide runner schedules, reschedules and cancels it. Rest per exercise:
  manual → routine → Settings default; a chip on each exercise header opens a
  sheet to change it for this workout only (the routine is untouched). A
  `RestBar` pinned at the bottom (−15 s / +15 s / Skip) replaces the old rest
  card and `useRestTimer`; the workout bar shows the countdown on other
  screens; when a rest ends the next set to do (superset order respected)
  scrolls into view. Outside the app a local notification ("Rest over",
  "Next: {exercise}") from a new local module `modules/rest-alert` buzzes the
  phone and a paired watch; skip, a new rest, finish or discard cancel it. The
  Live Activity shows the rest countdown on the lock screen and compact
  Dynamic Island. Needs `expo prebuild` + a device rebuild; Android alerts are
  a TODO. Device checks pending (permission, alert, skip, restart, lock
  screen).

## Design notes
- Reuse `useElapsedSeconds`/`formatDuration` patterns; a countdown hook
  (`useCountdown(seconds)`) with start/stop/reset.
- Default rest duration stored per app (later: per-exercise / settings). Start
  with a module-level default + quick presets (60/90/120s).
- Vibration: `react-native` `Vibration` API (no dep). Background notification
  needs `expo-notifications` (install + config) — do vibration first, note the
  dep for notifications.
- Surface the rest timer on the active workout screen; auto-start on set "done".

