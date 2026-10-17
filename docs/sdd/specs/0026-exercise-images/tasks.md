---
spec: 0026
status: in-progress  # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Tasks — Exercise images

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks | docs | links resolve | `docs(sdd): plan and tasks for 0026` |
| 2 | [x] `CreateExerciseInput` moved to `packages/domain`; API and mobile import it | domain, api, mobile | typecheck + tests | `refactor(exercises): share the create exercise contract` |
| 3 | [x] `ExercisePhoto` model + migration; `PUT/GET/DELETE /exercises/:id/photo`; `imageUrl` from photo | api, data | API tests; `migrate deploy` on PGlite | `feat(exercises): photos for custom exercises` |
| 4 | [ ] Matching script, matcher tests, alias file, npm scripts | api | unit tests; run on PGlite | `feat(exercises): match catalog images from free-exercise-db` |
| 5 | [ ] `expo-image-picker` pinned + `app.json`; `resolveImageSource`; `exercisesClient` upload; `ExerciseThumb`/detail fallback on error | mobile | unit tests | `feat(exercises): load images with auth and fall back to the tile` |
| 6 | [ ] `ExercisePhotoField` in the create form, "Add/Change photo" on the detail, thumb in the active workout card; i18n | mobile | web preview: AC-2 | `feat(exercises): add a photo to a custom exercise` |
| 7 | [ ] Progress log, definition of done, spec status | docs | | `docs(sdd): close spec 0026 implementation` |

### Commands for tomorrow with the owner (server) — not run by the agent

After deploying the API (the container applies the migration on start):

1. Dry run (no DB write; writes a CSV), from `apps/api`:
   `pnpm run import:images`
2. Review `tmp/free-exercise-db-matches.csv`; optionally add aliases to
   `src/scripts/data/free-exercise-db-aliases.json` and re-run.
3. Apply: `pnpm run import:images:db` (uses `DATABASE_URL` from `.env`).
   Only fills empty `imageUrl`; safe to re-run.
4. AC-1 check: the read-only SQL is in the progress log of task 4.

### Acceptance criteria -> tasks

| AC | Task | How |
|---|---|---|
| AC-1 | 4 | Local coverage report; owner's top 50 on the server (pending) |
| AC-2 | 3, 5, 6 | API tests + web preview; camera/library on device (pending) |

## Progress log

- 2026-10-17 - Plan and tasks written and self-approved under the owner's
  delegation.

## Definition of done

- [ ] Every functional requirement and acceptance criterion met or deferred
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Migration deployed and matching script run on the server (owner, tomorrow)
- [ ] Device rebuild; camera and library checked on device
- [ ] Roadmap 06 and backlog updated (coordinator)
