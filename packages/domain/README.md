# Domain package

Framework-independent source of shared TrainingHub entities, contracts and
record rules, consumed by both mobile and API.

| File | Responsibility |
|---|---|
| `src/entities.ts` | Exercises, routine templates, performed workouts, progress and shared DTOs |
| `src/auth.ts` | Provider boundaries, credential requests and token/identity responses |
| `src/health.ts` | Health, live-workout and Watch integration contracts |
| `src/profile.ts` | Profile and body-measurement contracts |
| `src/records.ts` | Pure record comparison rules shared by API and mobile |

Routine targets and performed workout values remain separate. Persisted weights
are kg; display conversion belongs at the app boundary. Native payloads,
React components, Prisma records and Fastify requests are not domain types.

From the repository root:

```bash
pnpm --filter @workout/domain typecheck
pnpm --filter @workout/domain build
```

The API build compiles shared types. Metro uses supported source entry points
for runtime rules; do not import arbitrary built package internals into the
mobile bundle. See the [architecture guide](../../docs/codex-project-context.md).
