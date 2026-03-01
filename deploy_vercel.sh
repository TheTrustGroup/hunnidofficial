#!/bin/bash
# Deploy to Vercel: frontend (warehouse-pos) and optionally API (inventory-server).
# Usage:
#   ./deploy_vercel.sh           # frontend only
#   ./deploy_vercel.sh --both    # frontend then API
#
# Safeguard: set VERCEL_PROJECT_NAME to your intended project (e.g. hunnidofficial-mb6h)
# to abort if this directory is linked to a different project. See docs/VERCEL_LINK.md.

set -e
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

if ! vercel whoami &>/dev/null; then
  echo "⚠️  Not logged in to Vercel. Run: vercel login"
  exit 1
fi

# Safeguard: show linked project and optionally enforce expected project name
if [ -f .vercel/project.json ]; then
  LINKED_NAME=$(sed -n 's/.*"projectName":"\([^"]*\)".*/\1/p' .vercel/project.json 2>/dev/null || true)
  if [ -n "$LINKED_NAME" ]; then
    echo "📌 Linked Vercel project: $LINKED_NAME"
    if [ -n "${VERCEL_PROJECT_NAME:-}" ] && [ "$LINKED_NAME" != "$VERCEL_PROJECT_NAME" ]; then
      echo "❌ Expected project: $VERCEL_PROJECT_NAME. Run: vercel link (then select the correct project)"
      echo "   To deploy anyway, unset VERCEL_PROJECT_NAME or run vercel --prod manually."
      exit 1
    fi
  fi
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
