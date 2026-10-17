---
spec: 0038
status: in-progress  # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Tasks — Light theme

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [ ] Plan and tasks; spec `in-progress` | docs | — | `docs(sdd): plan and tasks for 0038` |
| 2 | [ ] `Appearance` setting in domain + API (migration) | domain + api | api tests | `feat(settings): appearance setting on the account` |
| 3 | [ ] Runtime colours: palettes, proxy `colors`, `createStyles`, `useTheme` in every component (dark only) | mobile | typecheck; web unchanged | `refactor(ui): colours resolved at render time` |
| 4 | [ ] Ink shades and the light palette; contrast test over both themes | mobile | unit tests | `feat(ui): light palette with ink shades` |
| 5 | [ ] Theme provider, Appearance in Settings, remembered choice, system surfaces, keyboards, share card fixed dark, image tile edge | mobile | web light/dark | `feat(ui): light theme and appearance setting` |
| 6 | [ ] Live Activity follows the system appearance | native | swiftc; **native rebuild** | `feat(live-status): light and dark lock-screen status` |
| 7 | [ ] Progress log, backlog, roadmap | docs | — | `docs(sdd): record 0038 implementation` |
| 8 | [ ] [DEPLOY] migration `add_user_appearance`, API redeploy | server | owner | — |
| 9 | [ ] [DEVICE] AC-5 – AC-8, AC-13 on the iPhone | device | owner | — |

## Progress log
