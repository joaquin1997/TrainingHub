# 8. Integrations & platform

## Checklist
- [ ] Offline support + sync (Hevy works offline) — most expensive
- [ ] Apple Health / Health Connect (calories, heart rate)
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
- Health stubs exist under `apps/*/src/features/health`.
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
