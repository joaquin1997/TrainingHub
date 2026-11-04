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
