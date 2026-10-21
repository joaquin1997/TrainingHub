---
spec: 0041
status: in-progress
created: 2026-10-21
---

# Tasks — Widget redesign and reps on the watch

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| [ ] 1 | Watch contract: `reps`, `load` on the current set; `reps` on `setDone` | domain / mobile | unit tests | `feat(watch): reps of the set to do in the watch contract` |
| [ ] 2 | Watch app: reps control (crown, −/+), sent with Done | watch | swiftc typecheck (watchOS) | `feat(watch): change the reps before ticking` |
| [ ] 3 | Widget snapshot: today's exercises and last time, workouts this week, active progress, next set and rest; pushed on every tick | mobile | unit tests | `feat(widget): richer snapshot, refreshed on every tick` |
| [ ] 4 | Widget redesign: light/dark, centred, large and inline sizes, workout view with ring, next set and rest | widget | swiftc typecheck; renders on the Mac in both modes | `feat(widget): redesign` |
| [ ] 5 | **[DEVICE]** rebuild (with 0040's), AC-1–AC-6 | owner | — | — |

## Progress log

- 2026-10-21 — Spec, plan and tasks self-approved.
