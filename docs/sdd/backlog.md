# Spec backlog

Where each area stands in SDD terms. `docs/roadmap/` remains the detailed
checklist and progress log per area; this table tracks **which work has a spec**.

## Active specs

| Id | Title | Status | Roadmap area |
|---|---|---|---|
| [0001](specs/0001-auth-session-hardening/spec.md) | Auth session hardening | `in-progress` — code complete locally (2026-11-03): strict auth, 90-day credentials, startup validation/offline retry and reassignment script; live data reassignment, API/app rollout and device acceptance pending | 3 — Auth & users |
| [0002](specs/0002-apple-sign-in/spec.md) | Sign in with Apple | `draft` — deferred (2026-10-18): the free Apple team cannot sign the capability (checked by building with it); waits for a paid developer account (owner's call). Decided meanwhile: link by verified email (as 0039) | 3 — Auth & users |
| [0003](specs/0003-session-revocation/spec.md) | Session revocation | `draft` — deferred from 0001, before distribution | 3 — Auth & users |
| [0010](specs/0010-persist-active-workout/spec.md) | Persist the active workout | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed | 1 — Live workout logging |
| [0011](specs/0011-workout-pause/spec.md) | Pause the active workout | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed | 1 — Live workout logging |
| [0012](specs/0012-workout-live-activity/spec.md) | Live workout status on the lock screen | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed; the 0:00 countdown after a rest is fixed in 0040 | 8 — Integrations & platform |
| [0013](specs/0013-progress-performed-work/spec.md) | Progress counts only performed work | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed | 4 — Progress |
| [0014](specs/0014-workout-save-integrity/spec.md) | Workout save integrity | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed | 1 — Live workout logging |
| [0015](specs/0015-private-custom-exercises/spec.md) | Custom exercises are private | `in-progress` — deployed; the only open check needs a second account: Ben's routine with Ana's custom exercise shows its name and the neutral tile, absent from pickers | 6 — Exercises |
| 0016 | Claude connector (MCP) to manage training data | `draft` — not written yet; 0010–0014 are now in daily use, so it is no longer on hold for them. Decided: full access (log workouts, routines, custom exercises, incl. edits and deletes). Open: which Claude surface — a local MCP server for Desktop/Code (API stays tailnet-only) or a remote claude.ai connector (API exposed to the internet, OAuth; touches roadmap 9) | 8 — Integrations & platform |
| [0017](specs/0017-visual-redesign/spec.md) | Visual redesign | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed | cross-cutting |
| [0018](specs/0018-rest-timer/spec.md) | Rest timer that keeps running | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed; alert with the app in front and a stronger vibration in 0040 | 2 — Rest timer |
| [0019](specs/0019-workout-always-at-hand/spec.md) | The workout in progress is always at hand | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed | 1 — Live workout logging |
| [0020](specs/0020-custom-and-replace-exercise/spec.md) | Create and replace exercises where they are needed | `in-progress` — deployed; device check of the picker's create and confirm steps | 6 — Exercises |
| [0021](specs/0021-timed-and-distance-sets/spec.md) | Timed and distance sets | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed | 1 — Live workout logging |
| [0022](specs/0022-unilateral-exercises/spec.md) | Unilateral exercises (left / right) | `in-progress` — deployed; device check of the L/R row at phone width and the watch target | 1 — Live workout logging |
| [0023](specs/0023-records-by-type/spec.md) | Personal records by type | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed | 4 — Progress |
| [0024](specs/0024-warm-up-sets/spec.md) | Warm-up sets | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed; ramps by loading kind and muscle, and typing a set by hand, go to 0043 | 1 — Live workout logging |
| [0025](specs/0025-apple-watch/spec.md) | The workout on the Apple Watch | `done` — in daily use on the iPhone and the Apple Watch since the 2026-10-18 build, deployed (Level 2 watch app installed); editing reps on the watch goes to 0041 | 8 — Integrations & platform |
| [0026](specs/0026-exercise-images/spec.md) | Exercise images | `in-progress` — deployed; catalog pictures now come from 0044 (753 of 763); device check of the own-photo picker | 6 — Exercises |
| [0027](specs/0027-personal-profile/spec.md) | Personal profile and body measurements | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed; two decimals of body weight in 0040 | 3 — Auth & users |
| [0028](specs/0028-share-workout/spec.md) | Share a workout | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed; text share fixed in 0040 | 7 — Social |
| [0029](specs/0029-superset-flow/spec.md) | Superset flow: rounds and rest per round | `in-progress` — deployed, no migration; device check of a superset workout on iPhone + watch (AC-1–AC-12) | 5 — Routines (advanced) |
| [0030](specs/0030-tracking-type-sweep/spec.md) | Tracking type sweep of the catalog | `done` — the type control on the exercise detail is deployed; the catalog sweep was never run and is superseded by 0044, whose reviewed catalog sets every tracking type | 6 — Exercises |
| [0031](specs/0031-warm-up-preview-and-undo/spec.md) | Warm-up button: preview, mark and undo | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed; the up-next outline on a generated warm-up is fixed in 0040 | 1 — Live workout logging |
| [0032](specs/0032-live-records/spec.md) | Records shown live while logging | `in-progress` — deployed; device check of the live badge, the notice and the offline cases | 4 — Progress |
| [0033](specs/0033-delete-custom-exercises/spec.md) | Delete my custom exercises | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed (the owner deleted a custom exercise on 2026-10-17) | 6 — Exercises |
| [0034](specs/0034-visual-polish/spec.md) | Visual polish | `done` — Phase A and Phase B (B1 set row and status area, B2 line charts, B3 summary and share card) built 2026-10-18; in daily use on the iPhone since the 2026-10-18 build, deployed | cross-cutting |
| [0035](specs/0035-brand-and-lock-screen/spec.md) | Brand presence and lock screen | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed | cross-cutting + 8 |
| [0036](specs/0036-home-screen-widget/spec.md) | Home-screen widget | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed; the owner finds it plain and off-centre: redesign in 0041 | 8 — Integrations & platform |
| [0037](specs/0037-first-run-and-celebration/spec.md) | First run and record celebration | `in-progress` — deployed; device check of the first run on a fresh install and the celebration when a record falls | 8 + 4 |
| [0038](specs/0038-light-theme/spec.md) | Light theme | `done` — in daily use on the iPhone since the 2026-10-18 build, deployed | 8 — Integrations & platform |
| [0039](specs/0039-google-sign-in/spec.md) | Sign in with Google | `in-progress` — code complete and deployed (migration `add_user_identities` applied), inactive until the owner creates the Google OAuth clients and sets `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `GOOGLE_CLIENT_IDS` (plan, *Owner steps*), then a native rebuild | 3 — Auth & users |
| [0040](specs/0040-device-test-fixes/spec.md) | Fixes from the device test of 2026-10-21 | `in-progress` — code complete (2026-10-21) on `feat/sdd-0040-device-fixes`, API deployed from that branch; awaiting the native rebuild (rest alert with the app in front, lock-screen view) and the device checks (task 10) | 1 + 2 + 8 |
| [0041](specs/0041-widget-redesign-and-watch-reps/spec.md) | Widget redesign and reps on the watch | `in-progress` — code complete (2026-10-21); widget rendered in light and dark (`renders/`); awaiting the native rebuild (with 0040's) and the device checks (AC-1–AC-6) | 8 — Integrations & platform |
| [0042](specs/0042-readable-exercise-progress/spec.md) | Progress per exercise that is easy to read and to find | `in-progress` — code complete locally 2026-11-03 (tasks 1–7): trained-exercise search, coherent per-workout evidence, explicit metrics/periods and preserved navigation; API and paired Release apps delivered 2026-11-04; physical-device acceptance pending | 4 — Progress |
| [0043](specs/0043-smarter-warm-ups/spec.md) | Smarter warm-ups and warm-ups marked by hand | `in-progress` — code complete 2026-11-03 (tasks 1–7): personal preferences, configurable ramps and explained pickers; isolated-DB migration/tests and web smoke checks passed; migration observed applied; API/paired Release apps delivered 2026-11-04, physical-device acceptance pending | 1 — Live workout logging |
| [0044](specs/0044-curated-exercise-catalog/spec.md) | A curated exercise catalog | `done` — applied on the server 2026-10-21: 763 reviewed exercises (195 by hand + 568 from free-exercise-db), 847 imported ones retired, 14 own duplicates merged with their history; API deployed, names in the app's language, search by other names | 6 — Exercises |
| [0045](specs/0045-watch-with-phone-locked/spec.md) | The watch keeps going with the phone locked | `done` — original device acceptance 2026-11-03; regression fix deployed 2026-11-04 (initial-mirror retry/live delivery), owner confirmed next-set advancement with the iPhone locked. Exact original failure cause not captured | 8 — Integrations & platform |

| [0046](specs/0046-set-rows-and-finish/spec.md) | Readable completed sets, undo selection and Finish at the top | `in-progress` — tasks 1–4 implemented locally 2026-11-04: completed figures, exact undo selection/rest origin and guarded top Finish; paired Release delivered 2026-11-04; visual/device acceptance and connected-watch cancellation pending. | 1 — Live workout logging |
| [0047](specs/0047-watch-skip-rest/spec.md) | Skip a rest from the watch | `in-progress` — tasks 1–4 implemented locally 2026-11-04: specific-rest identity, acknowledgement, durable native pending/suppression and translated Skip; API-first/paired Release delivery completed 2026-11-04; owner confirmed connected Skip works, remaining offline/expiry/device acceptance pending. | 2 + 8 |
| [0048](specs/0048-trustworthy-live-records/spec.md) | Trustworthy live records and last-session feedback | `in-progress` — tasks 1–5 implemented locally 2026-11-04: independent frozen sources, clear PR/last-session comparisons and retry/error states. API and paired Release apps delivered 2026-11-04; device checks pending and original-case investigation explicitly deferred by owner. | 4 — Progress |
| [0049](specs/0049-weight-per-side/spec.md) | Configurable weight per side | `planned` — Owner-reviewed; plan/tasks prepared 2026-11-03: same-side quantities, explicit shared-load selection, lesser-load warm-ups and older-client capability guards. | 1 — Live workout logging |
| [0050](specs/0050-correct-saved-workout/spec.md) | Correct mistakes in a saved workout | `in-progress` — tasks 1–5 implemented locally 2026-11-04: atomic revision/idempotency correction, isolated editor and owned derived-view refresh. Fresh/upgrade PostgreSQL checks pass; migration/API/app rollout and device acceptance pending. Structural edits/deletion deferred. | 1 — Live workout logging |
| [0051](specs/0051-offer-routine-update/spec.md) | Offer to update the routine after training | `planned` — Owner-reviewed; plan/tasks prepared 2026-11-03: selected changes after workout save, versioned stable-ID routine updates and preserved history links. | 5 — Routines |
| [0052](specs/0052-app-errors-and-service-monitoring/spec.md) | App errors and service availability monitoring | `planned` — Owner-reviewed; plan/tasks prepared 2026-11-03: diagnostic adapter and independent probe observer; native privacy/expiry proof and external configuration remain acceptance gates. | 9 — Production readiness |
| [0053](specs/0053-records-grouped-by-exercise/spec.md) | Group records by exercise | `in-progress` — tasks 1–3 implemented locally 2026-11-05: summary/saved-detail grouping by identity and saved order, retained records on refresh failure, PR-only counts. Bundle delivery and visual/device acceptance pending. | 4 — Progress |

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

### Workout improvement checklist (2026-11-03)

Every requested item is mapped in [the review](reviews/2026-11-03-workout-improvements.md),
including the earlier draft-to-current-ID mapping and checked code references.
0043 covers warm-ups and explained types; 0045 already covers locked-phone
watch progression. Owner review is complete for 0043 and 0046–0053;
confirmed decisions are recorded in each spec and the review. 0046 implementation tasks 1–4 are complete locally; its delivery/device checks
remain open. 0047 tasks 1–4 and 0048 tasks 1–5 are now implemented locally; their
delivery/device checks remain open. 0049–0053 retain planned, unchecked
implementation tasks. The ambiguous migration/record report remains an
investigation acceptance condition in 0048.

Next implementation order after local 0048/0047: 0053 → 0050 → 0051 →
0049, preserving the completed local 0043 → 0042 → 0046 work. 0052 can advance separately
to support diagnosis. This is a proposal, not a change to the agreed feature
order or authorization to implement/deploy.

### Server state (checked 2026-11-04)

All committed migrations through `20261103130000_add_personal_warm_up_preferences`
are applied. The strict API boundary was already live before this deployment
(anonymous workout request: 401). Image `09464a92067b` was deployed from the
current worktree on 2026-11-04 after a verified backup, preserving runtime
credentials and the previous image/container for rollback.

The legacy account still exists with training rows. No reassignment was
performed or inferred from the existing API rollout; its explicit owner/data
review remains open. The reviewed catalog was not reapplied.

### Owner's steps (pending)

0. 0001 follow-up: strict API is already deployed (verified 2026-11-04).
   Legacy reassignment still needs the explicit owner/data review; do not
   guess ownership. Check startup/offline retry and same-user workout
   reauthentication on the delivered app. A fresh verified backup exists.

1. Native rebuild for 0040 and 0041 (rest alert with the app in front,
   lock-screen view, widget, watch app), then their device checks.
2. Device checks left in 0015 (needs a second account), 0020, 0022, 0026,
   0029, 0032 and 0037 — listed in each row above.
3. Google OAuth clients for 0039, when wanted.
4. Merge `feat/sdd-0040-device-fixes` into `master` and push.

Current work (2026-11-04): 0001 code complete locally, rollout pending;
0043 and 0042 code complete locally with rollout/device checks pending;
0046 tasks 1–4 implemented locally 2026-11-04 with delivery/device checks pending;
0048 tasks 1–5 and 0047 tasks 1–4 implemented locally; 0049–0053 remain
planned with ordered implementation tasks. Feature order
remains 0043 → 0042 (0041 done first at the owner's request).

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
| 4 | Progress | Muscle-group distribution from reviewed data, workout calendar | Category-based distribution ships; 0044 now supplies muscle metadata. Line charts already ship through 0034; metric/period/readability work is 0042 |
| 6 | Exercises | Per-exercise history | Data already exists via "last time" — mostly presentation |
| 7 | Social | Everything | Decided out of scope for the MVP (2026-05-31); post-MVP |
| 8 | Integrations & platform | Full offline sync, remaining health providers, reminders, export | Watch, Live Activities, rest alerts and themes are implemented; remaining onboarding/device checks are tracked in specs |
| 9 | Production readiness | TLS, production DB, TestFlight, rate limiting, crash reporting | Largest unspecified block |

`TODO(sdd): area 9 (production readiness) is cross-cutting and its roadmap`
`checklist is thin. It likely needs splitting into several specs — secrets &`
`TLS, backups & restore, distribution/TestFlight, abuse protection,`
`observability — rather than one. Deciding that split needs the owner's intent`
`for release: private use only, TestFlight for friends, or App Store. That same`
`answer also sets the priority of specs 0002 and 0003.`

## Workout planning pass — 2026-11-03

Approved plans and ordered unchecked task lists now exist for all reviewed
work: 0043 and 0046–0053. [Execution sequence and acceptance gates](reviews/2026-11-03-workout-implementation-sequence.md)
record dependencies, schema/API ordering, native rebuilds and operational
prerequisites. No feature implementation or live rollout was performed.
The 0048 original-case investigation and 0052 native privacy/expiry harness
remain explicit implementation/acceptance gates, not inferred successes.

## Delivery follow-up — 2026-11-04

The API and paired iPhone/Watch Release apps are deployed; 0042/0043/0046
delivery is complete, with their physical acceptance still open. 0045’s
reported locked-phone regression is restored after the installed
initial-mirror retry/live-event fallback fix (69d27ee): the owner confirmed
next-set advancement with the iPhone locked. The original failure was not
captured in logs, so its exact cause remains unproven. Remaining legacy
account data was not moved. No push was performed.

## Development update — 2026-11-04 (0048 and 0047)

0048 tasks 1–5 and 0047 tasks 1–4 are implemented locally with passing
typechecks, 1,366 tests and web/API/native builds. No new deployment in this
pass. 0048 requires API-first delivery; then deliver the paired phone/Watch
apps for 0047 and verify its physical cases. Original-record investigation
remains deferred at the owner's request; do not mark 0048 done from UI tests.
Owner reports deployed 0042/0043/0046 testing has gone well; this general
confirmation does not invent individual accessibility/account/offline results.
Next implementation after these two is 0053 (group records by exercise).

## 0048/0047 delivery — 2026-11-04

API deployed first (`c9ba5f4183fe`), then both Release apps installed and
launched on the owner's iPhone/Watch. Fresh verified backup and stopped
previous container/image preserved for rollback; runtime credentials unchanged.
No new migration or training-data rewrite. Physical acceptance remains open;
0048 investigation stays deferred. Detailed evidence is in each verification.md.

## 0050 implementation — 2026-11-04

At the owner’s request, 0050 was implemented before 0053. Tasks 1–5 and
Health limitation copy are local and verified (1,407 tests, including isolated
PostgreSQL concurrency/rollback/legacy/PR tests). Production migration and
API/app delivery remain pending, followed by physical acceptance. No training
rows were repaired in production. Next planned work remains 0053, then 0051
and 0049; 0052 is separate. See 0050 verification for rollout order and limits.

## 0053 implementation — 2026-11-05

Tasks 1–3 implemented locally after 0050, as requested. Summary and existing
saved-detail record sections group every historical PR by exercise identity
and saved workout order; retry retains loaded groups. Typecheck, 893 mobile /
514 API tests and web export pass (nine API database tests skipped this run).
See [verification](specs/0053-records-grouped-by-exercise/verification.md).
No deployment/device acceptance yet. Combined delivery must follow 0050's
migration/API prerequisites. Next planned development: 0051, then 0049;
0052 monitoring remains separate.
