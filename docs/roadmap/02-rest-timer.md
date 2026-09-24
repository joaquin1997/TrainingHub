# 2. Rest timer

A configurable countdown timer between sets, like Hevy.

## Checklist
- [x] Countdown timer with configurable duration
- [x] Auto-start when a set is marked done
- [x] Notification / vibration when it finishes (vibration)

## Progress log
- Countdown (useRestTimer), presets 60/90/120s, auto-start on set done, and a
  double vibration on completion. **Point 2 complete** for foreground use.
- Follow-up: background OS notifications (so it fires when the app is backgrounded)
  need `expo-notifications` (install + permissions + a scheduled local
  notification). Deferred — vibration covers the foreground case.

## Design notes
- Reuse `useElapsedSeconds`/`formatDuration` patterns; a countdown hook
  (`useCountdown(seconds)`) with start/stop/reset.
- Default rest duration stored per app (later: per-exercise / settings). Start
  with a module-level default + quick presets (60/90/120s).
- Vibration: `react-native` `Vibration` API (no dep). Background notification
  needs `expo-notifications` (install + config) — do vibration first, note the
  dep for notifications.
- Surface the rest timer on the active workout screen; auto-start on set "done".

