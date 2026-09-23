# 9. Production readiness

## Checklist
- [ ] Per-user data scoping + authorization (depends on auth)
- [~] Deploy: API hosting, production DB, mobile build + TestFlight
  - [x] API containerized (`Dockerfile` + `docker-compose.yml`) and deployed to the
    home server over Tailscale (`https://joaquinserver.tail644a1a.ts.net:8443`); see root README.
  - [x] iOS dev build installable on a physical device via `expo run:ios --device`
    (free Apple ID signing; expires after 7 days).
  - [ ] Hosted/production DB, public API hosting, TestFlight / release builds.
- [ ] Error handling / loading skeletons everywhere
- [ ] Rate limiting + basic security hardening
- [ ] Crash reporting + analytics
- [x] CI (GitHub Actions: install → prisma generate → typecheck → tests on PRs)
- [x] Server-side guard: reject workouts with no completed set

## Notes
- A simple CI workflow (GitHub Actions running pnpm typecheck + test) is a quick,
  high-value early win.
- Current deployment is a homelab setup: the dockerized API and Postgres live on
  the tailnet, so the app is only reachable by devices on Tailscale. The API is
  plain `http://` (Tailscale provides the transport encryption); a public release
  would need TLS and real auth/data scoping first.
