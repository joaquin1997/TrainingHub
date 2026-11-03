---
spec: 0041
status: approved     # self-approved under the delegated gates, 2026-10-21
created: 2026-10-21
---

# Plan — Widget redesign and reps on the watch

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Two optional fields on the watch contract, a bigger widget snapshot, Swift views. No interactive widget, no weight on the watch, no per-side reps. |
| 2 — Template vs performed | yes | The widget reads routines (today's routine, its exercises) and saved workouts (last time); the watch writes reps on the active workout's set only. |
| 3 — Shared domain types | yes | `WatchWorkoutSet.reps?`, `WatchWorkoutSet.load?` and `setDone.reps?` in `packages/domain`. The widget snapshot stays in `features/homeWidget` (app ↔ extension only, as 0036). |
| 4 — Weight in kg | yes | The watch never sends weight. The widget shows the draft's display strings (already in the session unit). |
| 5 — Prisma migrations | no | Nothing stored on the server. |
| 6 — Integrations behind interfaces | yes | Through the existing `WatchWorkoutBridge` and `homeWidgetBridge`. |
| 8 — Committable + verified | yes | JS by unit tests; Swift by `swiftc -typecheck` against the iOS/watchOS SDKs and widget renders made on the Mac (ImageRenderer) for both modes. |
| 9 — Dependencies | no | None. Native rebuild needed. |

## Approach

**Watch.** The phone adds to the current set `reps` (planned, when the set
records reps on one side) and `load` (the other planned values, e.g.
"32.5 kg"). The watch shows a reps control (crown + −/+) seeded from `reps`
each time the set changes, and sends `reps` with `setDone`. The phone, on a
`setDone` with `reps`, writes them into the set (`updateWorkoutSetDraft`,
the same path as typing) and then ticks as today. All new fields are
optional: older builds on either side ignore them (EF-2).

**Widget.** The snapshot gains, all optional so an older widget still
decodes: `history.today.exerciseCount/exercises/lastDoneMs`,
`history.workoutsThisWeek`, `active.upNext/setsDone/setsTotal/restEndsAtMs`
and the new labels. The sync key of the active workout includes sets done,
up next and the rest, so a tick pushes the widget (FR-8). Swift: a palette
per colour scheme from the app's tokens; every view takes the family as a
parameter so it can be rendered on the Mac for review; the timeline adds an
entry at the rest's end so the countdown goes away (FR-6).

### Alternatives considered
- **Interactive widget (tick from the home screen)** — out of scope; needs
  App Intents writing to the app's draft, a much larger change.
- **Weight and reps on the watch** — reps were asked for; weight doubles the
  UI and the crown's meaning.

## Files

- `packages/domain/src/health.ts` — watch contract fields.
- `apps/mobile/src/features/workouts/watch/watchProtocol.ts` (+ test).
- `apps/mobile/src/features/health/providers/appleWatchWire.ts` (+ test).
- `apps/mobile/targets/watch/WatchWire.swift`, `WorkoutModel.swift`,
  `WorkoutView.swift`; `modules/watch-workout/wire.test.mjs` keys.
- `apps/mobile/src/features/homeWidget/snapshot.ts` (+ test),
  `useHomeWidgetSync.ts`, i18n `widget.*`.
- `apps/mobile/targets/workout-activity/HomeWidget.swift`.
