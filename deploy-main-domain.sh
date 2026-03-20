#!/usr/bin/env bash
set -euo pipefail

echo "Deploying to Vercel production..."
deploy_output="$(vercel --prod --yes)"
echo "$deploy_output"

deployment_url="$(printf '%s\n' "$deploy_output" | rg -o 'https://[^ ]+\\.vercel\\.app' | tail -n 1)"

if [[ -z "$deployment_url" ]]; then
  echo "Unable to detect deployment URL from vercel output."
  exit 1
fi

echo "Aliasing production deployment to primary domains..."
vercel alias set "$deployment_url" ghohary.com
vercel alias set "$deployment_url" www.ghohary.com
echo "Done. Main domain set to ghohary.com (and www.ghohary.com)."
