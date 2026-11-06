---
spec: 0042
status: in-progress
created: 2026-11-03
---

# Tasks — Readable exercise progress

Task gate self-reviewed under the delegated SDD gates. Implementation tasks
1–7 are complete locally; rollout/acceptance task 8 remains open. Each row is
independently committable and verifiable;
run `pnpm -r typecheck` and `pnpm -r test` before implementation commits.

## Dependencies and order

0043 local implementation is complete; its production rollout is tracked
separately. 0042 is the next agreed progress priority. No dependency on
0046–0053 is required. Preserve 0048 record definitions and 0053 summary scope.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Define optional search names, saved set evidence, workout identity, working rep/recorded volume fields and readable-detail version. | domain | Existing API/mobile callers typecheck without supplying new fields; no framework or non-kg contract. | `feat(domain): define readable exercise progress evidence` |
| 2 | [x] Group repeated exercise occurrences per workout; derive deterministic same-set heaviest evidence, working totals and latest from performed work while preserving record rules. | api/rules | AC-3, AC-7–AC-9, AC-12; 100×5/80×12, ties, both sides, warm-ups, legacy whole-session detection, warm-up-only, duplicate occurrences and timestamps, mixed quantities. | `fix(progress): derive coherent per-workout exercise points` |
| 3 | [x] Load ordered saved IDs and authorized bilingual search names; expose additive fields/version through existing owned reads. | api | AC-2–AC-3, AC-7–AC-8; repository ownership/projection tests, 401/404/service error, retired/deleted/foreign-private historical references, count and record regressions. | `feat(api): expose owned progress search and session evidence` |
| 4 | [x] Add pure search/sort, metric/default/formatting, inclusive local-calendar periods and complete period-series helpers. | mobile/rules | AC-2, AC-4–AC-9, AC-12; ES/EN accents/aliases, name ties, five types, kg/lb, month-end/leap/DST boundaries, same-day IDs, absent vs zero, more than 12 sessions and no fallback. | `feat(progress): define exercise lookup and metric controls` |
| 5 | [x] Put trained-exercise lookup before summaries; preserve query/scroll, independent loaded results and retry state across focus/language/account changes. | mobile/overview | AC-1–AC-2, AC-10–AC-11; 320 pt, local filtering with no per-keystroke fetch, empty/clear, failed optional summary, stale request, account switch and return after save. | `feat(progress): find trained exercises before summaries` |
| 6 | [x] Build shared typed detail with latest evidence/date, named metric/period controls, inline explanations, all-time records and identity-based saved-workout links; preserve data on refresh failure. | mobile/detail | AC-3–AC-10, AC-12, EF-1–EF-7; five types, periods, paired rows, original measurements, first session, unavailable older API, retry/stale account, single/missing points and correct summary/record units. | `feat(progress): show explicit exercise metrics and session evidence` |
| 7 | [x] Complete accessible point inspection in SVG/bar paths, exercise-origin stack route/action and existing exercise-info history preview; verify both Back paths. | mobile/navigation | AC-3, AC-7, AC-9–AC-12; unique route matching, exact workout links, query/position restoration, no-history action, tap/keyboard/reader controls, selected point invalidation and same-day date/time. | `fix(progress): preserve navigation and accessible session inspection` |
| 8 | [ ] Record web/native visual checks, API/bundle rollout and physical-device acceptance; synchronize documentation/status only with evidence. | docs/rollout | AC-1–AC-12, FR-1–FR-13, EF-1–EF-7; ES/EN, light/dark, 320 pt/large text, VoiceOver/TalkBack, iOS/Android/web, offline refresh, save/revisit and account isolation. | `docs(sdd): record readable exercise progress acceptance` |

## Delivery and acceptance

API before bundle; no schema changes or new native modules. Unit/route checks,
web navigation/visual inspection, delivery and physical-device acceptance are
distinct. Do not mark task 8 complete from automated tests or mock previews.
Record unsupported environments explicitly until checked. Keep API rollback
behavior explicit when evidence/version fields are unavailable.

## Definition of done

- [ ] All FR/EF/AC cases have implementation and verification evidence.
- [x] Required typecheck/tests pass; existing records, volume and active workouts remain compatible.
- [ ] API and bundle delivery recorded separately from local implementation.
- [ ] Device navigation, screen-reader/large-text and identity/refresh acceptance recorded.
- [ ] Roadmap/backlog and spec/plan/tasks status updated only after acceptance.

## Progress log

- 2026-11-03 — Reviewed current aggregation, DTOs, read routes, chart helpers,
  overview/detail and exercise-info navigation. Prepared and self-reviewed
  plan and eight ordered implementation/acceptance tasks. No implementation,
  data changes, rollout or device acceptance performed in this planning pass.
- 2026-11-03 — Planning validation passed: relative links resolve, all 12 AC
  are mapped, eight implementation/acceptance rows remain unchecked and status
  metadata is consistent. `pnpm -r typecheck` passed; `pnpm -r test` passed
  1,270 tests (809 mobile, 461 API), with two opt-in database tests skipped.
  These are baseline checks, not evidence of implemented 0042 behavior.

- 2026-11-03 — Implemented tasks 1–7: additive domain evidence/search metadata,
  combined per-workout points, ordered owner-scoped projection, search-first
  overview and a common metric/period detail with saved-workout links. Added
  regression tests for same-set pairs, duplicate occurrences, missing values,
  private aliases, identity/retry races and local-calendar boundaries. Retired
  the unused duplicate timed detail and first-session heaviest timeline.
  Local implementation is distinct from task 8's rollout/device acceptance.

- 2026-11-03 — Local validation passed: typecheck, 1,309 tests (830 mobile,
  479 API, two optional database tests skipped), API build and 72 progress-helper
  tests under Europe/Madrid. Browser checks cover English/dark and
  Spanish/light at 320 pt, enlarged text, exact saved-workout and exercise-origin
  navigation, all five tracking types, refresh failure/retry and older-service
  handling. Synthetic screenshots and acceptance limits are recorded in
  [verification](verification.md). Production delivery and physical iOS/Android
  checks remain pending; task 8 and spec completion stay open.
