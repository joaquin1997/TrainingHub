# Future Features

Add feature modules here incrementally, for example `auth`, `routines`, or `workouts`.

Each feature should keep its HTTP routes and any future application/domain code local to the feature, then register its routes from `src/routes/index.ts`.

Current pattern:

- `routes.ts` exposes Fastify route registration for the feature
- `mock-*.ts` or provider files hold placeholder behavior only
- TODOs mark where Prisma-backed persistence, validation, or provider logic will replace stubs

Keep this layer thin. Avoid adding service hierarchies unless a real problem appears.
