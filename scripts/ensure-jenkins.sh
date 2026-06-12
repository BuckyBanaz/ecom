#!/usr/bin/env bash
# Lightweight watchdog — run from cron every 5 min if Jenkins keeps dying.
# Example crontab (root): */5 * * * * /opt/ecom/scripts/ensure-jenkins.sh >> /var/log/ensure-jenkins.log 2>&1
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/ecom}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
cd "$REPO_DIR"

if curl -sf http://127.0.0.1:8080/login >/dev/null 2>&1; then
  exit 0
fi

echo "$(date -Is) Jenkins down — restarting jenkins + caddy"

export DOCKER_GID="$(stat -c '%g' /var/run/docker.sock 2>/dev/null || echo 999)"
docker compose -f "$COMPOSE_FILE" up -d jenkins

for i in $(seq 1 24); do
  if curl -sf http://127.0.0.1:8080/login >/dev/null 2>&1; then
    echo "$(date -Is) Jenkins up after ~$((i * 5))s"
    docker compose -f "$COMPOSE_FILE" up -d --force-recreate caddy
    exit 0
  fi
  sleep 5
done

echo "$(date -Is) FAIL — Jenkins still down"
docker compose -f "$COMPOSE_FILE" logs jenkins --tail=30 || true
exit 1
