# TrainingHub

A workout tracking app (Hevy-style): manage exercises, build routines, log
workouts and track progress. iOS-first, Android considered at the architecture
level.

## Stack

- **Mobile** (`apps/mobile`): React Native + Expo + TypeScript, Expo Router
- **API** (`apps/api`): Fastify + TypeScript, Prisma, PostgreSQL
- **Domain** (`packages/domain`): shared types and DTO contracts (source of truth)
- Monorepo managed with **pnpm** workspaces

Architecture rules live in [docs/codex-project-context.md](docs/codex-project-context.md).

## Prerequisites

- Node 20.19+ and pnpm 9
- Access to the dev PostgreSQL database (see below)

## Setup

```bash
pnpm install

# API env: copy the example and fill in DATABASE_URL
cp apps/api/.env.example apps/api/.env
```

The dev database runs in Docker on the home server and is reached over Tailscale
(`100.109.119.75:5432`, db `app_db`). `apps/api/.env` is gitignored. Off the
tailnet, use an SSH tunnel (see `.env.example`).

## Database

Prisma migrations are the single source of truth.

```bash
cd apps/api
pnpm db:migrate      # create + apply a migration in dev
pnpm db:deploy       # apply existing migrations
pnpm db:studio       # browse data

# seed the exercise catalog from wger (writes to the DB)
pnpm import:wger:db
```

## Run

```bash
pnpm api             # start the API (http://localhost:3000)
pnpm mobile          # start Expo for the mobile app
```

## Checks

```bash
pnpm typecheck       # type-check every package
pnpm test            # run unit/route tests (api + mobile)
```

## Layout

```txt
apps/
  mobile/   # Expo app (features/, app/ routes, lib/)
  api/      # Fastify API (features/, routes/, infrastructure/, prisma/)
packages/
  domain/   # shared entities + DTO contracts
```
