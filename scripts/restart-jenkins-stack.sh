#!/usr/bin/env bash
# Full Jenkins + Caddy recovery — run on VPS as root.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ecom}"
cd "$REPO_DIR"

echo "========== Jenkins stack recovery =========="

git pull origin v1.4

echo "==> Stop legacy standalone Jenkins (old setup)"
docker compose -f docker-compose.jenkins.yml down 2>/dev/null || true
docker rm -f ecom-jenkins 2>/dev/null || true
docker network rm ecom_net 2>/dev/null || true

export DOCKER_GID="$(stat -c '%g' /var/run/docker.sock 2>/dev/null || echo 999)"

echo "==> Start Jenkins (inside prod compose — same network as Caddy)"
docker compose -f docker-compose.prod.yml build jenkins
docker compose -f docker-compose.prod.yml up -d jenkins

echo "==> Wait for Jenkins to boot (can take 60-90s)..."
for i in $(seq 1 24); do
  if curl -sf http://127.0.0.1:8080/login >/dev/null 2>&1; then
    echo "    Jenkins ready after ~$((i * 5))s"
    break
  fi
  echo "    waiting... ($i/24)"
  sleep 5
done

echo "==> Restart Caddy"
docker compose -f docker-compose.prod.yml up -d --force-recreate caddy
sleep 5

DOMAIN="$(grep -E '^DOMAIN=' .env.production 2>/dev/null | cut -d= -f2- | tr -d '\r' || echo schipenster.com)"

echo ""
echo "==> Container status"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "==> Local Jenkins (VPS only)"
curl -sI http://127.0.0.1:8080/login | head -3 || echo "FAIL — Jenkins not responding locally"

echo ""
echo "==> Caddy → Jenkins internal"
docker compose -f docker-compose.prod.yml exec -T caddy wget -qO- --timeout=5 http://jenkins:8080/login 2>/dev/null | head -c 60 || echo "FAIL — Caddy cannot reach jenkins service"

echo ""
echo "==> Public HTTPS"
curl -sI "https://jenkins.${DOMAIN}" | head -5 || echo "FAIL — check DNS / firewall / Caddy logs"

echo ""
echo "==> Caddy logs"
docker compose -f docker-compose.prod.yml logs caddy --tail=20

echo ""
echo "Done."
echo "  Browser:  https://jenkins.${DOMAIN}"
echo "  SSH tunnel (if HTTPS fails): ssh -L 8080:127.0.0.1:8080 root@$(hostname -I | awk '{print $1}')"
echo "  Then open: http://localhost:8080"
