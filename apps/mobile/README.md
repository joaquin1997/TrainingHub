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
