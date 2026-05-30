# 2. Rest timer

A configurable countdown timer between sets, like Hevy.

## Checklist
- [ ] Countdown timer with configurable duration
- [ ] Auto-start when a set is marked done
- [ ] Notification / vibration when it finishes

## Design notes
- Reuse `useElapsedSeconds`/`formatDuration` patterns; a countdown hook
  (`useCountdown(seconds)`) with start/stop/reset.
- Default rest duration stored per app (later: per-exercise / settings). Start
  with a module-level default + quick presets (60/90/120s).
- Vibration: `react-native` `Vibration` API (no dep). Background notification
  needs `expo-notifications` (install + config) — do vibration first, note the
  dep for notifications.
- Surface the rest timer on the active workout screen; auto-start on set "done".

## Progress log
(append commit hashes + notes as sub-points land)
