#!/bin/sh
set -e

usage() {
  echo "Usage: $0 <package> <bump>"
  echo ""
  echo "  package    app  |  sdk"
  echo "  bump       patch | minor | major"
  echo ""
  echo "Examples:"
  echo "  $0 app patch     # 0.3.2 → 0.3.3, tag v0.3.3"
  echo "  $0 sdk minor     # 0.2.0 → 0.3.0, tag sdk-v0.3.0"
  exit 1
}

pkg="$1"
bump="$2"

if [ -z "$pkg" ] || [ -z "$bump" ]; then
  usage
fi

case "$bump" in
  patch|minor|major) ;;
  *) echo "Error: bump must be patch, minor, or major"; exit 1 ;;
esac

# ── Determine package file and tag prefix ──────────────────

case "$pkg" in
  app)
    file="package.json"
    tag_prefix="v"
    ;;
  sdk)
    file="sdk/package.json"
    tag_prefix="sdk-v"
    ;;
  *)
    echo "Error: package must be 'app' or 'sdk'"
    exit 1
    ;;
esac

# ── Read current version and bump ──────────────────────────

current=$(grep '"version"' "$file" | sed 's/.*"version": "\(.*\)",*/\1/')

IFS=. read -r major minor patch <<EOF
$current
EOF

case "$bump" in
  patch) new="$major.$minor.$((patch + 1))" ;;
  minor) new="$major.$((minor + 1)).0" ;;
  major) new="$((major + 1)).0.0" ;;
esac

# ── Update file and commit ─────────────────────────────────

sed -i "s/\"version\": \"$current\"/\"version\": \"$new\"/" "$file"

tag="${tag_prefix}${new}"

git add "$file"
git commit -m "bump $pkg to $new"

# ── Create release ─────────────────────────────────────────

gh release create "$tag" --title "$tag" --generate-notes

echo ""
echo "  ✓ Released $tag"
