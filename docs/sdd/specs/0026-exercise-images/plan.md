---
spec: 0026
status: approved     # self-approved under the delegated gates, 2026-10-17
created: 2026-10-17
---

# Plan — Exercise images

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Catalog images by name match; one photo per custom exercise. No video, no translation, no privacy (0015), no editing UI beyond the system picker. |
| 2 — Template vs performed | no | Images belong to the `Exercise` catalog entity only. |
| 3 — Shared domain types | yes | `CreateExerciseInput` (typed twice since 0020) moves to `packages/domain`; both sides import it. `Exercise.imageUrl` stays the single image field. |
| 4 — Weight in kg | no | |
| 5 — Prisma migrations | yes | One additive migration (`ExercisePhoto`), hand-written to match `schema.prisma`, validated with `migrate deploy` on local PGlite. |
| 6 — Integrations behind interfaces | no | The matching script reads a public JSON file; a data script like the wger importer, not a runtime integration. |
| 7 — Secrets | no | No secret. Photo reads require the bearer token. |
| 8 — Committable + verified | yes | One commit per task, each green. |
| 9 — Dependencies | yes | One native dependency, `expo-image-picker` (SDK 55 version, pinned exact). **Needs a device rebuild** (native module + permission strings in `app.json`). No API dependency. |
| 10 — TODOs over half-solutions | yes | App-level offline image cache is a TODO (EF-2 says "where possible"). |

## Current state (verified)

- `Exercise.imageUrl` (nullable) exists in schema, domain and API mapper. The
  app renders it in the list, the picker (`ExerciseThumb`) and the detail
  screen; the active workout card shows no image. A URL that fails to load is
  a broken image today (EF-1 not met).
- The wger importer upserts and overwrites `imageUrl` on every run.
- `POST /exercises` creates a `source: 'custom'` exercise with
  `createdByUserId`. Auth: an optional-JWT hook on every request;
  `app.authenticate` is the strict preHandler.
- free-exercise-db: 876 exercises; `exercises.json` has `name` and
  `images: ['<Folder>/0.jpg', ...]`. Licence **Unlicense (public domain)**; its
  README offers `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<path>`
  as the hosted copy.

## Approach

### 1. Catalog images (FR-1, FR-3, FR-4)

- **Source.** Store the raw.githubusercontent URL of the first image in
  `Exercise.imageUrl`; do not vendor ~870 folders of JPEGs. Public domain, URL
  hosting is a documented use, no attribution required (FR-3; the credit is
  kept in the script header). Cost: dependency on GitHub availability,
  covered by EF-1's fallback tile. Copying into our server rejected: size,
  deploy and volume change with no spec need; the base URL is one constant.
- **Script** `apps/api/src/scripts/match-free-exercise-images.ts`
  (`import:images` dry run, `import:images:db` to write), same shape as the
  wger importer.
  - Candidates: `source = 'wger'`, `isSystemDefined`, `imageUrl IS NULL`.
    Match by normalised name (lower case, accents/punctuation stripped, spaces
    collapsed, trailing plural "s" per word dropped) plus a hand-reviewed alias
    file `src/scripts/data/free-exercise-db-aliases.json`
    (`{ "<catalog name>": "<free-exercise-db name>" }`): the "reviewed by hand"
    step.
  - Writes only `imageUrl`, with `updateMany({ where: { id, imageUrl: null } })`:
    never overwrites a wger image or one a person set, never touches custom
    exercises, never deletes. Idempotent.
  - Prints a summary and writes a CSV of matched/unmatched names for review.
  - Pure matching in `matchImages.ts`, unit-tested.
- **[ASSUMPTION: exact normalised match only (no fuzzy); unmatched exercises,
  Spanish names included, keep the neutral tile; the alias file extends
  coverage after reviewing the report.]**
- **AC-1** is measurable only on the owner's real data: read-only SQL (in
  tasks.md) ranks his 50 most used exercises by image. Locally the report
  gives the overall coverage.

### 2. Photos for custom exercises (FR-2, AC-2)

