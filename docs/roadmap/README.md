# Roadmap to Hevy-parity

Each point lives in its own file so context can be reloaded per-area. Status is
kept here (index) and in each file's checklist + progress log.

Legend: ✅ done · 🔁 in progress · ⬜ todo

| # | Area | File | Status |
|---|------|------|--------|
| 1 | Live workout logging | [01-live-workout-logging.md](01-live-workout-logging.md) | ✅ done |
| 2 | Rest timer | [02-rest-timer.md](02-rest-timer.md) | ✅ done (background alert + lock-screen countdown: spec 0018, device check pending) |
| 3 | Auth & users | [03-auth-and-users.md](03-auth-and-users.md) | 🔁 email/password + JWT + scoping + profile (0027) done; enforcement (0001) code complete locally, rollout pending; revocation, Apple todo |
| 4 | Progress, PRs & charts | [04-progress-and-prs.md](04-progress-and-prs.md) | 🔁 PRs+1RM+charts+PR-history+records by type (0023)+volume by category+frequency tiles; real muscle data/calendar todo |
| 5 | Routines (advanced) | [05-routines-advanced.md](05-routines-advanced.md) | ✅ done (drag&drop reorder deferred) |
| 6 | Exercises (advanced) | [06-exercises-advanced.md](06-exercises-advanced.md) | 🔁 filters+favorites+images (+0026)+pagination+create/replace anywhere (0020) done; recent exercise history exists, full set inspection/readability follow-ups remain |
| 7 | Social | [07-social.md](07-social.md) | ⬜ post-MVP (out of scope); share a workout as text done (0028) |
| 8 | Integrations & platform | [08-integrations-and-platform.md](08-integrations-and-platform.md) | 🔁 i18n ES/EN + kg/lb + default rest + Live Activity (0012) + Apple Watch (0025) + rest alert (0018) done; rest todo |
| 9 | Production readiness | [09-production-readiness.md](09-production-readiness.md) | 🔁 homelab deploy + CI done; backups, alerting, distribution todo |

## Already built (baseline)
Routines (CRUD + Prisma), Workouts (start→log→timer→notes→save, history+detail,
resume, edit-lock, discard, mark-set-done UI), Progress (per-exercise aggregation),
Exercises (catalog/search/detail + custom), tests (API + mobile via Vitest).

## Relationship to specs

This file stays the backlog and progress log per area. A sub-point graduates
into a spec under [../sdd/specs/](../sdd/README.md) when it is picked up for
implementation; [../sdd/backlog.md](../sdd/backlog.md) tracks which areas have
one.

## Working agreement
- Small, reviewable commits; one logical change per commit; conventional messages.
- Validate before each commit: `pnpm -r typecheck` and `pnpm -r test`.
- Update the relevant file's checklist + progress log when a sub-point lands.
- Stay on `master` (the user pushes); branch only for risky/large refactors.
