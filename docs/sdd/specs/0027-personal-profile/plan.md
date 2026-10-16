---
spec: 0027
status: approved     # self-approved under the delegated gates, 2026-10-16
created: 2026-10-16
---

# Plan — Personal profile and body measurements

Domain contracts, one additive migration, two small API modules (profile,
measurements), and a profile area in the mobile app reached from Settings.
Two new native Expo modules for the photo, so the device build needs a
rebuild.

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 — Scope control | yes | Profile (name, bio, height, photo) and dated measurement entries only. No progress photos, no left/right values, no goals, no Health import, no use of body weight in volume or calories. Those are in the spec's out of scope. |
| 2 — Template vs performed | no | `BodyMeasurement` is neither a routine nor a workout. It has no relation to either. |
| 3 — Shared domain types | yes | `UserProfile`, `UpdateUserProfileInput`, `SetProfilePhotoInput`, `BodyMeasurementKey`, `BodyMeasurementEntry`, `BodyMeasurementInput` and `MeasurementRangeError` live in `packages/domain/src/profile.ts`. The domain package stays types only. The plausible ranges are a rule, not a contract, so they live in the API. The API sends the broken range back in a `MeasurementRangeError`, and the app builds its message from that. The ranges exist in one place only. |
| 4 — Weight in kg | yes | `weightKg` is persisted in kg. The spec extends the rule to lengths: `heightCm` and the eight `*Cm` circumferences are persisted in cm. The body sends canonical units only. Conversion happens at the edge: `lib/weight.ts` for weight and a new `lib/length.ts` for lengths (cm↔in, ft+in height). Percentages are unitless. |
| 5 — Prisma migrations | yes | `schema.prisma` edit plus one migration folder, `20261016190000_add_profile_and_body_measurements`. The SQL is generated with `prisma migrate diff` (old schema → new schema, no database needed). The schema stays the authority and the SQL mirrors it exactly. It is applied to a local PGlite with `prisma migrate deploy`. The change is additive: three nullable `User` columns and a new table. There is no data change. |
| 6 — Integrations behind interfaces | yes | The image picker and resizer are reached only through `features/profile/photo/pickProfilePhoto.ts`. Screens call `pickProfilePhoto()` and never import `expo-image-picker` or `expo-image-manipulator`. |
| 7 — Secrets | no | No new secret. The photo lives in the database, so there is no new volume or storage credential. |
| 8 — Committable + verified | yes | Eleven tasks (nine code), each green on `pnpm -r typecheck` and `pnpm -r test`. |
| 9 — Dependencies | yes | Adds `expo-image-picker` and `expo-image-manipulator` to `apps/mobile`, pinned to the exact SDK 55 patch. Both are **native**: one `expo prebuild` and device rebuild. Justification: picking from the library has no JS-only path on iOS/Android. Without resizing, a 12 MP photo would be several MB (EF-1), and the picker cannot change pixel dimensions. Both are first-party Expo modules that also work on web, which is what the local preview uses. No chart dependency: the dependency-free `ProgressChart` is reused. |
| 10 — TODOs over half-solutions | yes | Photo storage is a deliberate, sized choice (see Approach), not a stub. One `TODO(sdd)` in Risks: move the photo if 0026 settles on file storage. |

## Current state (verified in the code)

- **User** (`apps/api/prisma/schema.prisma`): `displayName` (required),
  `email`, `passwordHash`, `avatarUrl` (never written by any code path),
  `unit`, `defaultRestSeconds` and `language`. There is no bio, height or body
  data.
- **Settings API** (`features/settings`): `GET`/`PUT /settings`, scoped with
  `resolveUserPublicId(request)`. That is the JWT `sub`, or the dev user when
  the request is anonymous. Every repository filters by
  `user: { publicId }`.
- **Body limit**: Fastify default of 1 MiB. No multipart plugin, no static
  file serving and no storage volume in `docker-compose.yml`.
- **Settings screen** (`(tabs)/settings.tsx` → `SettingsScreen`): a single
  tab route with no nested stack. The account card shows the email and Log
  out only. The display name is not shown or editable anywhere.
- **Charts**: `features/progress/components/ProgressChart.tsx` is a bar chart
  built from plain views, fed by `scaleSeries` in `utils/chartData.ts`. Bar
  labels use `Math.round`, so 83.1 would read "83".
- **Units**: `lib/weight.ts` handles kg↔lb only. `settings.unit` is the only
  unit preference.
- No image picker or manipulator is installed (`expo-image` is present only
  as a transitive dependency).

## Approach

### Data