- **Storage: in Postgres.** Table `ExercisePhoto` (`exerciseId` unique FK,
  cascade; `contentType`; `data Bytes`; `updatedAt`). Not files on a volume:
  the container has no volume, one means a compose change, a separate backup
  path and orphan files; a few hundred KB per photo is trivial for one
  person's data and is backed up with everything else. List queries never
  load `data` (only the photo's `updatedAt`).
- **Endpoints:**
  - `PUT /exercises/:id/photo`: strict auth; only the creator of a non-system
    exercise; raw `image/jpeg|png|webp` body, 5 MB cap, magic bytes checked;
    upsert; 204. 403 not creator, 404 missing, 400/413/415 bad body.
  - `GET /exercises/:id/photo`: strict auth (any signed-in user; 0015 will
    tighten it to the creator); `Cache-Control: private, max-age=31536000,
    immutable`, `nosniff`. The URL carries `?v=<updatedAt ms>` to bust it.
  - `DELETE /exercises/:id/photo`: creator only; 204.
  - A custom exercise with a photo gets `imageUrl` = relative
    `/exercises/<id>/photo?v=<ms>`; the app resolves relative URLs against
    `API_BASE_URL`. Domain type unchanged.
- **Mobile.**
  - `expo-image-picker`: take photo / choose from library, `quality: 0.7`,
    square crop, no EXIF. Permission strings in the `app.json` plugin.
  - `ExercisePhotoField` in `CustomExerciseForm`; the photo uploads after the
    exercise is created (create, PUT, re-read, `onCreated`). If the upload
    fails the exercise exists and the form says so.
  - Exercise detail: the creator sees "Add photo" / "Change photo".
  - `resolveImageSource(url, token)` (pure, tested): absolute URLs as is;
    API-relative ones get the base URL and the `Authorization` header (native
    `Image` and react-native-web both support `headers`). `apiRequest` stays
    JSON-only; upload is a small function in `exercisesClient`.
  - `ExerciseThumb` and the detail image fall back to the tile on `onError`
    (EF-1). The active workout card header gets a small thumb, loaded with
    `exercisesClient.getById` per exercise id, like the last-performance
    effect (AC-2).
  - EF-2: the OS HTTP cache (long `max-age`). **TODO:** no app-level disk
    cache; add `expo-image` if offline proves unreliable.

### Alternatives considered

- **Files on a docker volume:** rejected above. **Third-party storage:**
  contradicts the spec's assumption.
- **Photo inside the create request (base64):** bloats JSON and cannot serve
  "change photo" for existing exercises. The create body is therefore only
  moved to the domain, not widened.
- **Token in the query string so plain `<img>` works:** leaks it in logs.
- **Client-side resize (`expo-image-manipulator`):** a second native
  dependency; picker `quality` plus the 5 MB cap is enough.

## Shared contracts (`packages/domain`)

`CreateExerciseInput { name; primaryMuscleGroupIds; secondaryMuscleGroupIds }`
in `entities.ts`; used by the API route/repository and the mobile client.

## Data model and migrations

- New model `ExercisePhoto`; `Exercise.photo ExercisePhoto?`.
- Migration name: `20261017120000_add_exercise_photo` (additive).
- Backfill: no. The catalog backfill is the script, run separately.

## API surface (`apps/api`)

`PUT|GET|DELETE /exercises/:id/photo`; `mapExercise` fills `imageUrl` from the
photo when no stored `imageUrl` exists.

## Mobile surface (`apps/mobile`)

`ExercisePhotoField`, `resolveImageSource`, `ExerciseThumb` and detail
(`onError`, photo action), `ActiveWorkoutScreen` header thumb,
`exercisesClient`, `app.json`, i18n en/es. **Native rebuild required.**

## Testing strategy

| Spec AC / EF | Verified by |
|---|---|
| matching rules | Unit tests of `matchImages`. |
| AC-1 | Script on local PGlite (coverage report); owner's top 50 on the server (**pending**). |
| AC-2 | API tests (ownership, validation, auth); web preview: create a custom exercise with a photo and see it in list, picker and workout card. Camera/library on device: **[DEVICE]**. |
| FR-4 / EF-1 | Unit test of the source resolver; preview with a dead URL shows the tile. |
| EF-2 | Device check (airplane mode after browsing). |

## Files to touch

- `packages/domain/src/entities.ts`
- `apps/api/prisma/schema.prisma`, `migrations/20261017120000_add_exercise_photo/`
- `apps/api/src/features/exercises/{routes,repository,photo}.ts` (+ tests)
- `apps/api/src/scripts/match-free-exercise-images.ts`, `matchImages.ts` (+ test), `data/free-exercise-db-aliases.json`; `apps/api/package.json`
- `apps/mobile/package.json`, `pnpm-lock.yaml`, `app.json`
- `apps/mobile/src/features/exercises/**`, `workouts/screens/ActiveWorkoutScreen.tsx`, `lib/imageSource.ts`
- `apps/mobile/src/i18n/locales/{en,es}.ts`

## Risks and open questions

- **Order.** Deploy the API (migration runs on start) before the new app
  build; an old app just does not show photos.
- **raw.githubusercontent availability/rate limits:** fallback tile; base URL
  is re-pointable.
- **False positives:** exact normalised match only; CSV reviewed before the
  server run.
- **Photos readable by any signed-in user** until 0015.

## Rollout

Tomorrow with the owner: deploy the API (migration), dry-run then run the
script against the server DB, build the app on the device. Rollback: revert;
the table and filled `imageUrl`s are harmless.
