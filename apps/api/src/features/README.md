# API feature modules

Implemented modules are `auth`, `exercises`, `routines`, `workouts`, `progress`,
`profile`, `measurements` and `settings`. They are registered from
`src/routes/index.ts`; the liveness route lives under `src/routes/health.ts`.

- `routes.ts` handles HTTP input, status codes and response wiring.
- `repository.ts` and focused persistence modules use Prisma and enforce user
  ownership on reads, writes and referenced records.
- Validation and business rules that do not need HTTP or a database stay in
  pure modules, with focused tests.
- Route tests use signed requests and mock the persistence boundary; they
  must not bypass authentication by mocking the acting user.
- Historical `mock-*.ts` files are not the running API's persistence layer.

`app.ts` protects routes globally, so adding a feature does not make it public.
Shared entities and DTOs belong in `packages/domain`, not a second local copy.
Keep each feature explicit and small; add a service layer only when an actual
behaviour needs it. See the [architecture guide](../../../../docs/codex-project-context.md).
