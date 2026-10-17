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
| [0015](specs/0015-private-custom-exercises/spec.md) | Custom exercises are private | `in-progress` — code complete (2026-10-18); awaiting the API redeploy (no migration; Ana/Ben check of AC-1 on the server) and the device check (held exercise shows its name and the neutral tile in Ben's routine and workout, absent from pickers, a stale picker shows the notice). Open, not blocking: catalog settings (unilateral, tracking type) shared or per person | 6 — Exercises |
| 0016 | Claude connector (MCP) to manage training data | `draft` — not written yet; on hold until the owner has tested 0010–0014 on the device (2026-10-16). Decided: full access (log workouts, routines, custom exercises, incl. edits and deletes). Open: which Claude surface — a local MCP server for Desktop/Code (API stays tailnet-only) or a remote claude.ai connector (API exposed to the internet, OAuth; touches roadmap 9) | 8 — Integrations & platform |
| [0017](specs/0017-visual-redesign/spec.md) | Visual redesign | `in-progress` — code complete on `feat/sdd-0017-redesign` (2026-10-16), every screen restyled and checked on the web build; awaiting the owner's device pass (AC-2, 6, 8, 12, 13) | cross-cutting |
| [0018](specs/0018-rest-timer/spec.md) | Rest timer that keeps running | `in-progress` — code complete (2026-10-17); awaiting a device rebuild (new local module `rest-alert`, rest countdown in the widget) and device checks (alert on phone and watch, skip, denied permission, restart, lock-screen countdown) | 2 — Rest timer |
| [0019](specs/0019-workout-always-at-hand/spec.md) | The workout in progress is always at hand | `in-progress` — code complete on `feat/sdd-0019` (2026-10-16), checked on the web preview; awaiting the owner's iOS check of the keyboard (AC-4). The bar's rest countdown landed with 0018 (2026-10-17) | 1 — Live workout logging |
| [0020](specs/0020-custom-and-replace-exercise/spec.md) | Create and replace exercises where they are needed | `in-progress` — code complete (2026-10-17), checked on the web preview; awaiting the owner's device check of the picker's create and confirm steps (Metro reload, no rebuild) | 6 — Exercises |
| [0021](specs/0021-timed-and-distance-sets/spec.md) | Timed and distance sets | `in-progress` — code complete (2026-10-17); awaiting the migration `add_exercise_tracking_type`, redeploy, and device checks (timed rows, set-timer vibration, keyboard); the `catalog:tracking-types` script is superseded by 0030's sweep | 1 — Live workout logging |
| [0022](specs/0022-unilateral-exercises/spec.md) | Unilateral exercises (left / right) | `in-progress` — code complete (2026-10-17); awaiting the migration `add_unilateral_exercises`, redeploy, and device checks (L/R row at phone width, switches, watch target) | 1 — Live workout logging |
| [0023](specs/0023-records-by-type/spec.md) | Personal records by type | `in-progress` — code complete (2026-10-17); awaiting the API redeploy (no migration; against an older API the app shows no records) and the device check of the screens | 4 — Progress |
| [0024](specs/0024-warm-up-sets/spec.md) | Warm-up sets | `in-progress` — code complete (2026-10-17); awaiting the migrations `add_routine_set_warmup` and `add_warm_up_blocks`, redeploy, and device checks (approach-set button, warm-up checklist, History detail) | 1 — Live workout logging |
| [0025](specs/0025-apple-watch/spec.md) | The workout on the Apple Watch | `in-progress` — code complete for Level 1 and Level 2 (2026-10-17); awaiting a device rebuild (Level 2 is opt-in with `TRAININGHUB_WATCH_APP=1`, needs the watchOS platform installed, and may need a paid team to sign HealthKit) and the device checks on iPhone + Apple Watch | 8 — Integrations & platform |
| [0026](specs/0026-exercise-images/spec.md) | Exercise images | `in-progress` — code complete (2026-10-17); awaiting the migration `add_exercise_photo`, redeploy, the top-50 check for AC-1 (the image-matching script was already run on the server, about 58 matched), a device rebuild and the photo-library check | 6 — Exercises |
| [0027](specs/0027-personal-profile/spec.md) | Personal profile and body measurements | `in-progress` — code complete (2026-10-16/17); awaiting the migration `add_profile_and_body_measurements` and redeploy (before the new app build), a device rebuild (image picker and manipulator) and the photo check (AC-5) | 3 — Auth & users |
| [0028](specs/0028-share-workout/spec.md) | Share a workout | `in-progress` — code complete (2026-10-16; records in the text since 0023, 2026-10-17); awaiting the device check of the share sheet to Notes (no rebuild) | 7 — Social |
| [0029](specs/0029-superset-flow/spec.md) | Superset flow: rounds and rest per round | `in-progress` — code complete (2026-10-18); awaiting the device check on iPhone + Apple Watch (AC-1–AC-12: no rest mid-round, rest after the round, rest bar and alert name the next set, header and round markers at phone width, editor join/split; AC-7 phone locked, watch only). No migration, no redeploy | 5 — Routines (advanced) |
| [0030](specs/0030-tracking-type-sweep/spec.md) | Tracking type sweep of the catalog | `in-progress` — code complete (2026-10-18); awaiting the migration `add_exercise_tracking_type_set_by` (redeploy), the sweep on the server (report, review, corrections, apply twice) and the device check of the type control on the exercise detail (confirm sheet, someone else's custom exercise shows no control, plank row after the sweep) | 6 — Exercises |
| [0031](specs/0031-warm-up-preview-and-undo/spec.md) | Warm-up button: preview, mark and undo | `in-progress` — code complete (2026-10-18); awaiting the migration `add_routine_set_generated_warmup` (redeploy) and the device check (preview sheet one-handed, mark in light and dark, add/remove label and VoiceOver, restart keeps the mark, routine saved and reopened, workout from it, History, "last time" after the ramp) | 1 — Live workout logging |
| [0032](specs/0032-live-records/spec.md) | Records shown live while logging | `in-progress` — code complete (2026-10-18); awaiting the API redeploy (new `GET /progress/starting-records`, no migration) and the device check (badge under a row and on the exercise, the notice, AC-1–AC-6 by hand, AC-8 offline + reopen, AC-9 started offline, AC-10/AC-11) | 4 — Progress |
| [0033](specs/0033-delete-custom-exercises/spec.md) | Delete my custom exercises | `in-progress` — code complete (2026-10-18); awaiting the migration `add_exercise_deleted_at` and redeploy (before the app update) and the device check (confirmation texts — unused / counts / active workout —, offline error, routine chip, active workout keeps its sets and saves, neutral tile, no delete on catalog) | 6 — Exercises |
| [0034](specs/0034-visual-polish/spec.md) | Visual polish | `in-progress` (2026-10-18; Phase A code complete, device check pending; Phase B planned in `plan-b.md` as three parallel workstreams) — two phases: **A** quick, no redesign (icon and splash, haptic language, small motion with Reduce Motion, closed type/shape scales, shared blocks, skeletons and empty states, AA contrast, Dynamic Type); **B** redesign (set row hierarchy and status area, sticky workout header, line charts with records and tap values, summary vs last time and share card). Icon, splash, haptics and maybe charts/share card ride the next native rebuild. Light theme split to its own follow-up | cross-cutting |
| [0035](specs/0035-brand-and-lock-screen/spec.md) | Brand presence and lock screen | `in-progress` — code complete (2026-10-18); awaiting a device rebuild (live status, watch menu, icon variants) and the device checks (task 11). Scope: headers with content ("Today: <routine>", week streak, week strip), brand mark, lock-screen status redesign, discard from outside the app only with confirmation, iOS dark/tinted icons | cross-cutting + 8 |
| [0036](specs/0036-home-screen-widget/spec.md) | Home-screen widget | `ready` — 2026-10-18; depends on 0035; first plan task proves data sharing works on the free Apple team, else waits for a paid account (owner's call) | 8 — Integrations & platform |
| [0037](specs/0037-first-run-and-celebration/spec.md) | First run and record celebration | `in-progress` — code complete (2026-10-18); awaiting a device rebuild (rest-alert permission state) and device checks (task 7). Scope: skippable 3-screen first run (units, rest, alerts explained before the prompt) and a celebration on the summary when records fall | 8 + 4 |
| [0038](specs/0038-light-theme/spec.md) | Light theme | `in-progress` — code complete (2026-10-18); awaiting the migration `add_user_appearance` + API redeploy and a device rebuild (system appearance, lock-screen status), then device checks (task 9). Scope: Appearance System / Light / Dark; split off from 0034 | 8 — Integrations & platform |

Execution order agreed 2026-09-24: 0013 → 0014 → 0010 → 0011 → 0012 →
visual redesign (to be specified; "functional first, then pretty") → 0001 →
0015. The amendments found in the 2026-09-24 review are applied to 0001, 0010
and 0012 (0001: public auth routes, offline start, data reassignment as a
one-off script; 0010: owner check on sign-in, hydration after sign-in,
permanently rejected saves; 0012: reuse `LiveWorkoutBridge`, HealthKit errors
vs no data, extra failure paths).

Proposed order for the specs from the owner's device test (2026-10-16),
by impact during a session: 0019 → 0018 → 0020 → 0023 → 0021 → 0024 →
0025 → 0028 → 0026 → 0027 → 0022. 0001 and 0015 keep their place before
distribution.

### Owner's server steps (pending, in order)

Gathered 2026-10-17 from the open owner items of 0011, 0014, 0021, 0023,
0026 and 0027, then 0022 and 0024; updated 2026-10-18 with 0015 and
0029–0033.

1. **Redeploy the API** (`docker compose up -d --build`, see the root
   README). The container runs `prisma migrate deploy` on start, which
   applies whatever is missing of, in order:
   - `20260530093828_init` … `20260531173640_add_user_language` — long
     applied.
   - `20261016133640_add_workout_session_client_id` (0014),
     `20261016142416_add_workout_session_paused_seconds` (0011),
     `20261016190000_add_profile_and_body_measurements` (0027),
     `20261017090000_add_exercise_tracking_type` (0021),
     `20261017120000_add_exercise_photo` (0026),
     `20261017140000_add_routine_set_warmup` (0024),
     `20261017150000_add_unilateral_exercises` (0022),
     `20261017160000_add_warm_up_blocks` (0024) — already applied if you ran
     `db:deploy` on 2026-10-17; re-running is a no-op.
   - New: `20261018110000_add_routine_set_generated_warmup` (0031),
     `20261018130000_add_exercise_tracking_type_set_by` (0030),
     `20261018150000_add_exercise_deleted_at` (0033).

   The same redeploy ships the API side of 0013, 0015 and 0023 (no
   migration), 0032's `GET /progress/starting-records` and 0033's delete
   endpoints. **It must go out before the new app build** (0027, 0032,
   0033: the app's records badges and delete action need these endpoints).
2. `/health`, then 0014's `curl` replay and parallel saves (AC-1, EF-2);
   0015's Ana/Ben check of AC-1; 0033's deletion-impact call.
3. Tracking type sweep (0030; supersedes 0021's `catalog:tracking-types` —
   skip it, or run it first, harmless). From `apps/api` with the server's
   `.env`, on a machine that reaches wger.de:
   1. Report, no write: `pnpm run catalog:tracking-sweep` → writes
      `tmp/tracking-type-sweep.csv`.
   2. Review the CSV (start with `certainty = uncertain` and the used,
      changing rows at the top). Correct wrong calls in
      `src/scripts/data/tracking-type-corrections.json`, keyed by
      `source_id`: `{ "1234": { "type": "duration", "name": "Burpees" } }`
      (types: `weight_reps`, `reps`, `duration`, `weight_duration`,
      `distance_duration`). Re-run the report until it is right; commit the
      corrections file.
   3. Apply: `pnpm run catalog:tracking-sweep:apply`, then run it again — the
      second run must say `0 changed`.
   4. Undo a run if needed:
      `SWEEP_UNDO=tmp/tracking-type-sweep-runs/<file>.json pnpm run catalog:tracking-sweep:undo`
4. Image matching (0026) — already run by the owner (about 58 matched);
   nothing to repeat. Only the read-only top-50 SQL in 0026's tasks log
   (AC-1) remains, if not checked yet.
5. Mobile: `expo prebuild` + iOS rebuild (0010, 0012, 0018, 0025 Level 1,
   0026/0027 image picker); a build with `TRAININGHUB_WATCH_APP=1` for 0025
   Level 2. 0015 and 0029–0033 need no native rebuild. Then the device
   checks in each spec's `tasks.md`.

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
  private; confirmed by the owner 2026-10-17 (*"Los ejercicios propios deben
  ser solamente visibles por cada usuario que lo creó"*): private — spec 0015
  (`ready`).

## Follow-ups found while implementing

Small defects noticed during a spec, outside its scope. Each becomes a task in
a spec or a spec of its own when picked up.

- **lb round-trip drift** (found in 0013, 2026-10-16). Saving rounds kg to one
  decimal, so 100 lb is stored as 45.4 kg and reads back as 100.1 lb in the
  summary, history, detail and "last time" placeholders. Article 4 is intact
  (kg stays canonical); the precision is the problem. Likely fix: store kg
  with two decimals (or round on display to the plate increment of the unit).
- **Warm-up taken as last time's first set** (found in 0023, 2026-10-17) —
  *closed* by 0031 (code complete 2026-10-18): "last time" now pairs
  warm-ups with warm-ups and working sets with working sets.

## Areas with no spec yet

From [docs/roadmap/README.md](../roadmap/README.md). Each is a candidate for the
next `specify` pass.

| # | Area | Remaining | Notes |
|---|---|---|---|
| 2 | Rest timer | — | The background alert is now spec 0018 (a local module, not `expo-notifications`) |
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
