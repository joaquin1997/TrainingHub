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
#   2. migrate    — pg_dump of the database on the server, then
#                   `prisma migrate deploy` through an SSH tunnel. The new
#                   columns are additive, so the running API keeps working.
#   3. scripts    — reviewed catalog report (0044); asks before applying it
#                   (or APPLY_CATALOG=1), image matching (0026, only with IMAGES=1)
#   4. ios        — expo prebuild
#   5. backend    — rebuild the image on the server and replace the container
#   6. iphone     — build, sign and install on every iPhone (and watch) within
#                   reach (after the API: the new app needs its endpoints), then
#                   Metro + launch
#
# Steps that finished are recorded in tmp/deploy-pending.done (per commit), so a
# re-run after a failure skips them. FORCE=1 runs everything again.
#
# Overrides (env vars):
#   BRANCH=<name>                 branch to deploy (default: the current one)
#   DOCKER_CONTEXT=docker-ts      passed to run.sh (default there: docker-lan)
#   APPLY_CATALOG=1|0             apply the reviewed catalog (0044) after its report, or
#                                 not (default: ask on a terminal, report only otherwise)
#   IMAGES=1                      run the image matching dry run again (0026)
#   APPLY_IMAGES=1                with IMAGES=1, also write the matched images
#   IOS_DEVICE=0                  skip the iPhone build, install and Metro
#   RELEASE=1                     Release build: the JS bundle goes inside the app, so it
#                                 runs without the Mac (no Metro); the free team's profile
#                                 still expires after 7 days
#   FORCE_IPHONE=1                build and install on the devices again (same commit),
#                                 e.g. to renew the 7-day profile
#   IOS_DEVICE_ID="<udid> …"      iPhones to install on (default: every paired iPhone
#                                 within reach)
#   WATCH_DEVICE_ID="<udid> …"    with WATCH_APP=1, watches to install on (default:
#                                 every paired watch within reach)
#   WATCH_APP=1                   prebuild with TRAININGHUB_WATCH_APP=1 (0025 Level 2)
#   HOME_WIDGET=0                 prebuild without the widget's App Group (0036; on by
#                                 default since the free team signs it)
#   SKIP_BACKEND=1                skip the image rebuild
#
# Everything is logged to tmp/deploy-pending-<timestamp>.log.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${BRANCH:-$(git -C "$ROOT" branch --show-current)}"
SSH_TARGET="${SSH_TARGET:-joaquin@joaquinserver.tail644a1a.ts.net}"
API_URL="${EXPO_PUBLIC_API_URL:-https://joaquinserver.tail644a1a.ts.net:8443}"
BUNDLE_ID="com.joaquin.traininghub"
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
# One run at a time: two runs share the database tunnel (one closes it under
# the other) and step on each other's ios/ and image builds.
LOCK_DIR="$LOG_DIR/deploy-pending.lock"
release_lock() { rm -rf "$LOCK_DIR"; }
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  other="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
  if [ -n "$other" ] && kill -0 "$other" 2>/dev/null; then
    fail "another run is in progress (pid $other); wait for it or stop it"
  fi
  # Left behind by a run that was killed.
  release_lock
  mkdir "$LOCK_DIR"
fi
echo $$ > "$LOCK_DIR/pid"

trap 'close_tunnel; release_lock' EXIT
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
git checkout "$BRANCH"
# A local-only branch (not pushed yet) has nothing to pull.
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git pull --ff-only origin "$BRANCH"
fi
COMMIT="$(git rev-parse --short HEAD)"
echo "    commit $COMMIT, last migration: $(ls apps/api/prisma/migrations | grep -v migration_lock | tail -1)"

step "preflight: Node $(node -v)"
# Expo SDK 58 (React Native 0.88) needs Node 22.13+.
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)' \
  || fail "Node $(node -v) is too old for Expo SDK 58: use Node 22.13+ (e.g. PATH=/opt/homebrew/bin:\$PATH)"

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

if is_done backup; then
  step "backup: already done for $COMMIT"
