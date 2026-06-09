#!/usr/bin/env bash
# One-time Jenkins setup on the production VPS.
# Run as root on 187.124.21.137 after cloning/pulling the repo.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ecom}"
PROD_COMPOSE="${REPO_DIR}/docker-compose.prod.yml"

echo "==> Ecom Jenkins setup"
echo "    Repo: ${REPO_DIR}"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "ERROR: ${REPO_DIR} is not a git repo. Clone first:"
  echo "  git clone -b v1.4 https://github.com/BuckyBanaz/ecom.git ${REPO_DIR}"
  exit 1
fi

if [[ ! -f "${REPO_DIR}/.env.production" ]]; then
  echo "WARNING: ${REPO_DIR}/.env.production missing — deploy will fail until you add it."
fi

chmod +x "${REPO_DIR}/scripts/"*.sh

# Docker socket GID for jenkins container (optional)
export DOCKER_GID="$(stat -c '%g' /var/run/docker.sock 2>/dev/null || echo 999)"

cd "${REPO_DIR}"
docker compose -f "${PROD_COMPOSE}" up -d --build jenkins

echo ""
DOMAIN="${DOMAIN:-schipenster.com}"
if [[ -f "${REPO_DIR}/.env.production" ]]; then
  DOMAIN="$(grep -E '^DOMAIN=' "${REPO_DIR}/.env.production" | cut -d= -f2- | tr -d '\r' || echo "$DOMAIN")"
fi

echo "==> Recreating Caddy (jenkins subdomain)..."
docker compose -f "${REPO_DIR}/docker-compose.prod.yml" up -d caddy

echo ""
echo "==> Jenkins is starting (no public port — only via Caddy)"
echo ""
echo "Next steps:"
echo "  1. Add DNS A record: jenkins.${DOMAIN} → $(hostname -I | awk '{print $1}')"
echo "  2. Open https://jenkins.${DOMAIN}"
echo "  3. Complete setup wizard — create admin user"
echo "  3. Install plugins: Git, GitHub, Pipeline, Docker Pipeline, Credentials Binding"
echo "  4. New Item → Pipeline → name: ecom-production-deploy"
echo "     - Definition: Pipeline script from SCM"
echo "     - SCM: Git → https://github.com/BuckyBanaz/ecom.git"
echo "     - Branch: */v1.4"
echo "     - Script path: Jenkinsfile"
echo "  5. Run Build with Parameters → BRANCH=v1.4"
echo ""
echo "Optional: GitHub webhook → https://jenkins.${DOMAIN}/github-webhook/"
