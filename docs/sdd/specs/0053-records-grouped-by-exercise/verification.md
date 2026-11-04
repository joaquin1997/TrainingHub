# 0053 local verification — 2026-11-05

Tasks 1–3 implemented; rollout and task 4 device acceptance remain open.
No production API/database or training data was changed in this pass.

## Automated checks

- `pnpm -r typecheck` passes for mobile, domain and API.
- `pnpm -r test`: 893 mobile and 514 API tests pass. Nine opt-in database
  integration tests are skipped in this run; 0050 records their earlier
  isolated PostgreSQL evidence. No new database tests are required by 0053.
- Nine new cases cover 3+2 records without loss, first saved occurrence,
  repeated IDs, identical names with distinct IDs, missing/retired identities,
  stable type/date ordering, supporting values without mutation, ES/EN and
  kg/lb formatting, PR-only counts, failure retention and successful empty.
- Existing resource tests cover stale replies and account isolation; existing
  celebration tests retain the same already-viewed-workout identity.
- `pnpm --filter @workout/mobile exec expo export --platform web --output-dir
  /tmp/traininghub-0053-web` passes.
- `git diff --check` passes.

## Presentation and error behaviour

Summary groups use saved exercise order from 0050, not template/draft order.
Saved workout detail had an existing multi-exercise list; FR-3 now applies the
same composition there. Every row retains type/value, supporting set and date;
no independent maxima are combined. Unknown IDs keep their saved names.
Single-exercise Progress and share text/image callers keep their interfaces.
Last-session improvement-only feedback is excluded from groups and counts.

Ordinary refresh failures keep loaded results and expose Retry. A successful
empty record response produces no record section. Account changes create a
new resource; invalidated requests cannot publish into the next account/view.
401/404 clear rejected data. Summary evidence targets the exact saved workout.

## Delivery and acceptance pending

0053 alone is a mobile bundle change. The combined checkout includes 0050:
apply its generated migration and API before delivering the app. No delivery
has occurred for either local slice in this pass.

Browser/native UI automation was unavailable during the preceding local
verification (browser host unavailable/native browser timeout); no screenshot,
visual or device acceptance is claimed. Check on device:

- Summary with three bench and two squat records in saved order; repeated ID
  and same-name distinct IDs; retired exercise evidence remains usable.
- ES/EN, kg/lb, light/dark, 320 pt and large text without overlap/truncation.
- Screen reader: heading, record type, figure/unit and date; all rows initially
  visible. Evidence opens the correct saved workout.
- Initial failure and refresh failure with Retry; loaded groups remain visible;
  revisiting/retrying never repeats an already-viewed celebration.
- Existing per-exercise Progress and share text/image appearance unchanged.
