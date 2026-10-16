---
spec: 0028
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Plan — Share a workout

Mobile only. No contract, schema or API change.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Text only, from the summary and the detail. No image card, no links. |
| 2 — Template vs performed | no | Reads a performed session only. |
| 3 — Shared domain types | no | Nothing in `packages/domain` changes. |
| 4 — Weight in kg | yes | The helper takes kg and converts to the display unit at the edge with `formatWeightValue`; nothing is stored. |
| 5 — Prisma migrations | no | |
| 6 — Integrations behind interfaces | no | The share sheet is React Native's built-in `Share`. |
| 7 — Secrets | no | |
| 8 — Committable + verified | yes | Two code commits, each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | no | None added. |
| 10 — TODOs over half-solutions | yes | Marking records (FR-3) waits for 0023: a TODO in the helper. |

## Current state

- The summary (`WorkoutSummaryScreen`) renders from the local draft: it has
  the routine name, the unit, and per-set "done" flags.
- The detail (`WorkoutSessionDetailScreen`) renders a saved `WorkoutSession`
  (no routine name, `performed` per set) in the settings unit.

## Approach

### 1. Pure formatter (FR-2)

`features/workouts/utils/shareText.ts` exports `formatWorkoutShareText(input)`.
Input: optional `title` (routine name), `when` (ISO), `durationSeconds` (or
null), `volumeKg`, `unit`, `language`, `exercises` (name and sets with kg,
reps, type, performed), optional `notes`, and a `t` function. Output, one line
per item:

```
Torso A
Thursday, October 16
Duration 52:10 · Volume 4120 kg

Bench press
1. 60 kg × 10 (Warmup)
2. 80 kg × 8
```

Only performed sets are listed, and an exercise with none is omitted
(**[ASSUMPTION: unticked sets and exercises with no performed set are left
out]**, from the spec). The detail has no routine name (a saved session does
not carry it), so there the title line is the date only
(**[ASSUMPTION]**). Date through `formatDayHeading`, weights through
`formatWeightValue`, labels through `workouts.share.*` and the existing
`workouts.setType.*`. Unit-tested in both languages and both units.

### 2. Share button on both screens (FR-1, EF-1)

`shareWorkout(text)` next to the formatter calls `Share.share({ message })`.
Cancelling resolves with `dismissedAction` and does nothing (EF-1); a
rejection is ignored too (**[ASSUMPTION: a failed share shows no error of our
own]**). Each screen gets a secondary `Button` ("Share") that builds the text
from what it holds. Edits stay small because spec 0023 edits the same
screens.

## Risks

- FR-3 (records marked) is not met until 0023 exposes records: TODO in the
  helper. The share sheet opening on a phone is a device check.