- `User` gains `bio String?`, `heightCm Float?` and `photo Bytes?` (a JPEG).
- New `BodyMeasurement` table. It holds `publicId`, `userId` (cascade on user
  delete) and `measuredAt` (date and time). It has ten nullable `Float`
  values: `weightKg`, `bodyFatPercent`, `musclePercent`, `neckCm`, `chestCm`,
  `waistCm`, `hipsCm`, `armCm`, `forearmCm`, `thighCm` and `calfCm`. It also
  has `createdAt`/`updatedAt` and an index on `(userId, measuredAt)`.
- BMI and waist-to-height are never stored. They are computed in the app from
  the latest values.

### Photo storage

The photo is stored in the `User.photo` column as a small JPEG. The app crops
it to a square and resizes it to 512 px at JPEG quality 0.7 before upload
(about 30–80 KB, EF-1). The API rejects anything that is not a JPEG, or that
is over 512 KB decoded. `GET /profile` returns it inline as a
`data:image/jpeg;base64,…` URL. `<Image>` renders that URL on iOS, Android
and web without auth headers. It survives restarts (AC-5) because it comes
back from the API.

[ASSUMPTION: "stored on the home server" (spec) is satisfied by the home
server's Postgres. One small avatar per user does not justify file
storage.]

#### Alternatives considered

- **Files on a server volume plus an authenticated download route.** Rejected
  for now. It needs a compose volume, a backup story and a server deploy
  decision. Images on web cannot send the bearer token, so it would also need
  signed URLs. That is the "large infra decision" 0026 may take for many
  exercise photos. One avatar does not justify it.
- **Reusing `avatarUrl` for a data URL.** Rejected. It is semantically a
  provider avatar link, and the auth user mapper reads it. A large value
  there would travel in every login response.
- **Third-party storage (S3, Cloudinary).** Rejected by the spec's assumption
  that photos stay on the home server.
- **A separate `/profile/photo` image route.** Rejected for now. Web `<Image>`
  cannot authenticate, and the inline URL is small.

### API

There are two feature modules, both scoped like the rest:

- `features/profile`: `GET /profile`, `PUT /profile`, `PUT /profile/photo`
  and `DELETE /profile/photo`.
- `features/measurements`: `GET /measurements`, `POST /measurements`,
  `PUT /measurements/:id` and `DELETE /measurements/:id`.

`GET /measurements` returns all of the user's entries, newest first. A weekly
weigh-in for years is a few hundred small rows, so no pagination is needed.
The app derives everything else from the list: latest values, histories and
changes.

Validation lives in pure functions (`parseProfileUpdate`,
`parseMeasurementInput`) with unit tests. A value outside its range gets a
400 with a `MeasurementRangeError` (`field`, `min`, `max`, canonical
units). A missing or invalid date, an entry with no values, or an unknown
field also gets a 400.

**Plausible ranges** (canonical). [ASSUMPTION: chosen wide enough for any
adult reading. The spec's examples all fall outside them.]

| Field | Range |
|---|---|
| `heightCm` | 50–272 |
| `weightKg` | 20–400 |
| `bodyFatPercent` | 2–70 |
| `musclePercent` | 5–90 |
| `neckCm` | 20–80 |
| `chestCm` | 50–200 |
| `waistCm` | 40–200 |
| `hipsCm` | 50–200 |
| `armCm` | 10–80 |
| `forearmCm` | 10–60 |
| `thighCm` | 20–120 |
| `calfCm` | 15–80 |

`musclePercent` is wide because scales report different things under that
name.

`displayName` is trimmed and must be 1–50 characters. `bio` is trimmed and
at most 300 characters; empty means null.

### Mobile

**Navigation.** `(tabs)/settings.tsx` becomes `(tabs)/settings/` with a
nested `Stack`, like Progress. The Workout bar and the tab bar stay visible.
It has four routes:

- `index`: `SettingsScreen`.
- `profile`: `ProfileScreen`.
- `profile-edit`: name, bio and height.
- `measurement`: the entry form. With `?entryId=` it edits that entry.
- `measurements/[kind]`: the history.

**Settings account card.** It shows the avatar (photo or initials) and the
display name over the email, and is tappable to open Profile. This follows
the spec assumption: the profile is reached from Settings.

**Profile screen.**
- Photo with an "Edit photo" action sheet (Choose photo / Remove).
- Name, bio and height, plus an Edit button.
- "Body" section:
  - BMI to one decimal, with the WHO band and the "rough indicator" note.
    Hidden unless the latest weight and the height both exist (FR-5, AC-4).
  - Waist-to-height to two decimals, under the same rules (FR-6).
  - One row per measurement that has a value: latest value in the display
    unit, and its date (FR-4). Tapping a row opens its history.
- An "Add measurement" button.

Data is loaded on focus with `useFocusEffect`, as History and Progress do.

**Entry form.**
- The date defaults to today, with previous/next-day buttons (no date-picker
  dependency).
- One decimal input per measurement, in the display unit (kg/lb, cm/in, %).
- Save sends canonical values.
- When editing, there is also Delete (with confirm).

`measuredAt` is the chosen date with the current time of day for new
entries. When editing, the original time of day is kept, so two entries on
one day stay ordered (EF-3). A 400 range error is shown as "Waist must be
between 15.7 and 78.7 in", converted to the display unit (EF-2).

**History screen.**
- The latest value.
- Change since the previous entry and since the first one, signed, in the
  display unit (FR-3, AC-2). Hidden with a single entry (EF-4).
- `ProgressChart` over every entry, oldest first. Each entry is its own bar
  (EF-3). The chart is hidden with a single entry.
- The list of entries, newest first. Tapping one edits it.

`ProgressChart` gains an optional `formatValue` prop, so bars read "83.1"
rather than "83". This is additive, and current callers are unchanged.

**Units.** A new `lib/length.ts` provides:
- `fromCm`/`toCm` (in when unit is lb)
- `formatLength`
- `cmToFeetInches`/`feetInchesToCm`
- `formatHeight` ("180 cm" or "5 ft 11 in")

In lb mode, height is edited as two inputs (ft, in).
`features/profile/utils/measurements.ts` holds:
- the ordered list of kinds and each kind's dimension (weight, length,
  percent)
