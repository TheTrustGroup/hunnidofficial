#!/bin/bash
# Deploy to Vercel: frontend (warehouse-pos) and optionally API (inventory-server).
# Usage:
#   ./deploy_vercel.sh           # frontend only
#   ./deploy_vercel.sh --both    # frontend then API

set -e
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

if ! vercel whoami &>/dev/null; then
  echo "⚠️  Not logged in to Vercel. Run: vercel login"
  exit 1
fi

echo "📦 Building frontend..."
npm run build

echo ""
echo "🚀 Deploying frontend to production..."
vercel --prod --yes

if [ "$1" = "--both" ]; then
  echo ""
  echo "🚀 Deploying API (inventory-server) to production..."
  (cd inventory-server && vercel --prod --yes)
fi

echo ""
echo "✅ Deployment complete."
