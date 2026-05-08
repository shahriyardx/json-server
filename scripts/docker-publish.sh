#!/bin/sh
set -e

# ── Parse version from package.json ─────────────────────────

version=$(grep '"version"' package.json | sed 's/.*"version": "\(.*\)",*/\1/')

if [ -z "$version" ]; then
  echo "Error: could not parse version from package.json"
  exit 1
fi

echo "  → Building shahriyardx/json-server:$version ..."
docker build -f selfhost/Dockerfile \
  -t "shahriyardx/json-server:$version" \
  -t shahriyardx/json-server:latest .

echo ""
echo "  → Pushing shahriyardx/json-server:$version ..."
docker push "shahriyardx/json-server:$version"

echo ""
echo "  → Pushing shahriyardx/json-server:latest ..."
docker push shahriyardx/json-server:latest

echo ""
echo "  ✓ Published shahriyardx/json-server:$version and latest"
