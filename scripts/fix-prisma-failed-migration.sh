#!/usr/bin/env bash
# Recovery when backend crash-loops on P3009 (failed Prisma migration).
# Run from repo root on the VPS after pulling the fixed migration + entrypoint.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
MIGRATION="${MIGRATION:-20260627120000_return_flow_improvements}"

echo "==> Marking failed migration as rolled back: ${MIGRATION}"
docker compose -f "${COMPOSE_FILE}" run --rm --no-deps backend \
  npx prisma migrate resolve --rolled-back "${MIGRATION}"

echo "==> Rebuilding backend (includes fixed idempotent migration SQL)..."
docker compose -f "${COMPOSE_FILE}" build backend

echo "==> Starting backend..."
docker compose -f "${COMPOSE_FILE}" up -d --force-recreate backend

echo "==> Waiting for backend..."
sleep 6

echo "==> Recent backend logs:"
docker compose -f "${COMPOSE_FILE}" logs --tail=50 backend
