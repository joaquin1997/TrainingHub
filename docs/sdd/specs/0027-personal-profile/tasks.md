---
spec: 0027
status: in-progress  # self-approved under the delegated gates, 2026-10-16; code done, device + deploy pending
created: 2026-10-16
---

# Tasks — Personal profile and body measurements

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Order: domain → migration → API → mobile → docs.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | links resolve | `docs(sdd): plan and tasks for 0027` |
| 2 | [x] `packages/domain/src/profile.ts` (profile, photo, measurement entry/input, range error), exported | domain | typecheck | `feat(domain): profile and body measurement contracts` |
| 3 | [x] `schema.prisma`: `User.bio/heightCm/photo`, `BodyMeasurement`; migration generated with `prisma migrate diff`; `prisma generate` | api | `prisma migrate deploy` on local PGlite (ports 55427); typecheck | `feat(api): schema for profile fields and body measurements` |
| 4 | [x] `features/profile`: validation (name, bio, height range, JPEG base64), repository, `GET/PUT /profile`, `PUT/DELETE /profile/photo`; registered; unit + route tests | api | tests | `feat(api): profile endpoints` |
| 5 | [x] `features/measurements`: validation (date, ≥1 value, ranges, unknown fields), owner-scoped repository, `GET/POST/PUT/DELETE /measurements`; registered; unit + route tests | api | tests | `feat(api): body measurement endpoints` |
| 6 | [x] `lib/length.ts` (cm↔in, ft+in, formatting) and `features/profile/utils/measurements.ts` (kinds, latest, history, changes, BMI + band, waist-to-height, display↔canonical); unit tests | mobile | tests (AC-1..AC-4 maths) | `feat(profile): length units and derived body figures` |
| 7 | [x] Settings becomes a stack (`(tabs)/settings/_layout` + `index`); `profileClient`; `ProfileAvatar`; account card with avatar + name → Profile; `ProfileScreen` (identity part) and `ProfileEditScreen` (name, bio, height in cm or ft+in); i18n en/es | mobile | typecheck + tests; web preview | `feat(profile): profile screen reached from settings` |
| 8 | [x] Photo: `expo-image-picker` + `expo-image-manipulator` pinned; `app.json` plugin (library only); `pickProfilePhoto` (square, 512 px, JPEG 0.7, base64); set/remove action sheet | mobile | typecheck; web preview AC-5; **[DEVICE] rebuild + iOS picker** | `feat(profile): profile photo` |
| 9 | [x] `measurementsClient`; `MeasurementEntryScreen` (date stepper, fields in display unit, save/edit/delete, range error in display unit); Profile body section (BMI + band + note, WtHR, latest per kind with date, add button) | mobile | typecheck + tests; web preview AC-1, AC-3, AC-4 | `feat(profile): record body measurements` |
| 10 | [x] `MeasurementHistoryScreen` (latest, change since previous/first, chart, entries list → edit); `ProgressChart` optional `formatValue` | mobile | typecheck + tests; web preview AC-2 | `feat(profile): measurement history with trend` |
| 11 | [x] Progress log, definition of done | docs | — | `docs(sdd): record 0027 implementation` |

Not verifiable in CI or here:
- **[DEVICE]** Task 8 needs `expo prebuild` and an iOS rebuild (two new native
  modules and a photo-library permission). After that, set a photo on the
  phone and check AC-5 after a relaunch.
- **[DEPLOY]** The API redeploy applies migration
  `20261016190000_add_profile_and_body_measurements` on startup. It must ship
  before the new app build.

### Acceptance criteria → tasks

| AC | Task | How |
|---|---|---|
| AC-1 | 6, 9 | Unit tests (BMI 25.4, 181.7 lb, 5 ft 11 in) + web preview in kg and lb |
| AC-2 | 6, 10 | Unit test (−0.7 / −1.6) + web preview |
| AC-3 | 6, 9 | Unit test + web preview |
| AC-4 | 6, 9 | Unit test + web preview |
| AC-5 | 8 | Web preview (reload, sign in) + [DEVICE] |

## Progress log

- 2026-10-16 — Plan and tasks written and self-approved under the owner's
  delegation.
- 2026-10-16 — Tasks 2–5:
  - Contracts, schema and API are done.
  - The migration SQL was generated with `prisma migrate diff`. It was
    applied with `prisma migrate deploy` to a local PGlite that already
    held a user from the earlier migrations. That user kept its data, and
    the new columns are null.
  - A local API run checked owner scoping: another user gets 404 on PUT and
    DELETE, and an empty list. It also checked the range 400 (waist 300).
- 2026-10-17 — Tasks 6–10: the mobile side.
  - `ApiError` now carries the parsed error body, so the app can show the
    API's range in the display unit.
  - Editing an entry in lb keeps the stored kg of untouched fields (no
    drift).
  - `expo-image-picker` 55.0.24 and `expo-image-manipulator` 55.0.21 are
    pinned with `pnpm add`. Metro had to be restarted to resolve them.
  - Web preview (local PGlite API):
    - AC-1, in kg and in lb (181.7 lb, 5 ft 11 in, BMI 25.4).
    - AC-2 (bars at 84, 83.1 and 82.4; −0.7 kg and −1.6 kg).
    - AC-3 (waist-to-height 0.49, body fat 18 %, weight unchanged).
    - AC-4 (height cleared: no BMI or waist-to-height, and a hint).
    - AC-5: an 828 KB 2400×1600 JPEG was stored as a 45 KB 512 px square
      and still showed after a full reload and sign-in.
    - EF-2 ("Waist must be between 40 cm and 200 cm.") and EF-4 (a single
      waist entry shows no chart and no change).
  - `ProgressChart` gained an optional `formatValue`, and `scaleSeries` is
    now exported. Both changes are additive; Progress screens are unchanged.
- Pending:
  - **[DEVICE]** `expo prebuild`, an iOS rebuild, and a photo picked on the
    phone (permission prompt, square crop, AC-5 after relaunch).
  - **[DEPLOY]** An API redeploy, which applies
    `20261016190000_add_profile_and_body_measurements`.
- 2026-10-17 — Coordinator: roadmap 03 (account / profile screen ticked +
  log) and backlog row updated; the migration is in the backlog's owner
  server steps. The proposed Article 4 amendment (lengths in cm) is still
  open.

## Definition of done

- [x] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO (AC-5 on device pending)
- [x] `pnpm -r typecheck` and `pnpm -r test` green
- [x] Relevant `docs/roadmap/NN-*.md` checklist and progress log updated
      (coordinator)
- [x] `spec.md` status set to `done`; `../backlog.md` updated (coordinator,
      after device and deploy checks; backlog row updated 2026-10-17)
- [x] Constitution amended if this work settled a new invariant (Article 4
      extended to lengths in cm: proposed to the coordinator)
