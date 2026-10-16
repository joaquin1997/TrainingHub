---
spec: 0028
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Tasks — Share a workout

Each task leaves `pnpm -r typecheck` and `pnpm -r test` green (Article 8).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | `formatWorkoutShareText` pure formatter, i18n keys, unit tests | mobile | vitest, both languages and units | `feat(mobile): share text for a finished workout` |
| 2 | Share button on summary and detail | mobile | typecheck, web preview; the sheet is a device check | `feat(mobile): share a workout from summary and detail` |

- [ ] 1
- [ ] 2

## Progress log

## Definition of done

- [ ] Every FR and AC met or deferred with a TODO (FR-3 waits for 0023)
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Device check: share sheet to Notes
