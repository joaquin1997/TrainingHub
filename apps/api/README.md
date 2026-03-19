# API

Thin Fastify API shell for the workout tracker.

- `src/server.ts` starts the HTTP server
- `src/app.ts` creates the Fastify instance
- `src/routes/` holds shared route registration and non-feature routes
- `src/features/` contains feature-local modules registered from the main route index

Current feature modules:

- `auth`: Apple login stub only, with provider-based auth boundaries
- `exercises`: mock list/detail endpoints
- `routines`: mock CRUD for routine templates
- `workouts`: mock workout session start/log/finish flow
- `progress`: mock per-exercise progress endpoint
- `health`: provider sync service stubs only

Implemented now:

- Thin Fastify route registration
- Mock responses shaped to match the shared domain model
- Clear TODOs where Prisma persistence and real auth/session handling will go

Intentionally stubbed:

- Real database persistence
- Production token validation and session management
- Deep business rules and analytics
- Real health provider sync behavior
