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
