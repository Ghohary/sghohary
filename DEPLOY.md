# Deployment workflow (manual only)

## Production safety
We disconnected this Vercel project from Git pushes, so `git push` will no longer trigger automatic deployments.

## Safe workflow
1. Make and test your local changes.
2. Deploy a preview (staging) build:
   - `npm run deploy:preview`
   - Open and verify the preview URL.
3. When you approve, promote to production:
   - `npm run deploy:prod` (recommended: sets aliases to main domains)
   - `npm run deploy:prod:plain` (promotes without forced aliasing)
4. Confirm:
   - `https://ghohary.com` and `https://www.ghohary.com` point to the approved production deployment.
5. Run blob guardrails:
   - `npm run verify:no-blob`
   - Confirm GitHub Action `No Vercel Blob Reintroduction` passes.

## Production deploy behavior (recommended command)
- `npm run deploy:prod` runs:
  1) `npm run verify:no-blob`
  2) production deployment on Vercel
  3) aliasing to:
     - `ghohary.com`
     - `www.ghohary.com`
- Use this command for the deployment you want live on your customer domain.

## Current aliases
- `ghohary.com` => current production deployment (re-run after each deploy)
- `www.ghohary.com` => current production deployment (re-run after each deploy)

## Vercel Blob decommission state
- Project integrations: **Redis only** (`ghohary-kv`).
- Required project env vars: `ghohary_REDIS_URL`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`.
- Optional runtime media vars: `R2_*` only if your deployment code reads/writes R2.
- Never re-add Vercel Blob or Vercel Blob Storage references.
- Monthly review: verify usage/charges no longer include Blob storage or transfer.
