#!/usr/bin/env bash
# Idempotent production deploy — run on VPS (/opt/ecom) or via Jenkins.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ecom}"
BRANCH="${BRANCH:-v1.4}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SERVICES="${SERVICES:-backend frontend caddy}"

cd "$APP_DIR"

echo "==> Deploying branch: ${BRANCH}"
echo "==> App directory:   ${APP_DIR}"

if [[ ! -f ".env.production" ]]; then
  echo "ERROR: .env.production not found in ${APP_DIR}"
  echo "       Copy from .env.production.example and fill secrets."
  exit 1
fi

if [[ "${SKIP_GIT_PULL:-false}" != "true" ]]; then
  echo "==> Pulling latest code..."
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git pull origin "${BRANCH}"
else
  echo "==> Skipping git pull (using pre-copied workspace code)"
fi

COMMIT="$(git rev-parse --short HEAD)"
echo "==> Deploying commit: ${COMMIT}"

echo "==> Building images: ${SERVICES}"
BUILD_ARGS=()
if [[ "${DOCKER_NO_CACHE:-false}" == "true" ]]; then
  BUILD_ARGS+=(--no-cache)
  echo "    (full rebuild — DOCKER_NO_CACHE=true)"
else
  echo "    (using Docker layer cache — set DOCKER_NO_CACHE=true to force full rebuild)"
fi
docker compose -f "${COMPOSE_FILE}" build "${BUILD_ARGS[@]}" ${SERVICES}

echo "==> Starting containers..."
docker compose -f "${COMPOSE_FILE}" up -d --force-recreate ${SERVICES}

echo "==> Waiting for containers to settle..."
sleep 8

# Deploy builds frontend/backend on the host — Jenkins often gets OOM-killed or Caddy shows 502 until upstream is back.
echo "==> Ensuring Jenkins is up (deploy does not rebuild it, but builds can starve RAM)..."
if ! curl -sf http://127.0.0.1:8080/login >/dev/null 2>&1; then
  echo "    Jenkins not responding — restarting jenkins, then caddy..."
  docker compose -f "${COMPOSE_FILE}" up -d jenkins
  for i in $(seq 1 24); do
    if curl -sf http://127.0.0.1:8080/login >/dev/null 2>&1; then
      echo "    Jenkins ready after ~$((i * 5))s"
      break
    fi
    sleep 5
  done
  docker compose -f "${COMPOSE_FILE}" up -d --force-recreate caddy
  sleep 5
else
  echo "    Jenkins OK"
fi

docker compose -f "${COMPOSE_FILE}" ps

echo "==> Recent backend logs:"
docker compose -f "${COMPOSE_FILE}" logs --tail=30 backend || true

if [[ "${SKIP_HEALTH_CHECK:-false}" != "true" ]]; then
  bash "${APP_DIR}/scripts/health-check.sh"
fi

if [[ -f ".env.production" ]]; then
  ENV_KEY_COUNT="$(grep -cE '^[A-Z_][A-Z0-9_]*=' .env.production 2>/dev/null || echo 0)"
  echo "==> .env.production preserved on host (${ENV_KEY_COUNT} keys — survives restarts/deploys)"
else
  echo "WARNING: .env.production missing after deploy!"
fi

echo "==> Deploy complete — commit ${COMMIT}"
