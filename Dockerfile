# Builds only the @workout/api app (and its @workout/domain dependency) from the
# pnpm monorepo. The build context must be the repository root.
# Works with both BuildKit and the classic builder (no BuildKit-only features).

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# OpenSSL + CA certs are required by Prisma at build (generate) and runtime.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
WORKDIR /app

# ---- dependencies -----------------------------------------------------------
# Install only what @workout/api needs (its workspace deps included via "...").
# All workspace manifests are copied so the frozen lockfile validates, but the
# mobile app's heavy deps are skipped by the filter.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN pnpm install --frozen-lockfile --filter @workout/api...

# ---- build ------------------------------------------------------------------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/domain packages/domain
COPY apps/api apps/api
RUN pnpm --filter @workout/domain build \
 && pnpm --filter @workout/api exec prisma generate --schema prisma/schema.prisma \
 && pnpm --filter @workout/api build

# ---- runtime ----------------------------------------------------------------
# The Prisma CLI (a dev dependency) is kept so the container can run
# `prisma migrate deploy` on startup. The compiled output, generated client and
# query engine all live under /app, so we copy the whole tree.
FROM base AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy --schema prisma/schema.prisma && node dist/apps/api/src/server.js"]
