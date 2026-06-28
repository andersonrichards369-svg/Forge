#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# ForgeQuest — Deploy Script
# Manual deployment to a VPS/cloud server.
#
# Prerequisites:
#   1. Set the environment variables below or export them
#   2. Have rsync and ssh installed locally
#   3. SSH key added to the server
# ============================================================

# Config — override via environment variables
DEPLOY_HOST="${DEPLOY_HOST:-your-server.com}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/forgequest}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"

echo "╔═══════════════════════════════════════════════╗"
echo "║      ForgeQuest — Deploy Script               ║"
echo "╚═══════════════════════════════════════════════╝"

# 1. Build/Prepare
echo "→ Installing dependencies..."
npm ci --omit=dev

# 2. Create .env on deploy target
echo "→ Checking environment..."
if [ ! -f .env ]; then
  echo "  ⚠️  No .env found. Copy from .env.template: cp .env.template .env"
  echo "  ⚠️  Edit .env with your production values before deploying."
fi

# 3. Rsync to server
echo "→ Deploying to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}..."
rsync -avz --delete \
  -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='portal/public/uploads/*' \
  ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"

# 4. Install & Restart on remote
echo "→ Restarting server..."
ssh -i "${SSH_KEY}" "${DEPLOY_USER}@${DEPLOY_HOST}" << 'REMOTE'
  set -e
  cd /var/www/forgequest
  npm install --omit=dev
  pm2 restart forgequest 2>/dev/null || pm2 start server.js --name forgequest
  pm2 save
  echo "  ✅ Server restarted successfully"
REMOTE

echo ""
echo "✅ Deploy complete!"
echo "   Site:  https://${DEPLOY_HOST}"
echo "   Health: https://${DEPLOY_HOST}/api/health"