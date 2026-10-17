#!/usr/bin/env bash
#
# Unattended run of the owner's pending server steps (docs/sdd/backlog.md,
# "Owner's server steps"): pull, redeploy the API (applies the migrations),
# run the catalog and image scripts through an SSH tunnel, and prebuild iOS.
#
#   ./scripts/deploy-pending.sh
#
# Overrides (env vars):
#   BRANCH=claude/task-l7band     branch to deploy (default)
#   DOCKER_CONTEXT=docker-ts      passed to run.sh (default there: docker-lan)
#   APPLY_IMAGES=1                also run import:images:db (default: dry run only,
#                                 so the CSV can be reviewed first)
#   IOS_DEVICE=1                  after prebuild, build onto the connected iPhone
#   WATCH_APP=1                   prebuild with TRAININGHUB_WATCH_APP=1 (0025 Level 2)
#   SKIP_BACKEND=1                skip the redeploy (it already went out)
#
# Everything is logged to tmp/deploy-pending-<timestamp>.log.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${BRANCH:-claude/task-l7band}"
SSH_TARGET="${SSH_TARGET:-joaquin@joaquinserver.tail644a1a.ts.net}"
LOG_DIR="$ROOT/tmp"
LOG="$LOG_DIR/deploy-pending-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG") 2>&1

# Keep the Mac awake while this runs.
if command -v caffeinate >/dev/null 2>&1; then
  caffeinate -dims -w $$ &
fi

step() { echo; echo "==> [$(date +%H:%M:%S)] $*"; }

TUNNEL_PID=""
cleanup() {
  if [ -n "$TUNNEL_PID" ]; then
    kill "$TUNNEL_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
trap 'echo; echo "!! failed at line $LINENO — see $LOG" >&2' ERR

cd "$ROOT"

step "git: checkout and pull $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
echo "    last migration: $(ls apps/api/prisma/migrations | grep -v migration_lock | tail -1)"

step "pnpm install"
pnpm install

# The local scripts compile against the generated client; a stale one lacks
# the new columns and `tsc` fails.
step "Prisma: regenerate the client"
pnpm --filter @workout/api prisma:generate

if [ "${SKIP_BACKEND:-0}" = "1" ]; then
  step "API: redeploy skipped (SKIP_BACKEND=1)"
else
  step "API: rebuild and redeploy (the container applies the migrations on start)"
  HEALTH_TRIES=120 "$ROOT/scripts/run.sh" backend
fi

step "SSH tunnel to the database (127.0.0.1:5434)"
if nc -z 127.0.0.1 5434 >/dev/null 2>&1; then
  echo "    port 5434 already open, reusing it"
else
  ssh -N -o ExitOnForwardFailure=yes -L 5434:127.0.0.1:5434 "$SSH_TARGET" &
  TUNNEL_PID=$!
  for _ in $(seq 1 30); do
    nc -z 127.0.0.1 5434 >/dev/null 2>&1 && break
    sleep 1
  done
  nc -z 127.0.0.1 5434 >/dev/null 2>&1 || { echo "!! tunnel did not open" >&2; exit 1; }
  echo "    tunnel up (pid $TUNNEL_PID)"
fi

cd "$ROOT/apps/api"

step "0021: catalog tracking types"
pnpm run catalog:tracking-types

step "0026: match exercise images (dry run → tmp/free-exercise-db-matches.csv)"
pnpm run import:images

if [ "${APPLY_IMAGES:-0}" = "1" ]; then
  step "0026: write matched images to the database"
  pnpm run import:images:db
else
  echo "    skipped import:images:db — review the CSV, then: cd apps/api && pnpm run import:images:db"
fi

cleanup
TUNNEL_PID=""

cd "$ROOT/apps/mobile"

step "iOS: expo prebuild"
if [ "${WATCH_APP:-0}" = "1" ]; then
  TRAININGHUB_WATCH_APP=1 npx expo prebuild --platform ios
else
  npx expo prebuild --platform ios
fi

if [ "${IOS_DEVICE:-0}" = "1" ]; then
  step "iOS: build onto the connected iPhone (stays running with Metro)"
  DEVICE=1 "$ROOT/scripts/run.sh" frontend
fi

step "done — log: $LOG"
echo "    next: device checks in each spec's tasks.md (see docs/sdd/backlog.md)"
