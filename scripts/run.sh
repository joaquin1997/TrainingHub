#!/usr/bin/env bash
#
# Recompile + launch TrainingHub.
#
#   ./scripts/run.sh backend     # rebuild the API Docker image and redeploy the container
#   ./scripts/run.sh frontend    # launch the Expo app (pointed at the API)
#   ./scripts/run.sh all         # backend, then frontend (default)
#
# Useful overrides (env vars):
#   DOCKER_CONTEXT=docker-ts ./scripts/run.sh backend   # deploy over Tailscale instead of LAN
#   EXPO_PUBLIC_API_URL=http://localhost:3000 ./scripts/run.sh frontend
#   DEVICE=1 ./scripts/run.sh frontend                  # build onto a connected iPhone (expo run:ios --device)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# --- config (override via environment) ---------------------------------------
DOCKER_CONTEXT="${DOCKER_CONTEXT:-docker-lan}"                  # docker-lan (LAN, faster) | docker-ts (Tailscale)
# The app reaches the API via the HTTPS MagicDNS URL (Tailscale Serve :8443);
# RN's fetch fails against the raw 100.x IP over plain http on iOS.
API_URL="${EXPO_PUBLIC_API_URL:-https://joaquinserver.tail644a1a.ts.net:8443}"
IMAGE="traininghub-api:latest"
CONTAINER="traininghub-api"
ENV_FILE="$ROOT/apps/api/.env"

# --- backend: rebuild image on the remote daemon and replace the container ---
deploy_backend() {
  echo "==> [backend] building $IMAGE on docker context '$DOCKER_CONTEXT' (context = repo root)"
  DOCKER_BUILDKIT=0 docker -c "$DOCKER_CONTEXT" build -t "$IMAGE" "$ROOT"

  if [ ! -f "$ENV_FILE" ]; then
    echo "!! missing $ENV_FILE (copy apps/api/.env.example and set DATABASE_URL)" >&2
    exit 1
  fi

  # `docker run --env-file` does NOT strip quotes (compose does), which corrupts
  # a quoted DATABASE_URL. Source the file so the shell unquotes it, then pass
  # the variable by name. The secret never reaches the command line / logs.
  echo "==> [backend] loading DATABASE_URL from apps/api/.env"
  set -a; . "$ENV_FILE"; set +a

  echo "==> [backend] (re)starting container '$CONTAINER'"
  docker -c "$DOCKER_CONTEXT" rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker -c "$DOCKER_CONTEXT" run -d \
    --name "$CONTAINER" \
    --restart unless-stopped \
    --network host \
    -e NODE_ENV=production -e HOST=0.0.0.0 -e PORT=3000 \
    -e DATABASE_URL \
    -e JWT_SECRET \
    "$IMAGE" >/dev/null

  echo "==> [backend] waiting for health at $API_URL/health"
  for _ in $(seq 1 "${HEALTH_TRIES:-20}"); do
    if curl -fsS "$API_URL/health" >/dev/null 2>&1; then
      echo "    [backend] healthy: $(curl -fsS "$API_URL/health")"
      return 0
    fi
    sleep 1
  done

  echo "!! [backend] did not become healthy; last logs:" >&2
  docker -c "$DOCKER_CONTEXT" logs --tail 30 "$CONTAINER" >&2 || true
  exit 1
}

# --- frontend: launch Expo pointed at the API --------------------------------
run_frontend() {
  cd "$ROOT/apps/mobile"
  export EXPO_PUBLIC_API_URL="$API_URL"

  if [ "${DEVICE:-0}" = "1" ]; then
    # A physical iPhone over Tailscale needs Metro reachable at the Mac's tailnet IP.
    local host_ip="${REACT_NATIVE_PACKAGER_HOSTNAME:-$(tailscale ip -4 2>/dev/null | head -1 || true)}"
    echo "==> [frontend] expo run:ios --device  (API=$API_URL, packager host=${host_ip:-auto})"
    if [ -n "$host_ip" ]; then
      REACT_NATIVE_PACKAGER_HOSTNAME="$host_ip" npx expo run:ios --device
    else
      npx expo run:ios --device
    fi
  else
    echo "==> [frontend] expo start  (API=$API_URL)"
    npx expo start
  fi
}

case "${1:-all}" in
  backend)  deploy_backend ;;
  frontend) run_frontend ;;
  all)      deploy_backend; run_frontend ;;
  *) echo "usage: $0 [backend|frontend|all]" >&2; exit 1 ;;
esac
