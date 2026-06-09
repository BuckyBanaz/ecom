#!/usr/bin/env bash
# Roll back to a previous git commit and redeploy.
# Usage: ./scripts/rollback.sh <commit-sha>
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ecom}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SERVICES="${SERVICES:-backend frontend}"
TARGET_COMMIT="${1:-}"

if [[ -z "$TARGET_COMMIT" ]]; then
  echo "Usage: $0 <commit-sha>"
  echo ""
  echo "Recent commits:"
  git -C "$APP_DIR" log --oneline -10 2>/dev/null || true
  exit 1
fi

cd "$APP_DIR"

echo "==> Rolling back to commit: ${TARGET_COMMIT}"
git fetch origin
git checkout "${TARGET_COMMIT}"

echo "==> Rebuilding and restarting..."
docker compose -f "${COMPOSE_FILE}" build ${SERVICES}
docker compose -f "${COMPOSE_FILE}" up -d ${SERVICES}

sleep 8
bash "${APP_DIR}/scripts/health-check.sh"

echo "==> Rollback complete — now at ${TARGET_COMMIT}"
