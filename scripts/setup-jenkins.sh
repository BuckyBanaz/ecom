#!/usr/bin/env bash
# One-time Jenkins setup on the production VPS.
# Run as root on 187.124.21.137 after cloning/pulling the repo.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ecom}"
JENKINS_COMPOSE="${REPO_DIR}/docker-compose.jenkins.yml"

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
docker compose -f "${JENKINS_COMPOSE}" up -d --build

echo ""
echo "==> Jenkins is starting on port 8080"
echo ""
echo "Next steps:"
echo "  1. Open http://$(hostname -I | awk '{print $1}'):8080"
echo "  2. Complete setup wizard — create admin user"
echo "  3. Install plugins: Git, GitHub, Pipeline, Docker Pipeline, Credentials Binding"
echo "  4. New Item → Pipeline → name: ecom-production-deploy"
echo "     - Definition: Pipeline script from SCM"
echo "     - SCM: Git → https://github.com/BuckyBanaz/ecom.git"
echo "     - Branch: */v1.4"
echo "     - Script path: Jenkinsfile"
echo "  5. Run Build with Parameters → BRANCH=v1.4"
echo ""
echo "Optional: GitHub webhook → http://<VPS_IP>:8080/github-webhook/"
echo "           (restrict port 8080 in firewall to your IP)"
