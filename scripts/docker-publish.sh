#!/bin/sh
set -e

# ── Parse version from package.json ─────────────────────────

version=$(grep '"version"' package.json | sed 's/.*"version": "\(.*\)",*/\1/')

if [ -z "$version" ]; then
  echo "Error: could not parse version from package.json"
  exit 1
fi

echo "  → Building + pushing shahriyardx/json-server:$version (linux/amd64, linux/arm64)..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f selfhost/Dockerfile \
  -t "shahriyardx/json-server:$version" \
  -t shahriyardx/json-server:latest \
  --push \
  .

echo ""
echo "  ✓ Published multi-arch: shahriyardx/json-server:$version and latest"
