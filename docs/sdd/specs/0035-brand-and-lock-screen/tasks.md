---
spec: 0035
status: in-progress  # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Tasks — Brand, home header and lock-screen status

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
No API change, no migration. Tasks 6–8 change native code and ride the
owner's next device rebuild.

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [ ] Plan and tasks; spec status `in-progress` | docs | — | `docs(sdd): plan and tasks for 0035` |
| 2 | [ ] `lib/week.ts`, `todaysRoutine`, `weekComparison`, `discardMessage` with tests | mobile | unit tests | `feat(home): week, streak and today's routine derivations` |
| 3 | [ ] `BrandMark`; mark in `ScreenTitle` and in the Routines/History empty states | mobile | typecheck; web | `feat(ui): brand mark on tab roots and first empty states` |
| 4 | [ ] Routines home header (greeting, chips, Today card); Progress week summary, latest record, streak from the shared definition | mobile | unit tests; web | `feat(home): greeting, week chips and today's routine` |
| 5 | [ ] History week strip with day filter | mobile | web | `feat(history): week strip filters the list by day` |
| 6 | [ ] Discard link (`action=discard`) with counted confirmation, stale-link notice | mobile | unit tests | `feat(workouts): discard from the live status with confirmation` |
| 7 | [ ] Live status: up-next, sets ring, rest-first layout, brand mark, discard link; payload + controller push progress | mobile + native | unit tests; **native rebuild** | `feat(live-status): up next, sets ring and brand mark` |
| 8 | [ ] Watch: discard in a secondary menu with confirmation, not when disconnected; Smart Stack shows up next and sets | mobile + native | unit tests; **native rebuild** | `feat(watch): discard from the watch menu` |
| 9 | [ ] iOS 18 dark and tinted icon variants | mobile | config test; **native rebuild** | `feat(ui): dark and tinted iOS icons` |
| 10 | [ ] Progress log, backlog, roadmap | docs | — | `docs(sdd): record 0035 implementation` |
| 11 | [ ] [DEVICE] AC-9 tab icons, AC-10 VoiceOver, AC-11 – AC-20 on iPhone + watch | device | owner | — |

## Progress log
