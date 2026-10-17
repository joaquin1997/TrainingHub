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
| 4 | [x] Matching script, matcher tests, alias file, npm scripts | api | unit tests; run on PGlite | `feat(exercises): match catalog images from free-exercise-db` |
| 5 | [x] Reuse 0027's picker helper (no new dependency); `resolveImageSource`; `exercisesClient` upload; `ExerciseThumb`/detail fallback on error | mobile | unit tests | `feat(exercises): load images with auth and fall back to the tile` |
| 6 | [x] `ExercisePhotoField` in the create form, "Add/Change photo" on the detail, thumb in the active workout card; i18n | mobile | web preview: AC-2 | `feat(exercises): add a photo to a custom exercise` |
| 7 | [x] Progress log, definition of done, spec status | docs | | `docs(sdd): close spec 0026 implementation` |

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
- 2026-10-17 - Task 2: `CreateExerciseInput` now lives in `packages/domain`.
- 2026-10-17 - Task 3: `ExercisePhoto` table (migration applied on local PGlite,
  `migrate diff` clean); `PUT/GET/DELETE /exercises/:id/photo` with API tests
  (auth, type, magic bytes, creator-only, private cache).
- 2026-10-17 - Task 4: matching script. Local PGlite with the wger catalog
  (932 exercises, 279 already with a wger image): exact name match on the
  Spanish name or any wger translation found 22 of 653 without image; 16
  hand-reviewed aliases brought it to 53 (15 + 38 over two runs; a re-run
  matches 0, so it is idempotent). Catalog coverage ends near 36%
  (332/932). **Honest note on AC-1:** the wger catalog is mostly Spanish and
  obscure; exact matching is conservative. Whether 40 of the owner's top 50
  show an image depends on his data; the report's `suggestion` column
  (Jaccard hint, never applied) is for adding aliases on the server before
  the real run. Read-only check for the top 50 (run on the server DB):

  ```sql
  SELECT e.name, e."imageUrl" IS NOT NULL AS has_image, count(*) AS uses
  FROM "WorkoutExercise" we JOIN "Exercise" e ON e.id = we."exerciseId"
  GROUP BY e.id ORDER BY uses DESC LIMIT 50;
  ```
- 2026-10-17 - After merging feat/sdd-batch (spec 0027): photos aligned with
  the profile photo: base64 JPEG upload (`decodeJpegBase64`, 512 KB), the
  0027 picker/resizer and dependencies reused, no new dependency. Kept a
  separate `ExercisePhoto` table and a binary `GET` so the exercise list is
  not bloated by inline photos.
- 2026-10-17 - Tasks 5-6: `ExerciseImage` (auth headers on native, blob URL
  on web, tile fallback on error), photo field in the create form, "Add/Change
  photo" on the detail (creator only), thumb in the active workout header.
  Verification on local PGlite + API + web preview: curl (register, create,
  PUT photo 204, GET 200 image/jpeg, no token 401, other user 403); web: the
  custom exercise shows its photo in the list, a catalog exercise (Press
  Arnold, via alias) shows its free-exercise-db image, the detail shows
  "Change photo" for the creator. Picker and workout card reuse the same
  component (not screenshotted separately). Camera: not offered (library
  only, like 0027). Picker/library, EF-2 offline: owner [DEVICE].

## Definition of done

- [x] Every functional requirement and acceptance criterion met or deferred (AC-1 pending the server run, AC-2 device check)
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Migration deployed and matching script run on the server (owner, tomorrow)
- [ ] Device rebuild; camera and library checked on device
- [ ] Roadmap 06 and backlog updated (coordinator)
