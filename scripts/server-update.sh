#!/usr/bin/env bash
# VPS quick update — fetch latest from GitHub, discard local drift, rebuild & restart.
# Usage (SSH as root):
#   cd /opt/ecom && bash scripts/server-update.sh
#   BRANCH=code-deploy bash scripts/server-update.sh
#   SKIP_HEALTH_CHECK=true bash scripts/server-update.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ecom}"
BRANCH="${BRANCH:-code-deploy}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$APP_DIR"

echo "========== Server update =========="
echo "App:    ${APP_DIR}"
echo "Branch: ${BRANCH}"
echo ""

if [[ ! -f ".env.production" ]]; then
  echo "ERROR: .env.production missing in ${APP_DIR}"
  exit 1
fi

if [[ ! -d ".git" ]]; then
  echo "ERROR: ${APP_DIR} is not a git repo"
  exit 1
fi

echo "==> Fetching origin/${BRANCH}..."
git fetch origin "${BRANCH}"

if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  git checkout "${BRANCH}"
else
  git checkout -b "${BRANCH}" "origin/${BRANCH}"
fi

echo "==> Reset to origin/${BRANCH} (drops local file edits on VPS)..."
git reset --hard "origin/${BRANCH}"

COMMIT="$(git rev-parse --short HEAD)"
MSG="$(git log -1 --pretty=%s)"
echo "==> Source: ${COMMIT} — ${MSG}"
echo ""

export APP_DIR
export BRANCH
export COMPOSE_FILE
export SKIP_GIT_PULL=true
export SKIP_HEALTH_CHECK="${SKIP_HEALTH_CHECK:-false}"
export DOCKER_NO_CACHE="${DOCKER_NO_CACHE:-false}"

exec bash "${APP_DIR}/scripts/deploy.sh"
