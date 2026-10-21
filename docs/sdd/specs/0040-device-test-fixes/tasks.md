---
spec: 0040
status: in-progress
created: 2026-10-21
---

# Tasks — Fixes from the device test of 2026-10-21

Small fixes in behaviour already specified; no plan of its own (the files
are those of the specs each FR amends). Self-approved under the delegated
gates (2026-10-16).

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| [x] 1 | FR-1: one helper numbers sets by kind; used by row, header, rest label, watch, summary, detail | domain / mobile | unit tests | `fix(workouts): number working sets apart from warm-ups` |
| [x] 2 | FR-2: up next before the warm-up mark | mobile | unit test | `fix(workouts): keep the up-next outline on generated warm-ups` |
| [x] 3 | FR-3: drop an ended rest in the bridge, the native module and the widget view | mobile / native | unit test; device | `fix(live-status): no 0:00 countdown after a rest ends` |
| [x] 4 | FR-4: notification-center delegate in `rest-alert` presents the rest alert in front | native | swiftc typecheck; device **[rebuild]** | `fix(rest-timer): show the rest-over alert with the app in front` |
| [x] 5 | FR-5: full vibration at rest end | mobile | device | `fix(rest-timer): stronger vibration when a rest ends` |
| [x] 6 | FR-6: text share waits for the sheet's dismissal (fallback 600 ms) | mobile | device | `fix(share): open the text share once the sheet has closed` |
| [x] 7 | FR-7: two decimals for body weight in kg | mobile | unit tests | `fix(profile): body weight keeps two decimals in kg` |
| [x] 8 | FR-8: warm-up rest capped at 60 s | mobile | unit tests | `feat(rest-timer): shorter rest after a warm-up` |
| [x] 9 | FR-9: week arrows on History | mobile | unit tests (week helpers); device | `feat(history): move between weeks on the week strip` |
| [ ] 10 | **[DEVICE]** AC-1–AC-8 on the iPhone (+ watch for AC-1); task 4 and the widget part of task 3 need a native rebuild | owner | — | — |

## Progress log

- 2026-10-21 — Tasks 1–9 landed on `feat/sdd-0040-device-fixes`. Root
  causes: FR-1 rows showed the set's overall position; FR-2 the warm-up mark
  outranked up next (0034 FR-19); FR-3 every activity update after a rest
  recomputed the stale date as none while keeping the past end, so the
  countdown came back at 0:00; FR-4 iOS hides a local notification from the
  open app unless a delegate asks (0018's TODO); FR-6 the share sheet was
  presented while the modal was still closing, which iOS drops. The JS part
  of FR-3 works without a rebuild. Not checked on the web preview.
