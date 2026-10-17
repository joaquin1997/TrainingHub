#!/usr/bin/env bash
#
# Unattended run of the owner's pending server steps (docs/sdd/backlog.md,
# "Owner's server steps").
#
#   ./scripts/deploy-pending.sh
#
# Order matters because the server's connection is slow: everything that can
# fail is checked first, and the slow image rebuild goes last.
#   1. preflight  — pull, install, Prisma client, typecheck + build the API
#                   locally (what the image build does), .env, ssh, docker
#   2. migrate    — `prisma migrate deploy` through an SSH tunnel. The new
#                   columns are additive, so the running API keeps working.
#   3. scripts    — tracking type sweep report (0030; apply with APPLY_SWEEP=1),
#                   image matching (0026, only with IMAGES=1: already run)
#   4. ios        — expo prebuild
#   5. backend    — rebuild the image on the server and replace the container
#
# Steps that finished are recorded in tmp/deploy-pending.done (per commit), so a
# re-run after a failure skips them. FORCE=1 runs everything again.
#
# Overrides (env vars):
#   BRANCH=claude/task-l7band     branch to deploy (default)
#   DOCKER_CONTEXT=docker-ts      passed to run.sh (default there: docker-lan)
#   APPLY_SWEEP=1                 apply the tracking type sweep after its report
#                                 (default: report only, so the CSV can be reviewed;
#                                 corrections go in src/scripts/data/tracking-type-corrections.json)
#   IMAGES=1                      run the image matching dry run again (0026)
#   APPLY_IMAGES=1                with IMAGES=1, also write the matched images
#   IOS_DEVICE=1                  at the end, build onto the connected iPhone
#   WATCH_APP=1                   prebuild with TRAININGHUB_WATCH_APP=1 (0025 Level 2)
#   SKIP_BACKEND=1                skip the image rebuild
#
# Everything is logged to tmp/deploy-pending-<timestamp>.log.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${BRANCH:-claude/task-l7band}"
SSH_TARGET="${SSH_TARGET:-joaquin@joaquinserver.tail644a1a.ts.net}"
DOCKER_CONTEXT="${DOCKER_CONTEXT:-docker-lan}"
export DOCKER_CONTEXT
LOG_DIR="$ROOT/tmp"
LOG="$LOG_DIR/deploy-pending-$(date +%Y%m%d-%H%M%S).log"
DONE_FILE="$LOG_DIR/deploy-pending.done"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG") 2>&1

# Keep the Mac awake while this runs.
if command -v caffeinate >/dev/null 2>&1; then
  caffeinate -dims -w $$ &
fi

step() { echo; echo "==> [$(date +%H:%M:%S)] $*"; }
fail() { echo "!! $*" >&2; exit 1; }

TUNNEL_PID=""
close_tunnel() {
  if [ -n "$TUNNEL_PID" ]; then
    kill "$TUNNEL_PID" >/dev/null 2>&1 || true
    TUNNEL_PID=""
  fi
}
trap close_tunnel EXIT
trap 'echo; echo "!! failed at line $LINENO — see $LOG. Re-run to continue from the failed step." >&2' ERR

# --- resume bookkeeping ------------------------------------------------------
COMMIT=""
is_done() { [ "${FORCE:-0}" != "1" ] && grep -qx "$COMMIT $1" "$DONE_FILE" 2>/dev/null; }
mark_done() { echo "$COMMIT $1" >> "$DONE_FILE"; }

open_tunnel() {
  if nc -z 127.0.0.1 5434 >/dev/null 2>&1; then
    echo "    port 5434 already open, reusing it"
    return
  fi
  ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
    -L 5434:127.0.0.1:5434 "$SSH_TARGET" &
  TUNNEL_PID=$!
  for _ in $(seq 1 30); do
    nc -z 127.0.0.1 5434 >/dev/null 2>&1 && break
    sleep 1
  done
  nc -z 127.0.0.1 5434 >/dev/null 2>&1 || fail "SSH tunnel to the database did not open"
  echo "    tunnel up (pid $TUNNEL_PID)"
}

cd "$ROOT"

# --- 1. preflight ------------------------------------------------------------
step "preflight: checkout and pull $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
COMMIT="$(git rev-parse --short HEAD)"
echo "    commit $COMMIT, last migration: $(ls apps/api/prisma/migrations | grep -v migration_lock | tail -1)"

step "preflight: apps/api/.env"
[ -f apps/api/.env ] || fail "missing apps/api/.env (copy apps/api/.env.example)"
grep -q '^DATABASE_URL=' apps/api/.env || fail "DATABASE_URL not set in apps/api/.env"
grep -Eq '^JWT_SECRET=["'"'"']?[^"'"'"' ]' apps/api/.env || fail "JWT_SECRET not set in apps/api/.env (the redeploy needs it)"

