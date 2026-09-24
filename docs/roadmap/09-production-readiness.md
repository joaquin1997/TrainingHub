# 9. Production readiness

## Checklist
- [~] Per-user data scoping + authorization — scoping built (area 3); not enforced
  until spec 0001 closes the anonymous fallback
- [~] Deploy: API hosting, production DB, mobile build + TestFlight
  - [x] API containerized (`Dockerfile` + `docker-compose.yml`) and deployed to the
    home server over Tailscale (`https://joaquinserver.tail644a1a.ts.net:8443`); see root README.
  - [x] iOS dev build installable on a physical device (free Apple ID signing:
    the profile expires after 7 days). Renewing it needs
    `xcodebuild -allowProvisioningUpdates`; `expo run:ios --device` cannot
    generate a new profile.
  - [ ] Hosted/production DB, public API hosting, TestFlight / release builds.
- [ ] Automated Postgres backups + a tested restore (today there is only the
  manual dump taken on 2026-09-23)
- [ ] Alert when `/health` reports the database down (the 2026-09-23 outage went
  unnoticed for a week)
- [ ] Error handling / loading skeletons everywhere
- [ ] Rate limiting + basic security hardening
- [ ] Crash reporting + analytics
- [x] CI (GitHub Actions: install → prisma generate → typecheck → tests on PRs)
- [x] Server-side guard: reject workouts with no completed set

## Notes
- A simple CI workflow (GitHub Actions running pnpm typecheck + test) is a quick,
  high-value early win.
- Current deployment is a homelab setup on `joaquinserver`: the dockerized API
  and Postgres run on the same host, Postgres published on loopback only
  (`127.0.0.1:5434`). The API is served over HTTPS by Tailscale Serve
  (`:8443`), so only devices on the tailnet reach it. A public release would
  need public TLS and enforced auth first.
- Distributing beyond this iPhone (TestFlight) needs the paid Apple Developer
  Program; the free team only produces 7-day development profiles.

## Progress log
- (2026-09-23) Database outage: Postgres sat behind its own Tailscale sidecar
  node, whose node key expired; the sidecar crash-looped and the API answered
  `{"db":"down"}` for about a week. Removed the sidecar: Postgres now runs on the
  API's host on loopback, so key expiry can no longer take it offline. Data
  intact; pre-change dump in `~/backups/traininghub/` on the server. The API was
  redeployed with current `master` in the same pass.
- (2026-09-24) Device build renewed: installed the iOS 26.5 platform in Xcode and
  re-signed with `xcodebuild -allowProvisioningUpdates` (the old profile had
  expired on 2026-06-06).
