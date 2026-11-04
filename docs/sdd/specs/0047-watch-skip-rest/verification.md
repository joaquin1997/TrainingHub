# 0047 local verification — 2026-11-04

Tasks 1–4 implemented. Task 5 remains open for paired app installation and
physical acceptance. No new dependency, schema change, server deployment or
training-data write was made for this implementation.

## Checks

- `pnpm -r typecheck` — passes.
- `pnpm -r test` — 871 mobile + 495 API pass; two opt-in DB tests skipped.
- Native watch sources typechecked with `swiftc` against watchOS 11.
- Paired Release build: `xcodebuild -workspace ios/TrainingHub.xcworkspace
  -scheme TrainingHubWatch -configuration Release
  -destination generic/platform=watchOS -derivedDataPath ios/DerivedData
  -allowProvisioningUpdates build` — passes.
- `git diff --check` — passes.

Phone tests verify Done-derived identity, rest adjustment, immediate Done/Skip,
Skip-before-Done cross-path ordering, current/newer/same-set-retick rests,
paused/expired/unknown/foreign rests, repeat handling across persisted draft
restores, explicit acknowledgement and unchanged set/next-target data.
Controller tests verify obsolete-skip acknowledgements and newer-rest safety.
Runner integration verifies cancellation without a later scheduled vibration.
Wire parity exercises the new keys/labels and rejects malformed skip events.

Executable Swift tests verify pending request and suppression persistence,
unrelated/old acknowledgements, newer-rest visibility, rejection reconciliation
when the phone retains the rest, workout changes, stale context after restart
and rejection of older contexts after workout completion. Existing 0045
mirroring-recovery tests still pass; the native retry/live/queue paths remain.

## Remaining acceptance

- [ ] Install paired phone/Watch builds, with phone support delivered first.
- [ ] With the phone locked, Skip clears both countdowns/live activity within
  five seconds; no old phone alert or watch buzz at the former end.
- [ ] Disconnect/reconnect; immediate Done then Skip; pending acknowledgement
  and restart; natural-expiry race and paused/resumed workout.
- [ ] Check warm-up/superset next-set and reps parity, ES/EN, 44-point control,
  actual old/new capability matrix and 0045 locked-phone/Health regression.

The disconnected phone may still fire its pre-scheduled alert until it receives
the skip (accepted EF-1). Local tests and compilation do not prove physical
delivery, alert cancellation or Health/battery acceptance.

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

## Owner connected-device check — 2026-11-04

After being asked to skip a running rest with the iPhone locked and check
both countdowns within five seconds, the owner initially could not see the
control. Read-only inspection confirmed the newly installed Watch application
was running and its new rest-skip state was receiving contexts. The owner
then clarified that the initial test was mistaken and explicitly confirmed:
Skip now appears and works. No corrective code change or reinstall was needed.

Record the connected Skip check (AC-1) as passed. Do not infer offline/queue,
natural-expiry/no-former-alert, accessibility or full 0045 Health/battery
acceptance from this single confirmation. Task 5 remains partially open.
