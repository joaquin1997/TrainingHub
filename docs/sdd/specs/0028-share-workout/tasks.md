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

- [x] 1
- [x] 2

## Progress log

- 2026-10-16 — Task 1: formatter and 3 unit tests (both languages, both units). Task 2: Share button on both screens; web preview of the detail shows the button and the text handed to the share API (AC-1 on web). The native sheet to Notes is a pending device check.
- 2026-10-17 — Coordinator: roadmap 07 ("Share a workout" ticked, first
  progress-log entry) and backlog row updated.

## Definition of done

- [x] Every FR and AC met or deferred with a TODO (FR-3 done after 0023 merged, 2026-10-17)
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [x] Roadmap 07 and backlog updated (coordinator, 2026-10-17)
- [ ] Device check: share sheet to Notes
