---
spec: 0027
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Tasks — Personal profile and body measurements

Each task leaves the tree green (`pnpm -r typecheck` and `pnpm -r test`).
Order: domain → migration → API → mobile → docs.

## Task list

| # | Task | Area | Verify | Commit message |
|---|---|---|---|---|
| 1 | [x] Plan and tasks; spec status `in-progress` | docs | links resolve | `docs(sdd): plan and tasks for 0027` |
| 2 | [ ] `packages/domain/src/profile.ts` (profile, photo, measurement entry/input, range error), exported | domain | typecheck | `feat(domain): profile and body measurement contracts` |
| 3 | [ ] `schema.prisma`: `User.bio/heightCm/photo`, `BodyMeasurement`; migration generated with `prisma migrate diff`; `prisma generate` | api | `prisma migrate deploy` on local PGlite (ports 55427); typecheck | `feat(api): schema for profile fields and body measurements` |
| 4 | [ ] `features/profile`: validation (name, bio, height range, JPEG base64), repository, `GET/PUT /profile`, `PUT/DELETE /profile/photo`; registered; unit + route tests | api | tests | `feat(api): profile endpoints` |
| 5 | [ ] `features/measurements`: validation (date, ≥1 value, ranges, unknown fields), owner-scoped repository, `GET/POST/PUT/DELETE /measurements`; registered; unit + route tests | api | tests | `feat(api): body measurement endpoints` |
| 6 | [ ] `lib/length.ts` (cm↔in, ft+in, formatting) and `features/profile/utils/measurements.ts` (kinds, latest, history, changes, BMI + band, waist-to-height, display↔canonical); unit tests | mobile | tests (AC-1..AC-4 maths) | `feat(profile): length units and derived body figures` |
| 7 | [ ] Settings becomes a stack (`(tabs)/settings/_layout` + `index`); `profileClient`; `ProfileAvatar`; account card with avatar + name → Profile; `ProfileScreen` (identity part) and `ProfileEditScreen` (name, bio, height in cm or ft+in); i18n en/es | mobile | typecheck + tests; web preview | `feat(profile): profile screen reached from settings` |
| 8 | [ ] Photo: `expo-image-picker` + `expo-image-manipulator` pinned; `app.json` plugin (library only); `pickProfilePhoto` (square, 512 px, JPEG 0.7, base64); set/remove action sheet | mobile | typecheck; web preview AC-5; **[DEVICE] rebuild + iOS picker** | `feat(profile): profile photo` |
| 9 | [ ] `measurementsClient`; `MeasurementEntryScreen` (date stepper, fields in display unit, save/edit/delete, range error in display unit); Profile body section (BMI + band + note, WtHR, latest per kind with date, add button) | mobile | typecheck + tests; web preview AC-1, AC-3, AC-4 | `feat(profile): record body measurements` |
| 10 | [ ] `MeasurementHistoryScreen` (latest, change since previous/first, chart, entries list → edit); `ProgressChart` optional `formatValue` | mobile | typecheck + tests; web preview AC-2 | `feat(profile): measurement history with trend` |
| 11 | [ ] Progress log, definition of done | docs | — | `docs(sdd): record 0027 implementation` |

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

## Definition of done

- [ ] Every functional requirement and acceptance criterion in `spec.md` is met
      or explicitly deferred with a TODO
- [ ] `pnpm -r typecheck` and `pnpm -r test` green
- [ ] Relevant `docs/roadmap/NN-*.md` checklist and progress log updated
      (coordinator)
- [ ] `spec.md` status set to `done`; `../backlog.md` updated (coordinator,
      after device and deploy checks)
- [ ] Constitution amended if this work settled a new invariant (Article 4
      extended to lengths in cm: proposed to the coordinator)
