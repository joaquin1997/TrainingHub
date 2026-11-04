# 0048 local verification — 2026-11-04

Tasks 1–5 implemented. Investigation task 6 and delivery/physical acceptance
task 7 remain open. Owner explicitly deferred the original-record investigation
because no concrete affected case is recalled. No production data was read
or rewritten, no data migration performed and no new API/app deployed.

- `pnpm -r typecheck` passes.
- `pnpm -r test` passes: 862 mobile + 493 API; two opt-in DB cases skipped.
- API tests verify authenticated owner scope, visible/held history identities,
  successful empty versus inaccessible, invalid query/service failures, strictly
  prior start boundary, date/ID ties, duplicate occurrences, legacy completion,
  warm-up/unfinished exclusion and the 50/45/47 versus 52 kg examples.
- Shared comparison tests preserve historical same-or-heavier reps and exact
  last-session weight; no independent weight/reps maxima are paired.
- Mobile resource tests verify loading/offline/refused/partial states, retries,
  no reloading successful frozen references, old/malformed restored fields,
  removal/account/workout stale replies, undo/warm-up/first-session feedback.
- Label tests verify actual/baseline figures, kg/lb, scope wording and separate
  extra-record versus extra-improvement counts. Improvement-only feedback does
  not enter the existing historical record/haptic/summary paths.

Remaining checks: ES/EN and both themes at 320 pt/large text, actual badge
modal/Done separation and screen readers, offline/foreground retry, saved
workout parity, older API unavailable state, actual affected record case,
API-before-bundle rollout. Unit tests do not establish device acceptance.

## Final local checks with 0047 — 2026-11-04

`expo export --platform web` passes; domain/API production builds pass.
Final combined checks: 871 mobile + 495 API tests and all typechecks pass.
The API additionally excludes deleted/retired catalog rows without owned
history from confirmed-empty visibility and rejects calendar-overflow start
boundaries. Owned historical rows remain readable, including held identities;
no name-based merges or training-row repair was performed.

## Delivery — 2026-11-04 (6655b1f)

API image `c9ba5f4183fe` (`traininghub-api:deploy-6655b1f`) was deployed first.
A fresh database backup was verified with gzip integrity and the complete-dump
footer; previous image/container retained as `rollback-6655b1f`. Runtime
credentials were copied without printing or changing them. Health reports
service/database up, and anonymous comparison reads return 401. The deployed
compiled routes SHA-256 matches the locally verified API build. All 27
migrations remain applied; no new migration or training-row rewrite.

Then the phone Release build completed, deep/strict signature verification
passed, and `workout-processing` remains in its compiled Info.plist. The
embedded Watch binary contains the new rest-skip implementation. Phone and
Watch apps were installed successfully and launched on the owner's devices.
No Metro connection is required. No push was performed.

Delivery is complete. Feature-specific locked/offline/expiry/accessibility
acceptance is still open; no physical outcome is inferred from installation.
The original-record investigation remains explicitly deferred.
