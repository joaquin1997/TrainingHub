# Spec backlog

Where each area stands in SDD terms. `docs/roadmap/` remains the detailed
checklist and progress log per area; this table tracks **which work has a spec**.

## Active specs

| Id | Title | Status | Roadmap area |
|---|---|---|---|
| [0001](specs/0001-auth-session-hardening/spec.md) | Auth session hardening | `ready` — plan written, awaiting review | 3 — Auth & users |
| [0002](specs/0002-apple-sign-in/spec.md) | Sign in with Apple | `draft` — blocked on open decisions | 3 — Auth & users |
| [0003](specs/0003-session-revocation/spec.md) | Session revocation | `draft` — deferred from 0001, before distribution | 3 — Auth & users |
| [0010](specs/0010-persist-active-workout/spec.md) | Persist the active workout | `ready` — plan approved, tasks awaiting review | 1 — Live workout logging |
| [0011](specs/0011-workout-pause/spec.md) | Pause the active workout | `ready` — plan approved, tasks awaiting review | 1 — Live workout logging |
| [0012](specs/0012-workout-live-activity/spec.md) | Live workout status on the lock screen | `ready` — spike done, tasks awaiting review | 8 — Integrations & platform |

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

Writing these surfaced four things nobody had recorded. Each is a
`TODO(sdd)` in its spec; listed here because they are easy to lose:

- **Routine deletion with performed workouts attached** — blocked,
  soft-deleted, or orphaning history? Unverified (0004).
- **Active workout is in-memory only** — does not survive an app restart, which
  is also what bounds spec 0001's EF-4. Persisting it deserves its own spec
  (0005).
- **Muscle-group data is sparse from wger** — blocks both muscle-group
  distribution (0006) and any muscle-based filtering (0007). The decision on
  where muscle data comes from *is* the spec.
- **Are custom exercises private to their creator?** Unverified, and it matters
  before anyone else uses the app (0007).

## Areas with no spec yet

From [docs/roadmap/README.md](../roadmap/README.md). Each is a candidate for the
next `specify` pass.

| # | Area | Remaining | Notes |
|---|---|---|---|
| 2 | Rest timer | Background notification | Native dep (`expo-notifications`) → rebuild (Article 9) |
| 4 | Progress | Muscle-group distribution, workout calendar, line charts | Muscle data blocked; line charts need `react-native-svg` |
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
