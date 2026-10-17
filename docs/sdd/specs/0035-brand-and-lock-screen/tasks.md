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
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | — | `docs(sdd): plan and tasks for 0035` |
| 2 | [x] `lib/week.ts`, `todaysRoutine`, `weekComparison`, `discardMessage` with tests | mobile | unit tests | `feat(home): week, streak and today's routine derivations` |
| 3 | [x] `BrandMark`; mark in `ScreenTitle` and in the Routines/History empty states | mobile | typecheck; web | `feat(ui): brand mark on tab roots and first empty states` |
| 4 | [x] Routines home header (greeting, chips, Today card); Progress week summary, latest record, streak from the shared definition | mobile | unit tests; web | `feat(home): greeting, week chips and today's routine` |
| 5 | [x] History week strip with day filter | mobile | web | `feat(history): week strip filters the list by day` |
| 6 | [x] Discard link (`action=discard`) with counted confirmation, stale-link notice | mobile | unit tests | `feat(workouts): discard from the live status with confirmation` |
| 7 | [x] Live status: up-next, sets ring, rest-first layout, brand mark, discard link; payload + controller push progress | mobile + native | unit tests; **native rebuild** | `feat(live-status): up next, sets ring and brand mark` |
| 8 | [x] Watch: discard in a secondary menu with confirmation, not when disconnected; Smart Stack shows up next and sets | mobile + native | unit tests; **native rebuild** | `feat(watch): discard from the watch menu` |
| 9 | [x] iOS 18 dark and tinted icon variants | mobile | config test; **native rebuild** | `feat(ui): dark and tinted iOS icons` |
| 10 | [x] Progress log, backlog, roadmap | docs | — | `docs(sdd): record 0035 implementation` |
| 11 | [ ] [DEVICE] AC-9 tab icons, AC-10 VoiceOver, AC-11 – AC-20 on iPhone + watch | device | owner | — |

## Progress log

- (2026-10-18) Tasks 1–10 done; decided by the assistant under the delegated
  gates, revisable. **Derivations** (`lib/week.ts`, `todaysRoutine`,
  `weekComparison`, `greeting`, `discardMessage`) are pure and tested,
  local-time weeks Monday–Sunday. **Home**: `HomeHeader` under the Routines
  title (avatar → profile, greeting by time of day, streak chip hidden at 0,
  this-week chip, "Today: <routine>" card with Start); routines, workouts and
  profile load together, workouts/profile failures only hide their parts. The
  Today card re-reads the routine before starting (EF-5: 404 → one-line notice
  and reload). The avatar's "?" fallback became a neutral person mark (EF-2).
  **Progress**: week volume card (vs last week to the same point, last
  week's total), latest record card (newest workout's first record in display
  order), and the streak tile now uses the shared week streak — from the
  sessions when loaded, else `summarizeTrainingFrequency` with the new "ends
  this or last week" rule. **History**: `WeekStrip` (44 pt+ cells, today
  outlined, selected lime, future disabled) filters the list; empty day →
  "No workouts on <weekday>" + Show all. **Mark**: `ui/BrandMark` in
  `ScreenTitle` (all five tab roots) and `icon="brand"` in the Routines and
  History empty states. **Discard link**: `action=discard&workoutId=` →
  `resolveDiscardLink`; the confirmation (also the in-app button now) names
  the sets done; stale or other workout → "This workout has already ended"
  (`lib/notify`). **Live status**: payload gains `upNext`, `setsDone`,
  `setsTotal` (`liveUpNext` reuses the watch's `setTarget`, adds "Round n"
  in a superset); the controller also pushes when they change; native
  `setProgress` (optional in JS); attributes/state fields optional so old
  activities decode. Widget: traced `BrandMarkShape` replaces the dumbbell,
  lock screen shows up-next + green sets ring or, during a rest, a 40 pt
  orange countdown with "Next: …"; Discard is a small underlined link at the
  top right; island compact/minimal show the mark or the orange rest; Smart
  Stack shows up-next and "9/20". **Watch**: "More" → sheet → Discard →
  `confirmationDialog` with the phone-resolved message; sent with
  `sendMessage` only when reachable, else "Connect to your iPhone to
  discard"; `PhoneWatchLink` forwards live messages; the phone discards,
  gives the destructive haptic and goes to Routines. **Icon**: `icon-dark.png`
  / `icon-tinted.png` from `brand-assets.mjs` (now falls back to the system
  Chrome; adds a UTF-8 charset that file:// pages need); `ios.icon` object in
  app.json. Swift of the widget and the watch type-checked with `swiftc`
  against the iOS 18 / watchOS 10 SDKs; the native module compiles in the
  device build. Web preview (local API on PGlite, seeded PPL): Routines
  "Good afternoon, Joaquín", "4-week streak", "3 this week", "Today: Legs";
  History strip dots Mon/Wed/Fri; Progress 10080 kg, up 4320 kg, last week
  5760 kg, latest record Pull-up. Tests 652 green.
