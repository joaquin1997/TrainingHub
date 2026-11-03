# Development and verification

TrainingHub's working environment uses the existing API and PostgreSQL
installation on a private server. The mobile app connects to that API;
implementation, server rollout and device acceptance are tracked separately.

## Repository requirements

- Node 22.13+ within Node 22; `nvm use` reads `.nvmrc`.
- pnpm 9.10.0, selected by the root `packageManager` field.
- For native iOS: macOS, Xcode and the required platform SDKs/runtimes.
- Access to the configured environment for database operations and actual
  end-to-end checks. Source review and unit/route tests do not require it.

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Environment configuration

Keep the existing env files. `apps/api/.env.example` documents the API's
configuration shape; it is not a replacement for a configured env file.

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Configured PostgreSQL connection; the server uses its private database connection and development may use an SSH tunnel |
| `JWT_SECRET` | Signing secret; preserve the deployed value across restarts and rollouts |
| `NODE_ENV` | Explicit execution environment; deployment uses `production` |
| `GOOGLE_CLIENT_IDS` | Optional server allowlist of Google OAuth client IDs |
| `EXPO_PUBLIC_API_URL` | Mobile app's reachable API endpoint, configured when serving/bundling JS |

Operational addresses, tunnel details and signing material belong in private
configuration or ignored `docs/local/` notes. Env files are ignored. Do not
paste their contents into a review or assistant session. Expo public variables
are public configuration and must never contain secrets.

## Mobile development

A development build uses Metro for its JS:

```bash
pnpm mobile
```

Use the existing environment's API URL when serving the bundle. Restart Metro
after changing public build configuration. Release builds bundle JS and use
the endpoint supplied during their build.

See the [mobile guide](../apps/mobile/README.md) for native builds, platform
limits and optional Watch/widget flags. Expo Go does not contain the local
native modules required by the full app.

## Database and catalog operations

Prisma migrations are the schema authority. These commands use the configured
database, so run them with the intended connection and access:

```bash
pnpm --filter @workout/api db:migrate   # create/apply a development migration
pnpm --filter @workout/api db:deploy    # apply committed migrations
pnpm --filter @workout/api db:studio
```

The current exercise catalog is bundled in the repository. `catalog:curate`
reports proposed changes; `catalog:curate:apply` writes them. Curation can
retire/merge existing exercises and carry their references over, so it is an
explicit reviewed data operation with a backup, not a prerequisite for reading
the project or a command to repeat during ordinary development. Run reports
remain under ignored `tmp/` directories.

Older wger imports and tracking sweeps are historical/maintenance tooling.
See [data sources](data-sources.md) for the catalog and image origins and
[deployment](deployment.md) for migration, data-operation and rollout ordering.

## Reviewing the project

The [architecture guide](codex-project-context.md) describes package and domain
boundaries. The [spec backlog](sdd/backlog.md) links each feature's requirements,
plan, implementation tasks and pending deployment/device checks.

Use synthetic names and training examples when sharing captures or technical
walkthroughs. Actual profile photos, health measurements, database dumps and
other people's account data do not belong in shared review material.

## Checks

```bash
pnpm --filter @workout/api prisma:generate
pnpm -r typecheck
pnpm -r test
pnpm --filter @workout/api build
```

Tests use fixtures and controlled persistence boundaries. They do not require
a new database, a running API or native signing. Migration/curation rehearsals,
signed native builds and actual device behaviour remain separate checks.
CI uses Node 22 and the same typecheck/test commands.
