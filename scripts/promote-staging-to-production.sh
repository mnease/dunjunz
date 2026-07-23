#!/usr/bin/env bash
# Promote staging branch (graphics-v2) → production (main).
# Use only when you intentionally want live users to get staging.
set -euo pipefail

STAGING_BRANCH="${STAGING_BRANCH:-graphics-v2}"
PROD_BRANCH="${PROD_BRANCH:-main}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: working tree is dirty. Commit or stash first." >&2
  exit 1
fi

echo "==> Fetching origin…"
git fetch origin

echo "==> Checking out $PROD_BRANCH…"
git checkout "$PROD_BRANCH"
git pull --ff-only origin "$PROD_BRANCH"

echo "==> Merging origin/$STAGING_BRANCH into $PROD_BRANCH…"
git merge --no-ff "origin/$STAGING_BRANCH" -m "release: promote ${STAGING_BRANCH} staging to production"

echo "==> Pushing origin/$PROD_BRANCH (this deploys www.dunjunz.com)…"
git push origin "$PROD_BRANCH"

echo ""
echo "Production promoted."
echo "  Live:    https://www.dunjunz.com/play/"
echo "  Staging: https://graphics.dunjunz.com/play/  (still $STAGING_BRANCH)"
echo ""
echo "Switch back to staging for continued work:"
echo "  git checkout $STAGING_BRANCH"
