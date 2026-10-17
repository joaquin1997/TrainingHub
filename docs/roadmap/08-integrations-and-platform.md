# 8. Integrations & platform

## Checklist
- [ ] Offline support + sync (Hevy works offline) — most expensive
- [~] Apple Health / Health Connect (calories, heart rate)
  - [x] Live workout status on the lock screen / Dynamic Island with active
    calories from Apple Health (spec 0012, iOS)
  - [ ] Write finished workouts to Health; heart rate; Health Connect
- [x] Apple Watch app (spec 0025 — device checks pending)
  - [x] Live Activity on the watch's Smart Stack (Level 1, iOS 18)
  - [x] watchOS app mirroring the active workout: heart rate, calories, Done,
    rest with haptic, pause/resume, finish request; saves the workout to
    Health (Level 2, opt-in build flag)
- [~] Push notifications (rest timer, reminders)
  - [x] Rest timer: local notification when a rest ends outside the app
    (spec 0018, iOS; no push server needed)
  - [ ] Reminders
- [~] Settings
  - [x] Units (kg/lb), server-persisted, applied across logging, history and progress
  - [x] Default rest duration, server-persisted
  - [ ] Theme (the app is dark-only today)
  - [x] Onboarding (spec 0037 — first run; device checks pending)
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
- (2026-10-17) Spec 0018 — rest alerts. A local module `modules/rest-alert`
  schedules one local notification at the end of each rest (cancelled on
  skip, a new rest, finish or discard), so the phone and a paired watch buzz
  with the app in the background; the Live Activity shows the rest countdown.
  Native → rebuild. Details in [02-rest-timer.md](02-rest-timer.md).
- (2026-10-17) Spec 0025 — the workout on the Apple Watch. **Level 1:** the
  Live Activity declares the small family on iOS 18, so the watch's Smart
  Stack shows routine, clock, rest countdown and calories (no buttons); iPhone
  views unchanged. **Level 2:** a watchOS 11 app (`targets/watch/`) and a
  local module `modules/watch-workout` (WatchConnectivity). Starting a workout
  on the phone opens the watch app into it; the watch runs a HealthKit
  workout session (heart rate, calories — the phone shows the watch's kcal
  once it arrives), offers Done for the current set, runs the rest with a
  haptic at its end, Pause/Resume and a Finish request that opens the
  confirmation on the phone. Watch requests queue while disconnected and are
  applied in order, a replay is ignored. On finish the watch saves the
  workout to Health; on discard it saves none. Level 2 is opt-in with
  `TRAININGHUB_WATCH_APP=1` at prebuild (the watchOS platform must be
  installed; HealthKit signing on a free team is unverified). All device
  checks pending.
