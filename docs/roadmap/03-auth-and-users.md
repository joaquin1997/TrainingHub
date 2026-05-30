# 3. Auth & users

Replace the hardcoded `user-development` with real authentication and per-user
data scoping.

## Checklist
- [ ] Sign in with Apple (first provider; arch already prepared in packages/domain)
- [ ] API sessions/JWT + auth middleware
- [ ] Scope all repositories by the authenticated user (remove dev-user)
- [ ] Email/password and Google providers
- [ ] Account / profile screen

## Notes
- `packages/domain/src/auth.ts` already has provider contracts.
- This unblocks production and multi-device. Big, cross-cutting change.
