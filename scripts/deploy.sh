#!/usr/bin/env bash
# Idempotent production deploy — run on VPS (/opt/ecom) or via Jenkins.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ecom}"
BRANCH="${BRANCH:-v1.4}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SERVICES="${SERVICES:-backend frontend}"

cd "$APP_DIR"

echo "==> Deploying branch: ${BRANCH}"
echo "==> App directory:   ${APP_DIR}"

if [[ ! -f ".env.production" ]]; then
  echo "ERROR: .env.production not found in ${APP_DIR}"
  echo "       Copy from .env.production.example and fill secrets."
  exit 1
fi

echo "==> Pulling latest code..."
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull origin "${BRANCH}"

COMMIT="$(git rev-parse --short HEAD)"
echo "==> Deploying commit: ${COMMIT}"

echo "==> Building images: ${SERVICES}"
docker compose -f "${COMPOSE_FILE}" build ${SERVICES}

echo "==> Starting containers..."
docker compose -f "${COMPOSE_FILE}" up -d ${SERVICES}

echo "==> Waiting for containers to settle..."
sleep 8

docker compose -f "${COMPOSE_FILE}" ps

echo "==> Recent backend logs:"
docker compose -f "${COMPOSE_FILE}" logs --tail=30 backend || true

if [[ "${SKIP_HEALTH_CHECK:-false}" != "true" ]]; then
  bash "${APP_DIR}/scripts/health-check.sh"
fi

echo "==> Deploy complete — commit ${COMMIT}"
