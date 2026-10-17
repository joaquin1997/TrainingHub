# Mobile App

Expo + React Native mobile shell for the workout tracker. iOS-first, with Android
and web (`react-native-web`) supported by the same code.

- `src/app/` contains Expo Router route files
- `src/features/` contains feature-local placeholder screens
- `src/ui/theme.ts` is the shared design system (see below)
- `src/config/api.ts` resolves the API base URL (`EXPO_PUBLIC_API_URL`, falling
  back to the Metro dev host)

## Design system

`src/ui/theme.ts` centralizes a dark, gym-oriented visual language so screens stay
consistent across iOS/Android/web:

- `colors` — near-black surfaces with a volt-green primary and orange accent
- `spacing` / `radii` — layout scale
- `commonStyles` — shared `StyleSheet` primitives (screen, card, inputs, buttons,
  typography) reused across feature screens

Screens import tokens from `@/ui/theme` instead of hardcoding colors. When wrapping
a child of an Expo Router `<Link asChild>` (a Radix `Slot`), pass `style` as a
function (`({ pressed }) => [...]`) rather than a raw array — an array style on a
Slot child throws at runtime.

## Native builds

The native projects are generated on demand by `expo prebuild` (`ios/`, `android/`
are gitignored). `app.json` (the `expo` config) is the source of truth for native
settings: `ios.bundleIdentifier` / `android.package` and the iOS ATS exception that
allows the app to reach the `http://` backend over Tailscale.

Native code that lives in the repo (spec 0012):

- `targets/workout-activity/` — the Live Activity widget extension, generated
  into the Xcode project by `@bacons/apple-targets`. `_shared/` is compiled into
  both the app and the extension (activity attributes, Pause/Resume intents).
- `modules/workout-live-activity/` — local Expo module (ActivityKit). Keeps its
  own copy of `WorkoutActivityAttributes.swift`; `attributes.test.mjs` fails if
  it drifts from `_shared/`.
- `modules/health-energy/` — local Expo module (HealthKit active energy).
- `modules/rest-alert/` — local Expo module (the rest-end notification, spec 0018).
- `modules/watch-workout/` — local Expo module (spec 0025): WatchConnectivity
  link to the watch app and HealthKit's "start the watch app". The JSON it
  carries is `src/features/health/providers/appleWatchWire.ts`;
  `wire.test.mjs` fails if a key is missing from the watch's `WatchWire.swift`.
- `targets/watch/` — the Apple Watch app (spec 0025 Level 2, watchOS 11,
  bundle id `com.joaquin.traininghub.watchkitapp`, HealthKit entitlement). It
  is **opt-in**: generated only with `TRAININGHUB_WATCH_APP=1` at prebuild (see
  `app.config.js`). The Live Activity's watch Smart Stack layout (Level 1) is
  part of `targets/workout-activity/` and needs no flag.

Local modules under `modules/` are autolinked. Run
`EXPO_NO_GIT_STATUS=1 npx expo prebuild -p ios --clean` after changing
`app.json`, anything under `targets/` or `modules/`, or a native dependency;
a JS-only change needs only a Metro reload. To check that the native code
compiles without a device or signing:

```bash
cd ios && xcodebuild -workspace TrainingHub.xcworkspace -scheme TrainingHub \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

To install a dev build on a connected iPhone, see the root `README.md`
("Run the mobile app on a physical iPhone").

### With the watch app (spec 0025 Level 2)

1. Install the watchOS platform once: Xcode → Settings → Components →
   watchOS 26.x. Without it every build of the scheme stops with "This scheme
   builds an embedded Apple Watch app. watchOS … must be installed".
2. `TRAININGHUB_WATCH_APP=1 EXPO_NO_GIT_STATUS=1 npx expo prebuild -p ios --clean`
3. Build and install the iPhone app as usual (`-allowProvisioningUpdates`
   creates the watch app's development profile on the free team too). The
   watch app is embedded; it installs through the iPhone's Watch app
   (My Watch → TrainingHub → Install, or automatic installs), or directly with
   `xcrun devicectl device install app --device <watch-id>
   <DerivedData>/Build/Products/Debug-watchos/TrainingHubWatch.app`. The
   watch needs Developer Mode on.

To check only that the watch app compiles (no watchOS simulator runtime needed):

```bash
cd ios && xcodebuild -project TrainingHub.xcodeproj -target TrainingHubWatch \
  -sdk watchsimulator CODE_SIGNING_ALLOWED=NO build
```

Current feature areas:

- `auth`: provider-based Apple sign-in placeholder flow
- `routines`: mock routine list, detail, and create/edit screens
- `workouts`: local workout execution draft, active workout, and summary flow
- `progress`: mock overview and exercise detail screens
- `health`: Apple Health / Health Connect abstractions and Apple extension points only

Implemented now:

- File-based routing with Expo Router
- Local mock data and local state for early flows
- Clear mobile-side extension points for auth and health integrations

Intentionally stubbed:

- Backend integration
- Real Apple sign-in
- Native Apple Health / Apple Watch behavior
- Advanced state management or reusable UI systems
