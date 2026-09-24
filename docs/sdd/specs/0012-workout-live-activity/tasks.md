---
spec: 0012
status: draft        # awaiting review
created: 2026-09-24
---

# Tasks — Live workout status (iOS Live Activity)

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Native code is taken from the spike branch (`spike/live-activity`) and cleaned
up; the spike's debug panel is not carried over.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | Spec, plan (with spike results) and tasks; glossary (active energy, live status); backlog | docs | links resolve | `docs(sdd): spec 0012 live workout status` |
| 2 | apple-targets plugin, `appleTeamId`, `NSSupportsLiveActivities`, widget extension + `_shared`, `workout-live-activity` module, Swift-copies test | ios | Swift-copies test (CI); **[DEVICE]** builds, installs | `feat(ios): workout Live Activity extension and module` |
| 3 | `WorkoutLiveActivity` interface, iOS adapter, no-op, pure `reconcile` | mobile | unit tests | `feat(workouts): live-activity boundary and reconcile` |
| 4 | Controller subscribed to the draft store, mounted after hydration | mobile | unit tests (fakes); **[DEVICE]** start, pause in app and on lock screen, finish, discard, kill + relaunch | `feat(workouts): drive the Live Activity from the active workout` |
| 5 | Finish from the status: `action=finish` → confirm → finish | mobile | unit test (action parsing); **[DEVICE]** | `feat(workouts): confirm finishing from the Live Activity` |
| 6 | HealthKit entitlement + usage string, `health-energy` module, `readActiveEnergyKcal` in domain, Apple impl, Android `null` | health | typecheck; **[DEVICE]** permission prompt, kcal vs Fitness | `feat(health): read active energy from Apple Health` |
| 7 | kcal polling (start, app active, every 60 s unless paused) and permission request | mobile | unit tests (fake clock); **[DEVICE]** AC-5, AC-6 | `feat(workouts): show active calories on the Live Activity` |
| 8 | README native builds (targets/, modules/, when to `prebuild --clean`); roadmap; backlog; spec status | docs | links resolve | `docs(sdd): close spec 0012` |

Tasks 2, 4–7 need a device rebuild; they are not verifiable in CI.

## Progress log

- 2026-09-24 — Spike on `spike/live-activity` (e2b0d74): signing with the free
  team incl. HealthKit, rendering, and intents reaching JS verified on device.
  Open: Face ID on locked-phone pause; HealthKit read not yet exercised.

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] `docs/roadmap/08-integrations-and-platform.md` updated
- [ ] `spec.md` status set to `done`; `../backlog.md` updated
- [ ] Spike branch deleted once everything is carried over
