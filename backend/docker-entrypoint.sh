#!/bin/sh
set -e

# If a previous deploy left this migration in a failed state, mark it rolled back
# so `migrate deploy` can retry. The SQL is idempotent (IF NOT EXISTS / CREATE IF NOT EXISTS).
npx prisma migrate resolve --rolled-back "20260627120000_return_flow_improvements" 2>/dev/null || true

npx prisma migrate deploy
exec node dist/index.js