step "preflight: pnpm install + Prisma client"
pnpm install
# The local scripts compile against the generated client; a stale one lacks the
# new columns and `tsc` fails.
pnpm --filter @workout/api prisma:generate

step "preflight: build the API locally (same as the image build)"
pnpm --filter @workout/domain build
pnpm --filter @workout/api typecheck
pnpm --filter @workout/api build

step "preflight: ssh and docker context '$DOCKER_CONTEXT'"
ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_TARGET" true \
  || fail "cannot ssh to $SSH_TARGET without a password prompt"
if [ "${SKIP_BACKEND:-0}" != "1" ]; then
  docker -c "$DOCKER_CONTEXT" info >/dev/null \
    || fail "docker context '$DOCKER_CONTEXT' is not reachable"
fi

# --- 2. migrate --------------------------------------------------------------
step "SSH tunnel to the database (127.0.0.1:5434)"
open_tunnel

if is_done migrate; then
  step "migrate: already done for $COMMIT"
else
  step "migrate: prisma migrate deploy"
  (cd apps/api && pnpm run db:deploy)
  mark_done migrate
fi

# --- 3. scripts --------------------------------------------------------------
cd "$ROOT/apps/api"

if is_done sweep-report; then
  step "0030: tracking type sweep report already done for $COMMIT"
else
  step "0030: tracking type sweep report (no write → tmp/tracking-type-sweep.csv)"
  pnpm run catalog:tracking-sweep
  mark_done sweep-report
fi

if [ "${APPLY_SWEEP:-0}" = "1" ]; then
  if is_done sweep-apply; then
    step "0030: tracking type sweep already applied for $COMMIT"
  else
    step "0030: apply the tracking type sweep"
    pnpm run catalog:tracking-sweep:apply
    # A second run must change nothing (idempotent, spec 0030).
    step "0030: apply again — must report 0 changed"
    pnpm run catalog:tracking-sweep:apply | tee "$LOG_DIR/sweep-second-run.txt"
    grep -Eq "(^|[^0-9])0 changed" "$LOG_DIR/sweep-second-run.txt" \
      || fail "second sweep run changed exercises; check $LOG_DIR/sweep-second-run.txt"
    mark_done sweep-apply
  fi
else
  echo "    sweep not applied — review tmp/tracking-type-sweep.csv, then re-run with APPLY_SWEEP=1"
fi

if [ "${IMAGES:-0}" = "1" ]; then
  if is_done images-dry; then
    step "0026: image matching dry run already done for $COMMIT"
  else
    step "0026: match exercise images (dry run → tmp/free-exercise-db-matches.csv)"
    pnpm run import:images
    mark_done images-dry
  fi

  if [ "${APPLY_IMAGES:-0}" = "1" ]; then
    if is_done images-db; then
      step "0026: images already written for $COMMIT"
    else
      step "0026: write matched images to the database"
      pnpm run import:images:db
      mark_done images-db
    fi
  fi
fi

close_tunnel

# --- 4. ios ------------------------------------------------------------------
cd "$ROOT/apps/mobile"

PREBUILD_STEP=prebuild
[ "${WATCH_APP:-0}" = "1" ] && PREBUILD_STEP=prebuild-watch

if is_done "$PREBUILD_STEP"; then
  step "iOS: prebuild already done for $COMMIT"
else
  # --clean: @bacons/apple-targets 5.0.0 crashes updating an existing target.
  step "iOS: expo prebuild --clean"
  if [ "${WATCH_APP:-0}" = "1" ]; then
    TRAININGHUB_WATCH_APP=1 npx expo prebuild --platform ios --clean
  else
    npx expo prebuild --platform ios --clean
  fi
  mark_done "$PREBUILD_STEP"
fi

# --- 5. backend (slow) -------------------------------------------------------
cd "$ROOT"

if [ "${SKIP_BACKEND:-0}" = "1" ]; then
  step "API: redeploy skipped (SKIP_BACKEND=1)"
elif is_done backend; then
  step "API: already redeployed for $COMMIT"
else
  step "API: rebuild the image on the server and replace the container (slow)"
  HEALTH_TRIES=120 "$ROOT/scripts/run.sh" backend
  mark_done backend
fi

if [ "${IOS_DEVICE:-0}" = "1" ]; then
  step "iOS: build onto the connected iPhone (stays running with Metro)"
  DEVICE=1 "$ROOT/scripts/run.sh" frontend
fi

step "done — log: $LOG"
echo "    next: device checks in each spec's tasks.md (see docs/sdd/backlog.md)"
