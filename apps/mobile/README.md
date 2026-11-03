# TrainingHub mobile

React Native + Expo + TypeScript application using Expo Router. iOS is the
primary device target. Android and web share the UI and domain code, while
Apple-specific integrations use native modules and platform boundaries.
Android/web behaviour has not received the same device validation as iOS.

## Feature areas

- Email/password authentication, stored-session validation, offline startup
  notice and retry; Google sign-in once OAuth clients are configured.
- Routine editing, catalog search, private custom exercises and replacements.
- Active workouts with persistent drafts, set types, unilateral/time/distance
  values, supersets, warm-ups, pause/resume and rest timers.
- Workout history, summaries, sharing, personal records and progress charts.
- Profile/measurements, ES/EN, kg/lb and System/Light/Dark appearance.
- iOS Live Activities, rest notifications, active energy, an optional Watch
  companion and an optional home-screen widget data bridge.

A stored workout can be reopened offline; saving and uncached server data need
connectivity. This is not a full offline sync system. Apple sign-in and Android
Health Connect remain unfinished. Read the [spec backlog](../../docs/sdd/backlog.md)
for rollout and device checks rather than assuming every implemented path is
already verified on every platform.

## Structure

- `src/app/`: file-based routes.
- `src/features/`: screens, API clients, state and feature rules.
- `src/lib/`: HTTP, device storage, units and shared presentation helpers.
- `src/ui/`: reusable components and theme scales.
- `src/i18n/`: English/Spanish catalogs and language selection.
- `modules/`: local Expo modules.
- `targets/`: generated native extension and Watch app sources.

The shared theme supports light and dark appearance. Reuse its colors,
spacing, radii and type scales; do not introduce a second visual system.

## Start development

Use the configured API deployment described in [development](../../docs/development.md).
From the repository root:

```bash
pnpm mobile
```

The default API address is the Metro development host on port 3000. Override
it from this app directory when necessary:

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 pnpm dev --clear
```

A physical phone needs a reachable LAN/HTTPS address, and an Android emulator
usually uses `10.0.2.2` for its host machine. Public Expo variables are baked
into the bundle; restart Metro after changing them. Browser access also needs
an appropriate CORS/proxy setup when the API has a different origin.

Use a **development build** for native flows. Expo Go cannot supply the local
ActivityKit, HealthKit, rest-alert and Watch modules. Web can be useful for
shared UI work, but does not emulate those capabilities.

## Native builds

`app.json`, `app.config.js`, `modules/` and `targets/` are the maintained
sources. The generated `ios/` and `android/` projects are gitignored.
Regenerate after native configuration, target, module or dependency changes:

```bash
# From apps/mobile; this regenerates the native project.
EXPO_NO_GIT_STATUS=1 pnpm exec expo prebuild -p ios --clean
```

Xcode needs the SDKs required by the generated project and a matching iOS
simulator runtime. For a simulator development build:

```bash
pnpm exec expo run:ios
```

To compile without device signing:

```bash
xcodebuild -workspace ios/TrainingHub.xcworkspace -scheme TrainingHub \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Physical devices require your own development team and provisioning profiles.
The repository's bundle IDs and team setting describe the maintainer's build;
configure your own identity before signing or distributing. A development build
needs Metro; a Release build embeds its JS and runs independently of the Mac.

Do not use `prebuild --clean` to preserve hand edits inside `ios/`; put durable
native changes in the maintained source files instead.

## Native boundaries

| Source | Capability |
|---|---|
| `targets/workout-activity/` | iOS Live Activity and widget extension views/intents |
| `modules/workout-live-activity/` | ActivityKit bridge |
| `modules/health-energy/` | HealthKit active-energy access |
| `modules/rest-alert/` | Local rest-end notification |
| `modules/watch-workout/` | WatchConnectivity and Watch workout coordination |
| `targets/watch/` | watchOS workout app |

Shared native payload contracts have source tests to detect drift between
TypeScript and Swift. They do not replace compilation and device checks.

### Optional Apple Watch and home widget bridge

The default prebuild includes the Live Activity target. The Watch app is
opt-in; install the watchOS platform required by Xcode first:

```bash
TRAININGHUB_WATCH_APP=1 EXPO_NO_GIT_STATUS=1 pnpm exec expo prebuild -p ios --clean
```

`TRAININGHUB_HOME_WIDGET=1` opts into the App Group entitlement needed for live
home-widget data. The extension may still render its placeholder without it.
Enable both in the same prebuild command when signing supports them:

```bash
TRAININGHUB_WATCH_APP=1 TRAININGHUB_HOME_WIDGET=1 EXPO_NO_GIT_STATUS=1 \
  pnpm exec expo prebuild -p ios --clean
```

The Watch app is embedded in the iPhone app and installs through the paired
phone or Xcode/CoreDevice. Developer Mode, signing capabilities and actual
Health permissions must be checked on your devices; free-team capability and
provisioning limits are environment-dependent.

For physical installation, profile renewal and Release builds, see
[deployment](../../docs/deployment.md#native-device-builds).

## Checks

```bash
# From the repository root.
pnpm --filter @workout/mobile typecheck
pnpm --filter @workout/mobile test
```

Tests cover pure feature/state rules and native-source contracts. Real keyboard,
notification, Health, Watch, sharing, layout and permission behaviour requires
separate platform acceptance.
