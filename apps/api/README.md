# TrainingHub API

Fastify + TypeScript API backed by Prisma and PostgreSQL. It persists training
data and derives progress from saved, performed work.

## Feature areas

| Area | Implemented behaviour |
|---|---|
| Auth | Email/password register/login, 90-day app credentials, identity validation; Google token verification when configured |
| Exercises | Reviewed catalog, ES/EN search, filters, favorites, private custom exercises, photos, tracking type and unilateral settings |
| Routines | User-scoped templates, exercise targets, warm-ups, supersets and folders |
| Workouts | Ownership-checked saves, performed sets, history, details, previous-session values and repeat-save protection |
| Progress | Exercise/session aggregation, records by type, starting records, weekly volume and category distribution |
| Profile and measurements | User profile, photo and body-measurement history |
| Settings | Unit, rest, language and appearance preferences |

Apple sign-in remains an unfinished provider. Server-side session revocation,
password recovery and full offline synchronization are not implemented.

## Structure

- `src/server.ts` starts the HTTP listener.
- `src/app.ts` installs authentication and request-language handling.
- `src/routes/index.ts` registers the features and health check.
- `src/features/` keeps routes, validation, repositories and pure rules by area.
- `src/infrastructure/` holds Prisma and request identity/language boundaries.
- `src/scripts/` contains explicit data import, catalog and maintenance commands.
- `prisma/schema.prisma` and `prisma/migrations/` are the schema authority.

See the [feature guide](src/features/README.md) for the module pattern.

## Authentication boundary

The current checkout protects routes globally. Public operations are exactly
`GET /health`, `POST /auth/register`, `POST /auth/login` and `POST /auth/google`.
The Google operation answers unavailable until its accepted client IDs are
configured. The unfinished Apple demo is not an anonymous entry point.

Protected operations verify signature/expiry and an existing account subject.
`GET /auth/me` returns the validated identity. Unknown, malformed, expired and
non-expiring legacy credentials receive the same 401 response. Credentials
issued by all implemented sign-in methods expire after 90 days; there is no
refresh or revocation mechanism yet.

`JWT_SECRET` must be nonblank outside explicit development/test. Set a random
one even locally. Public client IDs are configuration, not signing secrets.

**Existing deployments:** the local strict-auth changes still need the ordered
[0001 rollout](../../docs/sdd/specs/0001-auth-session-hardening/tasks.md).
The one-off legacy-user reassignment must be reviewed and applied before the
strict boundary reaches a database with legacy training data. Fresh databases
do not need that reassignment.

## Run and verify

Use the existing database connection described in
[development](../../docs/development.md). From the repository root:

```bash
pnpm --filter @workout/api db:deploy
pnpm api
```

```bash
pnpm --filter @workout/api prisma:generate
pnpm --filter @workout/api typecheck
pnpm --filter @workout/api test
pnpm --filter @workout/api build
```

Route tests sign real app credentials and exercise the real request identity
resolver; persistence is mocked or replaced by controlled fixtures. Aggregation,
records, ownership predicates and data-maintenance rules have separate tests.
These checks need no live server or database; migration/rollout acceptance does.

## Data tools

The bundled reviewed catalog is the current catalog source. `catalog:curate`
reports; `catalog:curate:apply` writes; run reports are kept for explicit undo.
See the [catalog workflow](../../docs/development.md#exercise-catalog) before
running it against an existing database.

`auth:reassign-dev-user --to <public-id>` is dry-run by default. `--apply`
changes ownership transactionally; it is an ordered deployment operation,
not a fresh-install seed. Keep a backup and its report.

Older wger imports, image matching and tracking sweeps remain for provenance
and maintenance. They are not automatic startup operations.
