# 0046 verification — 2026-11-04

Implementation tasks 1–4 are complete locally. Task 5 remains open for bundle
delivery, visual/accessibility checks and actual phone/watch acceptance.
No server data, database schema or native dependency changed.

## Automated checks

- `pnpm -r typecheck` — passed.
- `pnpm -r test` — 1,329 passed: 850 mobile and 479 API; two opt-in database
  tests skipped.
- `pnpm --filter @workout/mobile exec expo export --platform web --output-dir /tmp/traininghub-0046-web`
  — passed. This proves bundling, not browser/device interaction acceptance.
- `git diff --check` — passed.

New regressions verify exact third-set selection after undo, most-recent undo
priority, ordinary selection after re-completion, removal fallback, superset
warm-up/round precedence, preservation of typed/suggested values, paused-workout
rest cancellation, adjusted-rest identity, unrelated same-exercise rest
preservation, legacy missing origin, fresh re-completion identity and stale
undo replay rejection. Envelope tests retain the workout/countdown while
dropping malformed optional selection, completion or origin metadata.

Runner integration tests verify cancellation of the originating rest’s pending
alert and in-app timeout without a later vibration. An unrelated undo updates
the scheduled alert’s up-next text at the same end instant, retaining its rest.
The watch controller test verifies delivery of the cleared rest and exact
undone set through the existing bridge. These are test doubles; an installed
watch’s local alert cancellation remains unverified.

Finish-guard tests cover synchronous double-save attempts, confirmation
coalescing/cancellation, a replacement workout while confirmation is pending,
and retry after failed operations. The screen keeps the existing save,
reauthentication and permanent-refusal path, with persistent header errors
and a discard action; asynchronous save results are checked against the active
workout identity before clearing or navigating.

## Remaining acceptance

- [ ] Deliver the app bundle; no API migration or new native dependency is needed.
- [ ] Inspect both themes/languages at 320 pt and maximum text size, including
  all tracking types, unilateral values, navigation Back/title, header Finish,
  compact header, keyboard and rest bar; verify screen-reader reading order.
- [ ] Confirm/cancel Finish, try no completed sets, repeated taps, offline save,
  reauthentication and permanent refusal in the actual UI. Errors and recovery
  must remain visible at both scroll extremes; successful save opens summary.
- [ ] Verify undo on a real phone updates row/header/rest bar/live activity,
  survives restart and preserves superset rounds and current live-record rules.
- [ ] On a connected watch, observe cancellation of its local countdown and
  pending buzz; then verify disconnected/reconnect behavior and paused workout
  with a rest running. Bridge tests alone cannot close AC-9–AC-11.
- [ ] If the installed watch retains a cancelled buzz, retain this open and
  include the paired native correction/rebuild with 0047.

Next planned implementation is 0048; 0047 depends on the stable rest origin
introduced here. Specs remain in-progress until their own acceptance is met.
