#!/usr/bin/env bash
# Point dunjunz-graphics-v2.vercel.app at the latest READY graphics-v2 deployment.
# Requires: vercel CLI logged in, or VERCEL_TOKEN + optional VERCEL_TEAM_ID.
set -euo pipefail

SCOPE="${VERCEL_SCOPE:-neasemedia}"
PROJECT="${VERCEL_PROJECT:-dunjunz}"
BRANCH="${STAGING_BRANCH:-graphics-v2}"
ALIAS="${STAGING_ALIAS:-dunjunz-graphics-v2.vercel.app}"

if ! command -v vercel >/dev/null 2>&1; then
  echo "error: vercel CLI not found" >&2
  exit 1
fi

echo "==> Listing recent deployments for $PROJECT (scope $SCOPE)…"
# Prefer deployments whose meta branch is graphics-v2
mapfile -t LINES < <(vercel ls "$PROJECT" --scope "$SCOPE" 2>/dev/null | head -40 || true)

# Fallback: use vercel API via `vercel inspect` after ls URLs
DEPLOY_URL=""
while read -r line; do
  if [[ "$line" =~ https://[^[:space:]]+ ]]; then
    url="${BASH_REMATCH[0]}"
    # Inspect is slow; take first Ready Preview URL as heuristic then verify with API if token set
    if [[ "$line" == *Ready* ]] || [[ "$line" == *●* ]]; then
      DEPLOY_URL="$url"
      break
    fi
  fi
done < <(vercel ls --scope "$SCOPE" 2>/dev/null | head -20)

if [[ -z "$DEPLOY_URL" && -n "${VERCEL_TOKEN:-}" ]]; then
  TEAM="${VERCEL_TEAM_ID:-team_B8spPdBxmjp8VUu0Akh9tHDX}"
  PROJ_ID="${VERCEL_PROJECT_ID:-prj_R2ivbaXEMNliIA6elnp0sXmEERxM}"
  DEPLOY_URL=$(curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?teamId=${TEAM}&projectId=${PROJ_ID}&limit=20" | \
    node -e "
      let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
        const j=JSON.parse(d);
        const hit=(j.deployments||[]).find(x =>
          x.state==='READY' && (x.meta?.githubCommitRef==='${BRANCH}' || x.meta?.githubCommitRef==='${BRANCH}')
        );
        if (hit) console.log('https://'+hit.url);
      });
    ")
fi

if [[ -z "$DEPLOY_URL" ]]; then
  echo "error: could not find a READY deployment for branch $BRANCH" >&2
  exit 1
fi

echo "==> Aliasing $ALIAS → $DEPLOY_URL"
vercel alias set "$DEPLOY_URL" "$ALIAS" --scope "$SCOPE"
echo "Done. Staging short URL: https://$ALIAS/play/"
