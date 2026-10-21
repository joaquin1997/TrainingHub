---
spec: 0041
status: in-progress
created: 2026-10-21
---

# Tasks — Widget redesign and reps on the watch

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| [x] 1 | Watch contract: `reps`, `load` on the current set; `reps` on `setDone` | domain / mobile | unit tests | `feat(watch): reps of the set to do in the watch contract` |
| [x] 2 | Watch app: reps control (crown, −/+), sent with Done | watch | swiftc typecheck (watchOS) | `feat(watch): change the reps before ticking` |
| [x] 3 | Widget snapshot: today's exercises and last time, workouts this week, active progress, next set and rest; pushed on every tick | mobile | unit tests | `feat(widget): richer snapshot, refreshed on every tick` |
| [x] 4 | Widget redesign: light/dark, centred, large and inline sizes, workout view with ring, next set and rest | widget | swiftc typecheck; renders on the Mac in both modes | `feat(widget): redesign` |
| [ ] 5 | **[DEVICE]** rebuild (with 0040's), AC-1–AC-6 | owner | — | — |

## Progress log

- 2026-10-21 — Spec, plan and tasks self-approved.
- 2026-10-21 — Tasks 1–4 landed on `feat/sdd-0040-device-fixes` (tasks 1
  and 2 in one commit). Watch: `reps`/`load` on the current set, a reps
  control (− / + / crown, 0–100) seeded per set, `reps` on Done; the phone
  stores them through `updateWorkoutSetDraft` before ticking, ignores them on
  a set already done; older builds on either side keep the planned reps.
  Swift typechecked against watchOS 11. Widget: snapshot with today's
  exercises and last time, workouts this week, sets done/total, the set to do
  and the rest (pushed on every change of those); views rewritten with the
  app's light and dark tokens, centred, new large and inline sizes, a ring
  during a workout and the rest as the main figure; a timeline entry at the
  rest's end. Typechecked against iOS 17 and rendered on the Mac through
  `HomeWidgetContent` (renders in `renders/`; the Mac cannot draw `Link`, so
  the render shows the button's look; relative dates come out in the Mac's
  language). Lock-screen sizes not rendered (unavailable on macOS).
