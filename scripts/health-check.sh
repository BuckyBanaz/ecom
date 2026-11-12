#!/usr/bin/env bash
# Post-deploy smoke test — waits for API /health to return healthy.
set -euo pipefail

API_URL="${API_URL:-https://api.schipenster.com}"
SITE_URL="${SITE_URL:-https://schipenster.com}"
MAX_RETRIES="${MAX_RETRIES:-24}"
SLEEP_SECS="${SLEEP_SECS:-5}"

echo "==> Health check: ${API_URL}/health"

for ((i = 1; i <= MAX_RETRIES; i++)); do
  if response="$(curl -sf "${API_URL}/health" 2>/dev/null)"; then
    if echo "$response" | grep -qE '"status"\s*:\s*"healthy"'; then
      echo "    API healthy (attempt ${i}/${MAX_RETRIES})"
      break
    fi
    echo "    Attempt ${i}/${MAX_RETRIES}: API responded but not healthy yet..."
  else
    echo "    Attempt ${i}/${MAX_RETRIES}: API not reachable yet..."
  fi

  if [[ "$i" -eq "$MAX_RETRIES" ]]; then
    echo "ERROR: API health check failed after ${MAX_RETRIES} attempts"
    exit 1
  fi
  sleep "$SLEEP_SECS"
done

if curl -sf -o /dev/null -I "${SITE_URL}"; then
  echo "==> Frontend reachable: ${SITE_URL}"
else
  echo "WARNING: Frontend ${SITE_URL} not reachable (API is healthy)"
fi

echo "==> Health check passed"