else
  step "backup: pg_dump on the server → ~/backups/traininghub/"
  ssh "$SSH_TARGET" bash -s -- "$COMMIT" <<'EOF'
set -euo pipefail
dir="$HOME/backups/traininghub"
mkdir -p "$dir"
file="$dir/pre-deploy-$1-$(date +%Y%m%d-%H%M%S).sql.gz"
docker exec postgresql-postgres-1 sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$file"
# pg_dump ends a full dump with this line; without it the dump was cut short.
gzip -dc "$file" | tail -5 | grep -q 'PostgreSQL database dump complete' \
  || { echo "!! incomplete dump: $file" >&2; exit 1; }
ls -lh "$file"
EOF
  mark_done backup
fi

if is_done migrate; then
  step "migrate: already done for $COMMIT"
else
  step "migrate: prisma migrate deploy"
  (cd apps/api && pnpm run db:deploy)
  mark_done migrate
fi

# --- 3. scripts --------------------------------------------------------------
cd "$ROOT/apps/api"

# Reviewed exercise catalog (spec 0044; replaces 0030's sweep, whose wger
# exercises are all retired). The report never writes; the apply is
# repeatable — a second run changes nothing — and keeps a run file for undo.
# Not recorded as done: a re-run after editing the catalog must report again.
step "0044: reviewed catalog report (no write)"
pnpm run catalog:curate | tee "$LOG_DIR/catalog-report.txt"

if grep -q "0 to create, 0 to update, 0 to bring back" "$LOG_DIR/catalog-report.txt" \
  && grep -q "To retire: 0 old catalog exercises, 0 merged custom ones; 0 reviewed" "$LOG_DIR/catalog-report.txt" \
  && ! grep -q "Carry over" "$LOG_DIR/catalog-report.txt"; then
  echo "    catalog already up to date"
else
  if [ -z "${APPLY_CATALOG:-}" ]; then
    APPLY_CATALOG=0
    if [ -t 0 ]; then
      echo
      echo "    Read the report above. The apply keeps a run file in apps/api/tmp/catalog-curate-runs"
      echo "    (undo: CURATE_UNDO=<file> pnpm run catalog:curate:undo)."
      read -r -p "    Apply the reviewed catalog now? [y/N] " answer || answer=""
      case "$answer" in [yYsS]*) APPLY_CATALOG=1 ;; esac
    fi
  fi

  if [ "$APPLY_CATALOG" = "1" ]; then
    step "0044: apply the reviewed catalog"
    pnpm run catalog:curate:apply
  else
    echo "    catalog not applied — re-run with APPLY_CATALOG=1 after reading the report"
  fi
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
  export TRAININGHUB_HOME_WIDGET="${HOME_WIDGET:-1}"
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

# --- 6. iphone ---------------------------------------------------------------
if [ "${IOS_DEVICE:-1}" = "0" ]; then
  step "done — log: $LOG"
  exit 0
fi

cd "$ROOT/apps/mobile"

# shellcheck source=lib/devices.sh
. "$ROOT/scripts/lib/devices.sh"
# One "udid<TAB>name" line per device: every reachable iPhone (and watch), so the
# app lands on each person's phone that is around.
IPHONES="$(target_devices iPhone "${IOS_DEVICE_ID:-}")"
[ -n "$IPHONES" ] || fail "no paired iPhone within reach (connect it, or set IOS_DEVICE_ID)"

CONFIGURATION=Debug
[ "${RELEASE:-0}" = "1" ] && CONFIGURATION=Release
PRODUCTS="ios/DerivedData/Build/Products"
APP_PATH="$PRODUCTS/$CONFIGURATION-iphoneos/TrainingHub.app"
IPHONE_STEP="iphone-$PREBUILD_STEP"
[ "$CONFIGURATION" = "Release" ] && IPHONE_STEP="iphone-release-$PREBUILD_STEP"
# A Release build bakes the API URL into its JS bundle.
export EXPO_PUBLIC_API_URL="$API_URL"

WATCHES=""
[ "${WATCH_APP:-0}" = "1" ] && WATCHES="$(target_devices appleWatch "${WATCH_DEVICE_ID:-}")"

