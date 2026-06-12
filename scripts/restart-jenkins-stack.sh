#!/usr/bin/env bash
# Full Jenkins + Caddy recovery — run on VPS as root.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ecom}"
cd "$REPO_DIR"

echo "========== Jenkins stack recovery =========="

echo "==> Disk space"
df -h / | tail -1
AVAIL_KB="$(df / | tail -1 | awk '{print $4}')"
if [ "${AVAIL_KB:-0}" -lt 2097152 ]; then
  echo "WARNING: Less than 2 GB free — Jenkins may fail. Run:"
  echo "  docker image prune -a -f && docker builder prune -a -f"
fi

echo "==> Stop ALL Jenkins containers (fixes port 8080 conflict)"
docker compose -f docker-compose.jenkins.yml down 2>/dev/null || true
docker compose -f docker-compose.prod.yml stop jenkins 2>/dev/null || true
for cid in $(docker ps -aq --filter "name=jenkins"); do
  docker rm -f "$cid" 2>/dev/null || true
done
docker rm -f ecom-jenkins 2>/dev/null || true

if ss -tlnp 2>/dev/null | grep -q ':8080 '; then
  echo "WARNING: Port 8080 still in use:"
  ss -tlnp | grep ':8080 ' || true
fi

export DOCKER_GID="$(stat -c '%g' /var/run/docker.sock 2>/dev/null || echo 999)"

echo "==> Start Jenkins (prod compose — same Docker network as Caddy)"
docker compose -f docker-compose.prod.yml up -d --build jenkins

echo "==> Wait for Jenkins to boot (can take 60-90s)..."
READY=0
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8080/login >/dev/null 2>&1; then
    echo "    Jenkins ready after ~$((i * 5))s"
    READY=1
    break
  fi
  echo "    waiting... ($i/30)"
  sleep 5
done

if [ "$READY" -eq 0 ]; then
  echo "FAIL — Jenkins not responding on 127.0.0.1:8080"
  docker compose -f docker-compose.prod.yml logs jenkins --tail=40
  exit 1
fi

echo "==> Trust GitHub SSH host key"
docker compose -f docker-compose.prod.yml exec -T -u jenkins jenkins bash -c '
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  ssh-keyscan -t rsa,ecdsa,ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null
  chmod 644 ~/.ssh/known_hosts
' || true

echo "==> Restart Caddy (refreshes jenkins upstream)"
docker compose -f docker-compose.prod.yml up -d --force-recreate caddy
sleep 5

DOMAIN="$(grep -E '^DOMAIN=' .env.production 2>/dev/null | cut -d= -f2- | tr -d '\r' || echo schipenster.com)"

echo ""
echo "==> Container status"
docker compose -f docker-compose.prod.yml ps jenkins caddy

echo ""
echo "==> Local Jenkins"
curl -sI http://127.0.0.1:8080/login | head -3

echo ""
echo "==> Caddy → Jenkins internal"
docker compose -f docker-compose.prod.yml exec -T caddy wget -qO- --timeout=5 http://jenkins:8080/login 2>/dev/null | head -c 60 || echo "FAIL — Caddy cannot reach jenkins"

echo ""
echo "==> Public HTTPS"
curl -sI "https://jenkins.${DOMAIN}" | head -5

echo ""
echo "Done → https://jenkins.${DOMAIN}"