- `latestByKind`
- `historyOf`
- `changesOf`
- `bodyMassIndex`
- `bmiBand`
- `waistToHeight`
- display↔canonical conversion per kind

### Alternatives considered (mobile)

- **A sixth tab for Profile.** Rejected by the spec assumption.
- **Root-stack screens** (like `workouts/[workoutId]`). Rejected because the
  tab bar and Workout bar would disappear, and the Settings tab has no stack
  to come back to.
- **A charting library** (`react-native-svg`-based). Rejected under Article
  9. The bar chart already exists and satisfies "trend chart".
- **Computing latest values and BMI in the API.** Rejected. It would be a
  second endpoint for data the app already has in full. The derivations are
  pure and unit-tested.

## Shared contracts (`packages/domain`)

New `src/profile.ts`, exported from `index.ts`:

```ts
UserProfile { displayName; email: string | null; bio: string | null;
              heightCm: number | null; photoDataUrl: string | null }
UpdateUserProfileInput { displayName?; bio?: string | null; heightCm?: number | null }
SetProfilePhotoInput { imageBase64: string }            // JPEG bytes, base64
BodyMeasurementKey = 'weightKg' | 'bodyFatPercent' | 'musclePercent' | 'neckCm'
  | 'chestCm' | 'waistCm' | 'hipsCm' | 'armCm' | 'forearmCm' | 'thighCm' | 'calfCm'
BodyMeasurementValues = Partial<Record<BodyMeasurementKey, number | null>>
BodyMeasurementEntry extends BodyMeasurementValues { id; measuredAt; createdAt; updatedAt }
BodyMeasurementInput extends BodyMeasurementValues { measuredAt: ISODateString }
MeasurementRangeError { message; field: BodyMeasurementKey | 'heightCm'; min; max }
```

Impact: the API and mobile consume them. No existing type changes.

## Data model and migrations

- Migration name: `20261016190000_add_profile_and_body_measurements`
- Backfill / data migration needed: no. All new `User` columns are nullable,
  and the new table starts empty. Existing users and data are untouched.

## API surface (`apps/api`)

All routes use `resolveUserPublicId` (bearer token, or the dev-user
fallback, as in the rest of the API).

| Method | Path | Body | Success | Failures |
|---|---|---|---|---|
| GET | `/profile` | — | 200 `UserProfile` | — |
| PUT | `/profile` | `UpdateUserProfileInput` | 200 `UserProfile` | 400 invalid name/bio, or height out of range (`MeasurementRangeError`) |
| PUT | `/profile/photo` | `SetProfilePhotoInput` | 200 `UserProfile` | 400 not a JPEG or empty; 413 over 512 KB |
| DELETE | `/profile/photo` | — | 200 `UserProfile` | — |
| GET | `/measurements` | — | 200 `BodyMeasurementEntry[]` (newest first) | — |
| POST | `/measurements` | `BodyMeasurementInput` | 201 entry | 400 (date, empty, range) |
| PUT | `/measurements/:id` | `BodyMeasurementInput` (full replace) | 200 entry | 400; 404 not the owner's |
| DELETE | `/measurements/:id` | — | 204 | 404 |

