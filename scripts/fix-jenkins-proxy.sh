#!/usr/bin/env bash
# Fix Jenkins HTTPS via Caddy (jenkins.<domain>) — run on VPS as root.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ecom}"
cd "$REPO_DIR"

echo "==> 1. Pull latest config"
git pull origin v1.4

echo "==> 2. Ensure shared Docker network exists"
docker network inspect ecom_net >/dev/null 2>&1 || docker network create ecom_net

echo "==> 3. Recreate Jenkins (no public ports)"
docker compose -f docker-compose.jenkins.yml down || true
docker rm -f ecom-jenkins 2>/dev/null || true
export DOCKER_GID="$(stat -c '%g' /var/run/docker.sock 2>/dev/null || echo 999)"
docker compose -f docker-compose.jenkins.yml up -d --build --force-recreate

echo "==> 4. Recreate Caddy (load jenkins subdomain + SSL)"
docker compose -f docker-compose.prod.yml up -d --force-recreate caddy

echo "==> 5. Wait for Caddy + Jenkins..."
sleep 10

DOMAIN="$(grep -E '^DOMAIN=' .env.production 2>/dev/null | cut -d= -f2- | tr -d '\r' || echo schipenster.com)"
JENKINS_HOST="jenkins.${DOMAIN}"

echo "==> 6. Internal connectivity (Caddy → Jenkins)"
if docker compose -f docker-compose.prod.yml exec -T caddy wget -qO- --timeout=5 "http://ecom-jenkins:8080/login" 2>/dev/null | head -c 80; then
  echo ""
  echo "    OK — Caddy can reach Jenkins internally"
else
  echo "    FAIL — Caddy cannot reach ecom-jenkins:8080"
  echo "    Try: docker network connect ecom_net \$(docker ps -qf name=caddy)"
fi

echo ""
echo "==> 7. Jenkins container ports (should NOT show 0.0.0.0:8080)"
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "jenkins|NAMES" || true

echo ""
echo "==> 8. Caddy logs (last 15 lines)"
docker compose -f docker-compose.prod.yml logs caddy --tail=15 || true

echo ""
echo "==> 9. HTTPS test from server"
curl -sI "https://${JENKINS_HOST}" | head -5 || echo "HTTPS test failed — wait 1-2 min for SSL cert"

echo ""
echo "Done. Open: https://${JENKINS_HOST}"
echo "Jenkins URL setting: https://${JENKINS_HOST}/"
