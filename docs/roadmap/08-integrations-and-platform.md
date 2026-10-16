# 8. Integrations & platform

## Checklist
- [ ] Offline support + sync (Hevy works offline) — most expensive
- [~] Apple Health / Health Connect (calories, heart rate)
  - [x] Live workout status on the lock screen / Dynamic Island with active
    calories from Apple Health (spec 0012, iOS)
  - [ ] Write finished workouts to Health; heart rate; Health Connect
- [ ] Apple Watch app
- [ ] Push notifications (rest timer, reminders)
- [~] Settings
  - [x] Units (kg/lb), server-persisted, applied across logging, history and progress
  - [x] Default rest duration, server-persisted
  - [ ] Theme (the app is dark-only today)
  - [ ] Onboarding
- [ ] Data export
- [x] i18n ES/EN (full app, persisted language preference)

## Notes
- Health providers live under `apps/mobile/src/features/health`; the Apple one
  is real for the live status and active energy (spec 0012), the rest are stubs.
- Weight is stored in kg everywhere; lb is display-only, converted at the edges.

## Progress log
- i18n (P2d): `i18next` + `react-i18next` wired via `apps/mobile/src/i18n`
  (catalogs `locales/en.ts` + `locales/es.ts`, type-checked against
  `TranslationCatalog`). Language is a user setting persisted full-stack:
  `AppLanguage` in `packages/domain`, `language` column on `User`
  (migration `20260531173640_add_user_language`), read/write/validate in the
  settings API. `I18nProvider` keeps i18next in sync with the saved setting and
  falls back to the device locale; a language selector lives in Settings. All
  screens, navigation titles and shared UI migrated off hardcoded strings.
- (2026-10-16) Spec 0012 — live workout status. iOS Live Activity (widget
  extension via `@bacons/apple-targets`, local modules for ActivityKit and
  HealthKit) behind the existing `LiveWorkoutBridge`. Shows routine, a clock
  that runs without the app, active calories (Apple Health, refreshed while the
  app is in the foreground), Pause/Resume and Finish (opens the app and
  confirms). A controller subscribed to the active workout drives it and
  reconciles on launch and when the app becomes active. Needs a native rebuild.
  Open: Face ID asked on lock-screen Pause (spike TODO).
