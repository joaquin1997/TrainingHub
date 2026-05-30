# 9. Production readiness

## Checklist
- [ ] Per-user data scoping + authorization (depends on auth)
- [ ] Deploy: API hosting, production DB, mobile build + TestFlight
- [ ] Error handling / loading skeletons everywhere
- [ ] Rate limiting + basic security hardening
- [ ] Crash reporting + analytics
- [ ] CI (typecheck + tests on PRs)

## Notes
- A simple CI workflow (GitHub Actions running pnpm typecheck + test) is a quick,
  high-value early win.
