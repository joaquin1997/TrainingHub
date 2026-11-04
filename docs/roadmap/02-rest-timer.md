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


## Spec review — 2026-11-03

- [0047](../sdd/specs/0047-watch-skip-rest/spec.md) is ready for watch Skip rest,
  including delayed delivery and alert cancellation; no implementation in this pass.

- Owner review of [0046](../sdd/specs/0046-set-rows-and-finish/spec.md)
  (2026-11-03): undo cancels only the active rest started by that particular
  completion, including its pending alert; unrelated rests remain intact.
  Spec updated, implementation pending.

- Planning update (2026-11-03): 0046 and 0047 now have approved plans and
  ordered unchecked tasks. No implementation/rollout in this pass; consult
  [the execution sequence](../sdd/reviews/2026-11-03-workout-implementation-sequence.md)
  for dependencies and acceptance gates. Earlier ready-state entries above
  record the spec-review stage, not the current planning state.

## Local implementation — 2026-11-04 (0047)

Specific-rest Watch Skip, acknowledgement, pending/restart reconciliation and alert cancellation are implemented locally; compilation/tests pass. Paired app installation and physical locked/offline/expiry checks remain pending.