# Runs the app on every iPhone.
launch_on_iphones() {
  local udid name
  while IFS=$'\t' read -r udid name <&3; do
    xcrun devicectl device process launch --device "$udid" --terminate-existing "$BUNDLE_ID" >/dev/null \
      && echo "    [$name] app launched" \
      || echo "    [$name] could not launch the app; open it by hand"
  done 3<<< "$IPHONES"
}

if [ "${FORCE_IPHONE:-0}" != "1" ] && is_done "$IPHONE_STEP"; then
  step "iPhone: $CONFIGURATION already built and installed for $COMMIT"
else
  # Building the watch scheme for a watch first registers it on the team, so
  # the watch app's profile includes it (built only for the iPhone, the watch
  # refuses it: "This provisioning profile cannot be installed").
  while IFS=$'\t' read -r udid name <&3; do
    [ -n "$udid" ] || continue
    step "Apple Watch: xcodebuild for $name ($udid)"
    xcodebuild -quiet -workspace ios/TrainingHub.xcworkspace -scheme TrainingHubWatch \
      -configuration "$CONFIGURATION" -destination "id=$udid" -derivedDataPath ios/DerivedData \
      -allowProvisioningUpdates build
  done 3<<< "$WATCHES"

  # One build per iPhone, so each one is registered on the team; the later
  # builds are incremental and the last one's profile includes them all.
  # Not `expo run:ios --device`: it does not pass -allowProvisioningUpdates, so
  # it fails once the free team's 7-day profile has expired.
  while IFS=$'\t' read -r udid name <&3; do
    step "iPhone: xcodebuild $CONFIGURATION for $name ($udid) (slow)"
    xcodebuild -quiet -workspace ios/TrainingHub.xcworkspace -scheme TrainingHub \
      -configuration "$CONFIGURATION" -destination "id=$udid" -derivedDataPath ios/DerivedData \
      -allowProvisioningUpdates build
  done 3<<< "$IPHONES"

  while IFS=$'\t' read -r udid name <&3; do
    step "iPhone: install on $name"
    xcrun devicectl device install app --device "$udid" "$APP_PATH"
  done 3<<< "$IPHONES"

  # The watch app is embedded in the iPhone app; installing it straight onto a
  # connected watch saves going through the iPhone's Watch app.
  if [ -n "$WATCHES" ]; then
    while IFS=$'\t' read -r udid name <&3; do
      step "Apple Watch: install on $name"
      xcrun devicectl device install app --device "$udid" \
        "$PRODUCTS/$CONFIGURATION-watchos/TrainingHubWatch.app" \
        || echo "    could not install on $name; use the iPhone's Watch app (My Watch → TrainingHub → Install)"
    done 3<<< "$WATCHES"
  elif [ "${WATCH_APP:-0}" = "1" ]; then
    echo "    no watch connected to the Mac; install it from the iPhone's Watch app (My Watch → TrainingHub → Install)"
  fi
  mark_done "$IPHONE_STEP"
fi

if [ "$CONFIGURATION" = "Release" ]; then
  step "iPhone: launch the Release build (no Metro needed)"
  launch_on_iphones
  echo "    the signing profile expires in 7 days: re-run with RELEASE=1 FORCE_IPHONE=1 then"
  step "done — log: $LOG"
  exit 0
fi

# Metro can stay up for hours; another run may start meanwhile.
release_lock
step "Metro (API=$API_URL) — the app opens on the iPhones once Metro is up; Ctrl-C to stop"
echo "    new signing profile? trust it on each iPhone: Settings → General → VPN & Device Management"
echo "    then: device checks in each spec's tasks.md (see docs/sdd/backlog.md) — log: $LOG"
(
  for _ in $(seq 1 120); do
    curl -fsS http://localhost:8081/status 2>/dev/null | grep -q running && break
    sleep 1
  done
  launch_on_iphones
) &
# EXPO_PUBLIC_* is baked into the bundle: --clear so the URL is not a stale one.
npx expo start --clear
