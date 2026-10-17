---
spec: 0037
status: approved     # self-approved under the delegated gates, 2026-10-18
created: 2026-10-18
---

# Plan — First run and record celebration

App-only. No API change, no migration. One optional native addition to the
local `rest-alert` module (permission state, open system settings); without
it the JS update runs and the alert question is simply not shown.

## Current state (verified in the code, 2026-10-18)

- `app/_layout.tsx` `RootNavigator`: waits for auth and the stored workout
  (0010), sends signed-in users from `/auth` to `/routines` (and pushes the
  active workout over it). `index` redirects to `/routines`.
- `SettingsContext`: defaults `{ unit: 'kg', defaultRestSeconds: 90,
  language: null }`; a failed load silently keeps them (no way to tell);
  `update` is optimistic and swallows failures.
- `I18nProvider` follows `settings.language ?? device language`;
  `i18n/device.getDeviceLanguage`.
- Rest alert: `restTimer/restAlerts.ts` (iOS `RestAlert` module:
  `requestPermission`, `schedule`, `cancel`); the runner asks the first time
  a rest is scheduled per app run.
- Summary: `WorkoutSummaryScreen` fetches `sessionRecords()` after opening,
  shows `RecordsCard variant="highlight"`; haptics `ui/haptics` (four
  events); `ui/useReducedMotion`.
- Device storage: AsyncStorage (`persistence/asyncActiveWorkoutStorage`).

## Constitution check

| Article | Engaged? | Compliance |
|---|---|---|
| 1 | yes | Three screens, one celebration; no tour, no new personal data. |
| 3 | no | No shared contract changes. |
| 4 | yes | Unit chosen is a display preference saved like Settings. |
| 6 | yes | Permission state and system settings behind `RestAlerts` (new optional `permissionStatus`, `openSystemSettings`). |
| 8 | yes | See tasks. |
| 9 | yes | No new dependency; the native addition is in the existing local module and guarded. |

## Design

**Pure, tested** — `features/onboarding/firstRunRules.ts`:
`isAccountSetUp({ settings, routineCount, workoutCount })` (FR-2) and
`firstRunDecision({ done, setUp, hasActiveWorkout })` → `show | record | wait`
(`record` = set up: mark done without showing; `wait` = active workout or
unknown: nothing recorded). `preselectedUnit(measurementSystem)` → `lb` for
`us`, else `kg` [ASSUMPTION: only the US system preselects pounds; the UK
system is not, as UK gyms load in kg]. `languageToSave(chosen, device)` → null
when the device language was kept (FR-6).

**Device memory** — `lib/deviceStore.ts` over AsyncStorage (falls back to
memory): `firstRun.done.<userId>`, `restAlerts.notNow`,
`celebrated` (last 50 workout identities).

**Gate** — `features/onboarding/useFirstRunGate.ts` used by `RootNavigator`:
per signed-in user, once per app run: read the done flag; if not done, decide
with settings (needs `SettingsContext.loadState === 'loaded'`, new field),
then routines and workouts lists (both `.length`, in parallel), within 3 s
(NFR; timeout/failure → `wait`, EF-2/EF-8). `show` → `router.replace
('/first-run')`; while deciding the navigator keeps the spinner (no Routines
flash). The active workout restored at sign-in wins (FR-1.3).

**Screen** — `app/first-run.tsx` → `onboarding/screens/FirstRunScreen.tsx`:
three steps in local state (FR-13), Skip on each, Back on 2–3. Language
switch calls `i18n.changeLanguage` for the preview; Skip, sign-out or a failed
save restore the account's language (EF-3). Step 2 shows rest chips 60/90/
120/180 and, when `restAlerts.permissionStatus()` is `notAsked`, the
explanation with Allow alerts / Not now. Finish → `SettingsContext.save`
(new, throws on failure) → done flag → `/routines` or
`/settings/profile-edit`.

**Rest alerts** — runner: `requestPermission` wrapped so it returns without
asking when `restAlerts.notNow` is set (FR-9). Settings: `RestAlertsRow`
(iOS with the module): on / off / not asked; tap asks or opens the system
settings (FR-14).

**Celebration** — `workouts/components/RecordCelebration.tsx` wraps the
records block: when records (≥ 1) appear, the screen is focused and the app
active, and the workout's identity is not in `celebrated`: record haptic once,
`announceForAccessibility` ("N records today"), mark celebrated, and a lime
burst (`Animated` scale/opacity of a lime soft rounded rect behind the card,
`pointerEvents="none"`, ~900 ms); under Reduce Motion a static lime edge
instead, kept while shown. Pure `shouldCelebrate(...)` tested.

## Native

`RestAlertModule.swift`: `permissionStatus()` → `notDetermined | denied |
granted` (`getNotificationSettings`), `openSettings()` (notification settings
URL on iOS 16+, else app settings). JS treats their absence as unknown.

## Risks

- The first-run decision lists all workouts once per account per device;
  existing accounts are recorded as done right after (no repeat cost).
- `i18n.changeLanguage` during the first run is undone on every exit path.
