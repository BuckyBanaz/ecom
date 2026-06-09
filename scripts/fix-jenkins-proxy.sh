#!/usr/bin/env bash
# Fix Jenkins HTTPS via Caddy (jenkins.<domain>) — run on VPS as root.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ecom}"
cd "$REPO_DIR"

echo "==> 1. Pull latest config"
git pull origin v1.4

echo "==> 2. Remove old broken ecom_net (no longer used)"
if docker network inspect ecom_net >/dev/null 2>&1; then
  for container in $(docker network inspect ecom_net --format '{{range $k, $v := .Containers}}{{$v.Name}} {{end}}' 2>/dev/null); do
    docker network disconnect ecom_net "$container" 2>/dev/null || true
  done
  docker network rm ecom_net 2>/dev/null || true
  echo "    Removed legacy ecom_net"
fi

echo "==> 3. Ensure prod stack network exists"
docker compose -f docker-compose.prod.yml up -d postgres redis backend frontend

echo "==> 4. Recreate Jenkins (no public ports, same ecom_default network as Caddy)"
docker compose -f docker-compose.jenkins.yml down || true
docker rm -f ecom-jenkins 2>/dev/null || true
export DOCKER_GID="$(stat -c '%g' /var/run/docker.sock 2>/dev/null || echo 999)"
docker compose -f docker-compose.jenkins.yml up -d --build --force-recreate

echo "==> 5. Recreate Caddy (jenkins subdomain + SSL)"
docker compose -f docker-compose.prod.yml up -d --force-recreate caddy

echo "==> 6. Wait for Caddy + Jenkins..."
sleep 12

DOMAIN="$(grep -E '^DOMAIN=' .env.production 2>/dev/null | cut -d= -f2- | tr -d '\r' || echo schipenster.com)"
JENKINS_HOST="jenkins.${DOMAIN}"

echo "==> 7. Internal connectivity (Caddy → Jenkins on ecom_default)"
if docker compose -f docker-compose.prod.yml exec -T caddy wget -qO- --timeout=5 "http://ecom-jenkins:8080/login" 2>/dev/null | head -c 80; then
  echo ""
  echo "    OK — Caddy can reach Jenkins"
else
  echo "    FAIL — checking networks..."
  docker network inspect ecom_default --format '{{range $k, $v := .Containers}}{{$v.Name}} {{end}}' 2>/dev/null || true
fi

echo ""
echo "==> 8. Jenkins ports (must NOT show 0.0.0.0:8080)"
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "jenkins|NAMES" || true

echo ""
echo "==> 9. Caddy logs"
docker compose -f docker-compose.prod.yml logs caddy --tail=15 || true

echo ""
echo "==> 10. HTTPS test"
curl -sI "https://${JENKINS_HOST}" | head -5 || echo "Wait 1-2 min for SSL, then retry"

echo ""
echo "Done → https://${JENKINS_HOST}"
