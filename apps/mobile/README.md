# Mobile App

Expo + React Native mobile shell for the workout tracker.

- `src/app/` contains Expo Router route files
- `src/features/` contains feature-local placeholder screens

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
