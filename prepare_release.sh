#!/usr/bin/env bash
# prepare_release.sh — Bump version, commit, tag, push
#
# Usage:
#   ./prepare_release.sh              # patch bump: 2.0.0 → 2.0.1
#   ./prepare_release.sh --minor      # minor bump: 2.0.0 → 2.1.0
#   ./prepare_release.sh --major      # major bump: 2.0.0 → 3.0.0
#   ./prepare_release.sh --set-version 2.1.0  # explicit version
#
# Tag convention: v<semver> (e.g. v2.0.1)
# Triggers: GitHub Actions deploy-dev on tag push

set -euo pipefail

PKG="package.json"

usage() {
cat <<'EOF'
Usage:
  ./prepare_release.sh [--patch|--minor|--major|--set-version X.Y.Z]

  --patch (default)    2.0.0 → 2.0.1
  --minor              2.0.0 → 2.1.0
  --major              2.0.0 → 3.0.0
  --set-version X.Y.Z  explicit version
EOF
}

BUMP="patch"
SET_VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --patch) BUMP="patch"; shift ;;
    --minor) BUMP="minor"; shift ;;
    --major) BUMP="major"; shift ;;
    --set-version)
      [[ $# -lt 2 ]] && { echo "Error: --set-version requires X.Y.Z" >&2; exit 1; }
      SET_VERSION="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Error: Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

# Validate explicit version
if [[ -n "$SET_VERSION" ]]; then
  if [[ ! "$SET_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid version '$SET_VERSION'. Expected X.Y.Z" >&2
    exit 1
  fi
fi

# Check file exists
[[ ! -f "$PKG" ]] && { echo "Error: $PKG not found. Run from project root." >&2; exit 1; }

# Check git remote
if ! git ls-remote &>/dev/null; then
  echo "Error: Unable to communicate with Git remote" >&2
  exit 1
fi

# Ensure clean working tree
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: Working tree is dirty. Commit or stash changes first." >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch --tags --quiet || true

# Read current version from package.json
CURRENT_VERSION=$(python3 -c "import json; print(json.load(open('$PKG'))['version'])")

if [[ -z "$CURRENT_VERSION" ]]; then
  echo "Error: Unable to read version from $PKG" >&2
  exit 1
fi

# Calculate new version
if [[ -n "$SET_VERSION" ]]; then
  NEW_VERSION="$SET_VERSION"
else
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
  case "$BUMP" in
    major) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
    minor) NEW_VERSION="${MAJOR}.$((MINOR + 1)).0" ;;
    patch) NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))" ;;
  esac
fi

TAG_NAME="v${NEW_VERSION}"

# Check tag doesn't already exist
if git rev-parse -q --verify "refs/tags/$TAG_NAME" >/dev/null; then
  echo "Error: Tag already exists: $TAG_NAME" >&2
  exit 1
fi

echo "Preparing release on branch: $CURRENT_BRANCH"
echo "  Current: $CURRENT_VERSION"
echo "  New:     $NEW_VERSION"
echo "  Tag:     $TAG_NAME"
echo ""

# Update package.json
python3 -c "
import json
with open('$PKG', 'r') as f:
    data = json.load(f)
data['version'] = '$NEW_VERSION'
with open('$PKG', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"

# Commit + tag + push
git add "$PKG"
git commit -m "chore(release): $TAG_NAME"
git tag -a "$TAG_NAME" -m "Release $TAG_NAME"

echo "Pushing branch and tag..."
git push origin "$CURRENT_BRANCH"
git push origin "$TAG_NAME"

echo ""
echo "✅ Done. Created and pushed: $TAG_NAME"
echo "   GitHub Actions will deploy to DEV automatically."
echo "   To promote to PROD, run the 'Promote to Production' workflow from GitHub Actions UI."
