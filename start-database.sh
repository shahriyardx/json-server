#!/usr/bin/env bash
set -euo pipefail

# Stop all running postgres containers
RUNNING=$(docker ps --format '{{.ID}} {{.Image}}' 2>/dev/null | grep -i postgres | awk '{print $1}')
if [ -n "$RUNNING" ]; then
  echo "Stopping running postgres containers..."
  docker stop $RUNNING
fi

# Start via docker compose
echo "Starting database..."
docker compose up -d
echo "Done."