## Mobile surface (`apps/mobile`)

- `features/profile/api/profileClient.ts` and `measurementsClient.ts`.
- `features/profile/screens/`:
  - `ProfileScreen`
  - `ProfileEditScreen`
  - `MeasurementEntryScreen`
  - `MeasurementHistoryScreen`
- `features/profile/components/ProfileAvatar.tsx`.
- `features/profile/photo/pickProfilePhoto.ts`: picker, square crop, resize
  to 512 px, base64.
- `app.json`: the `expo-image-picker` plugin, with the photo-library
  permission text and `cameraPermission: false`. Picking from the library
  only. [ASSUMPTION: no camera capture in this slice.]
- **Native rebuild required** (two native modules and an Info.plist
  permission).

## Testing strategy

- **API unit tests:**
  - `parseMeasurementInput`: ranges, empty entry, bad date, unknown field.
  - `parseProfileUpdate`.
  - `decodeJpegBase64`: magic bytes, size.
- **API route tests** (mocked repository):
  - 400 with `MeasurementRangeError`.
  - 404 for another user's entry.
  - 201 and 204 paths.
- **Mobile unit tests:**
  - `lib/length.ts`, including 180 cm → 5 ft 11 in.
  - `measurements.ts`: BMI 25.4, the WHO band, WtHR 0.49, `latestByKind`
    with partial entries and same-day entries, and changes of −0.7/−1.6.
- **Web preview** on the local PGlite API: AC-1 to AC-5.
- **Device:** the photo picker on iOS, and the permission prompt.

| Spec AC | Verified by |
|---|---|
| AC-1 | `measurements.test.ts` (BMI 25.4, band), `length.test.ts` (5 ft 11 in), `weight` (181.7 lb); web preview kg and lb |
| AC-2 | `measurements.test.ts` (changes −0.7/−1.6); web preview history with three bars |
| AC-3 | `measurements.test.ts` (partial entry leaves weight history alone, WtHR 0.49); web preview |
| AC-4 | `measurements.test.ts` (null without height); web preview |
| AC-5 | Web preview: set photo, reload app, sign in, photo shown; **iOS device: pending owner** |

## Files to touch

- `packages/domain/src/profile.ts` (new), `src/index.ts`
- `apps/api/prisma/schema.prisma`,
  `prisma/migrations/20261016190000_add_profile_and_body_measurements/migration.sql`
- `apps/api/src/features/profile/{validation,repository,routes}.ts` and tests
- `apps/api/src/features/measurements/{validation,repository,routes}.ts` and tests
- `apps/api/src/routes/index.ts`: register both modules
- `apps/mobile/src/lib/length.ts` and test
- `apps/mobile/src/features/profile/**` (new)
- `apps/mobile/src/app/(tabs)/settings.tsx` → `(tabs)/settings/{_layout,index,profile,profile-edit,measurement}.tsx`
  and `measurements/[kind].tsx`
- `apps/mobile/src/features/settings/screens/SettingsScreen.tsx`: the
  account card
- `apps/mobile/src/features/progress/components/ProgressChart.tsx`: optional
  `formatValue`
- `apps/mobile/src/i18n/locales/{en,es}.ts`: a `profile` section
- `apps/mobile/package.json`, `app.json`, `pnpm-lock.yaml`
- `docs/sdd/specs/0027-personal-profile/*`

## Risks and open questions

- **0026 may choose file storage for exercise photos.** The spec asks for
  "the same decision". If 0026 lands a file store, moving the avatar is a
  small follow-up: one column and one route.
  `TODO(sdd): align profile photo storage with 0026 once its plan is approved
  — unblocked by 0026's storage decision.`
- **Picker behaviour on iOS** (crop UI, permissions) cannot be checked
  here. The owner verifies it on device.
- **`displayName` is also in the signed-in `User`** kept by `AuthContext`.
  Nothing on screen reads it after this change: Settings and Profile read
  `/profile`. It goes stale until the next sign-in, which does no harm.
- **Large PUT bodies:** a photo base64 under 512 KB decoded is about 683 KB,
  under Fastify's 1 MiB default. No config change is needed.

## Rollout

- **API first.** Deploy the API image; it runs `prisma migrate deploy` on
  startup, which applies the new migration. The API is backwards compatible:
  existing endpoints are unchanged, and older app bundles ignore the new
  routes.
- **Then the app.** The device build needs `expo prebuild` and a rebuild
  (new native modules). A JS-only reload would crash on the photo action.
- **Rollback.** Revert the app. The extra columns and table are harmless if
  left in place.
