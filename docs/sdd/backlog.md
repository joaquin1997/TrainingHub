# Spec backlog

Where each area stands in SDD terms. `docs/roadmap/` remains the detailed
checklist and progress log per area; this table tracks **which work has a spec**.

## Active specs

| Id | Title | Status | Roadmap area |
|---|---|---|---|
| [0001](specs/0001-auth-session-hardening/spec.md) | Auth session hardening | `ready` — plan written, awaiting review | 3 — Auth & users |
| [0002](specs/0002-apple-sign-in/spec.md) | Sign in with Apple | `draft` — blocked on open decisions | 3 — Auth & users |
| [0003](specs/0003-session-revocation/spec.md) | Session revocation | `draft` — deferred from 0001, before distribution | 3 — Auth & users |
| [0010](specs/0010-persist-active-workout/spec.md) | Persist the active workout | `in-progress` — code complete on `feat/sdd-0013-0012`; awaiting a device rebuild (new native dependency) and device checks | 1 — Live workout logging |
| [0011](specs/0011-workout-pause/spec.md) | Pause the active workout | `in-progress` — code complete on `feat/sdd-0013-0012`; awaiting the migration, redeploy and device checks (task 6) | 1 — Live workout logging |
| [0012](specs/0012-workout-live-activity/spec.md) | Live workout status on the lock screen | `in-progress` — code complete on `feat/sdd-0013-0012`; awaiting a device rebuild and device checks | 8 — Integrations & platform |
| [0013](specs/0013-progress-performed-work/spec.md) | Progress counts only performed work | `in-progress` — code complete on `feat/sdd-0013-0012`; awaiting the owner's redeploy and device checks (task 6) | 4 — Progress |
| [0014](specs/0014-workout-save-integrity/spec.md) | Workout save integrity | `in-progress` — code complete on `feat/sdd-0013-0012`; awaiting the migration, redeploy and device checks (task 7); needed before 0010 task 7 | 1 — Live workout logging |
| 0015 | Custom exercises are private | `draft` — not written yet; ships alongside 0001 | 6 — Exercises |

Execution order agreed 2026-09-24: 0013 → 0014 → 0010 → 0011 → 0012 →
visual redesign (to be specified; "functional first, then pretty") → 0001 →
0015. The amendments found in the 2026-09-24 review are applied to 0001, 0010
and 0012 (0001: public auth routes, offline start, data reassignment as a
one-off script; 0010: owner check on sign-in, hydration after sign-in,
permanently rejected saves; 0012: reuse `LiveWorkoutBridge`, HealthKit errors
vs no data, extra failure paths).

Since 2026-10-16 the owner has delegated the gates: specs, plans and tasks are
self-approved and decisions recorded as assumptions; only decisions with a
large product impact are left open. Device checks and deploys are batched for
the owner after several specs.

## Retro-specs

Written 2026-09-23 in one pass, after the fact, to record what the six built
areas actually do. Thin by design: behaviour, invariants worth protecting, and
known gaps. They are the base a future change builds on.

| Id | Area | Roadmap |
|---|---|---|
| [0004](specs/0004-retro-routines/spec.md) | Routines | 5 |
| [0005](specs/0005-retro-workouts/spec.md) | Workouts (live logging, rest timer) | 1, 2 |
| [0006](specs/0006-retro-progress/spec.md) | Progress, PRs, charts | 4 |
| [0007](specs/0007-retro-exercises/spec.md) | Exercises catalog | 6 |
| [0008](specs/0008-retro-settings-and-i18n/spec.md) | Settings and language | 8 |
| [0009](specs/0009-retro-accounts-and-sessions/spec.md) | Accounts and sessions (current, transitional) | 3 |

### Questions the retro pass raised

Writing these surfaced four things nobody had recorded. Status as of the
2026-09-24 review:

- **Routine deletion with performed workouts attached** — *answered* (0004):
  the history is kept and loses only its link to the routine. Deleting the
  routine of the *active* workout made that workout unsaveable — closed by
  spec 0014.
- **Active workout is in-memory only** — closed by 0010 (code complete
  2026-10-16), which also lifts the bound on spec 0001's EF-4.
- **Muscle-group data is sparse from wger** — blocks both muscle-group
  distribution (0006) and any muscle-based filtering (0007). The decision on
  where muscle data comes from *is* the spec.
- **Are custom exercises private to their creator?** — *answered* (0007): no,
  every user sees every custom exercise. Decided 2026-09-24 that they should be
  private — spec 0015.

## Follow-ups found while implementing

Small defects noticed during a spec, outside its scope. Each becomes a task in
a spec or a spec of its own when picked up.

- **lb round-trip drift** (found in 0013, 2026-10-16). Saving rounds kg to one
  decimal, so 100 lb is stored as 45.4 kg and reads back as 100.1 lb in the
  summary, history, detail and "last time" placeholders. Article 4 is intact
  (kg stays canonical); the precision is the problem. Likely fix: store kg
  with two decimals (or round on display to the plate increment of the unit).

## Areas with no spec yet

From [docs/roadmap/README.md](../roadmap/README.md). Each is a candidate for the
next `specify` pass.

| # | Area | Remaining | Notes |
|---|---|---|---|
| 2 | Rest timer | Background notification | Native dep (`expo-notifications`) → rebuild (Article 9) |
| 4 | Progress | Muscle-group distribution from real muscle data, workout calendar, line charts | A category-based proxy ships today; real muscle data is sparse; line charts need `react-native-svg` |
| 6 | Exercises | Per-exercise history | Data already exists via "last time" — mostly presentation |
| 7 | Social | Everything | Decided out of scope for the MVP (2026-05-31); post-MVP |
| 8 | Integrations & platform | Offline sync, health, Apple Watch, push, theme, onboarding, export | Interfaces exist; implementations deliberately deferred |
| 9 | Production readiness | TLS, production DB, TestFlight, rate limiting, crash reporting | Largest unspecified block |

`TODO(sdd): area 9 (production readiness) is cross-cutting and its roadmap`
`checklist is thin. It likely needs splitting into several specs — secrets &`
`TLS, backups & restore, distribution/TestFlight, abuse protection,`
`observability — rather than one. Deciding that split needs the owner's intent`
`for release: private use only, TestFlight for friends, or App Store. That same`
`answer also sets the priority of specs 0002 and 0003.`
