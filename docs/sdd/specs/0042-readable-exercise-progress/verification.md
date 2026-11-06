# 0042 verification — 2026-11-03

Implementation tasks 1–7 are complete locally. Task 8 remains open for actual
API/bundle delivery and physical-device acceptance. No server data, settings
or training records were changed by this implementation or its browser checks.

## Automated checks

- `pnpm -r typecheck` — passed.
- `pnpm -r test` — 1,309 passed (830 mobile, 479 API); two opt-in database tests
  skipped. No database migration is needed by this feature.
- `pnpm --filter @workout/api build` — passed, including Prisma generation.
- `TZ=Europe/Madrid pnpm --filter @workout/mobile test -- src/features/progress/utils`
  — 72 tests passed, including local-calendar/DST boundary checks.
- `git diff --check` — passed.

API tests cover coherent 100 kg × 5 evidence beside an independent 12-rep
maximum, repeated occurrences grouped into one workout, unilateral reps and
volume, tie order, whole-session legacy completion, warm-ups, unfinished sets,
missing versus zero volume and original timed quantities. Repository doubles
exercise the actual owner-scoped query and ordered evidence projection,
including retired/deleted references and restricted foreign-private aliases.
Route tests cover authenticated responses, 401, 404 and service failure.
These tests verify query construction/derivation; they are not a live-server
or real-database acceptance claim.

Mobile helper tests cover all five tracking types/defaults, aliases/accents,
local month clamping/leap years, inclusive day boundaries, kg/lb formatting,
missing values, identity-preserving series beyond 12 points and no implicit
metric fallback. The read-controller tests cover refresh recovery, successful
empty versus error/404, overlapping retries, blur invalidation and account/401
isolation. The old unused first-session heaviest timeline was removed; typed
all-time records retain their existing record rules.

## Browser checks

Used the existing Expo web runtime with headless local Chrome and a temporary
Playwright fixture harness. The integrated browser execution tool was not
available in this session. All API calls were intercepted with synthetic
training/account responses; no production requests were forwarded. No browser
page exceptions occurred during the successful flow.

Verified at 320 × 740:

- Search appears before general summaries, filters loaded results immediately
  without a request per keystroke, matches `BANCA`/`Bench` aliases and keeps the
  app-language display name. A no-match query offers clearing.
- Weighted detail displays the actual 100 kg × 5 set, separately labelled
  maximum reps, session date and volume. It never displays 100 kg × 12.
- Three-month and all-time selections change the chart/list together; the
  all-time record remains visible. Same-day workouts keep separate entries
  and the evening entry opens `/workouts/evening`.
- Returning from that workout preserves metric and period; returning to lookup
  preserves the `Bench` query. Focus triggers a new read.
- Reps-only detail contains no kg/lb, volume or one-rep estimate. Plank,
  distance/time and weighted-duration details expose their specified initial
  metrics and readable units.
- A simulated 503 on focus refresh retains visible values and selected
  volume/all-time controls, explains the failed refresh and recovers on Retry.
- A response without the readable-progress version shows explicit service
  update/unavailable copy, then recovers on Retry after the fixture is upgraded.
- The exercise-information action opens `/exercises/bench/progress`; Back
  returns to `/exercises/bench`, within the same tab's stack. A simulated 404
  in exercise information still leaves the progress action available; opening
  it shows the no-history state and Back restores exercise information.
- Metric/period radio choices expose checked state on web; point inspection
  works with named Previous/Next session buttons and does not require dragging.
- English/dark and Spanish/light layouts were inspected. Spanish alternate-name
  lookup preserves the localized exercise name and its estimated-one-rep copy.
  Enlarged text (24 px/32 px line height applied in the browser) wraps controls
  and values without horizontal page overflow. This is a web layout check,
  not physical-device Dynamic Type or screen-reader acceptance.

Screenshots contain synthetic values:

- [English search, dark, 320 pt](renders/search-en-dark-320.png)
- [Spanish detail, light, 320 pt](renders/detail-es-light-320.png)
- [Spanish detail with enlarged text](renders/detail-es-large-320.png)

The pre-existing exercise catalog emits a React web warning about a nested
favorite button inside its row button. The tested exercise navigation works;
this unrelated catalog markup was not changed by 0042.

## Delivery and physical-device checklist — pending

- [ ] Deploy the additive API, then the app bundle. Existing data needs no
  migration/backfill. An older API is explicitly unavailable in the new detail.
- [ ] Confirm actual owned histories, alias visibility and retired/private
  references against the deployed API with two accounts.
- [ ] Check iPhone and Android navigation/Back, including search scroll position,
  saved-workout return, cold/deep-link entry and no-history exercise information.
- [ ] Check VoiceOver/TalkBack reading order, selected controls, chart point
  access, large text and SVG-unavailable bar fallback in an installed binary.
- [ ] Check actual offline/reconnect and expired-session behavior with 0001,
  account switch, save/revisit refresh and kg/lb changes.
- [ ] Run all AC-1–AC-12/EF-1–EF-7 on physical devices and record evidence before
  marking the spec done. Development bundles need no new native module;
  standalone Release builds still require their normal bundle delivery.

## Delivery update — 2026-11-04

API image `09464a92067b` deployed after a verified database backup; runtime
credentials retained and the previous container/image preserved for rollback.
Public health reports service/database available; anonymous workout requests
are rejected with 401. All committed migrations were already applied; no
training rows were rewritten. Paired Release app delivery is tracked in the
current deployment follow-up. Physical-device acceptance remains open.

## Paired Release delivery — 2026-11-04

Native prebuild completed with Watch/widget enabled. Release builds succeeded
for the paired Watch and iPhone, and the signed phone bundle passed
`codesign --verify --deep --strict`. Both apps were installed successfully and
launched on the owner's iPhone and Watch. The bundle includes local 0042,
0043, 0046 and the 0045 mirroring follow-up; the phone's compiled Info.plist
retains `workout-processing`. No Metro connection is required.

API health and database availability pass; anonymous workout access remains
401. All 27 migrations, including personal warm-up preferences, were already
applied; deployment reports no pending migration. Runtime credentials were
preserved, and no legacy-user reassignment or catalog rewrite was performed.
Full types/tests pass (852 mobile + 479 API; two database tests skipped).
Delivery is complete; this does not close the remaining feature-specific
physical-device/accessibility/identity checks.
