#!/bin/sh
set -e

# ── Required environment variables ──────────────────────────
#
# If you're missing any of these, see selfhost.md or the
# project README on GitHub:
#   https://github.com/shahriyardx/json-server

missing=""

check_env() {
  var="$1"
  name="$2"
  hint="${3:-}"
  eval "val=\$$var"
  if [ -z "$val" ]; then
    missing="$missing  • $name  (env: $var)"
    if [ -n "$hint" ]; then
      missing="$missing  → $hint"
    fi
    missing="$missing
"
  fi
}

check_env "DATABASE_URL"      "PostgreSQL connection string"
check_env "GITHUB_CLIENT_ID"  "GitHub OAuth client ID"
check_env "GITHUB_CLIENT_SECRET" "GitHub OAuth client secret" \
  "Create an OAuth app at GitHub Settings → Developer settings → OAuth Apps"
check_env "BETTER_AUTH_SECRET" "Session encryption secret" \
  "Generate with: openssl rand -hex 32"
check_env "BETTER_AUTH_URL"   "Public URL of this instance" \
  "e.g. http://localhost:3000"

if [ -n "$missing" ]; then
  echo ""
  echo "  ╔══════════════════════════════════════════════════════╗"
  echo "  ║  Missing required environment variables              ║"
  echo "  ╚══════════════════════════════════════════════════════╝"
  echo ""
  echo "$missing"
  echo "  See selfhost.md or https://github.com/shahriyardx/json-server"
  echo "  for setup instructions."
  echo ""
  exit 1
fi

# ── Database migrations ─────────────────────────────────────

echo "  → Running database migrations..."
bun prisma migrate deploy 2>&1 || {
  echo ""
  echo "  ╔══════════════════════════════════════════════════════╗"
  echo "  ║  Database migration failed                           ║"
  echo "  ╚══════════════════════════════════════════════════════╝"
  echo ""
  echo "  Make sure your PostgreSQL server is running and"
  echo "  DATABASE_URL is correct."
  echo ""
  exit 1
}

# ── Start application ───────────────────────────────────────

echo "  → Starting JSON Server..."
exec node server.js
