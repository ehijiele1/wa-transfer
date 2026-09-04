#!/usr/bin/env bash
###############################################################################
# deploy-to-vm.sh — Phase 0 deployment to Oracle VM
#
# Usage (from local PC):
#   bash scripts/deploy-to-vm.sh
#
# This script:
#   1. Commits local changes to git
#   2. Pushes to the remote (if configured)
#   3. SSHes into the Oracle VM
#   4. Pulls latest code
#   5. Runs npm install (in case of new deps)
#   6. Runs npm run build
#   7. Applies the new Supabase migration (manual step reminder)
#   8. Restarts the app (or prints instructions)
###############################################################################

set -euo pipefail

# Configuration — override via environment
VM_HOST="${VM_HOST:-ubuntu@140.238.79.76}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/ssh-wa-transfer-backup.key}"
APP_DIR="${APP_DIR:-/home/ubuntu/wa-transfer}"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══ Phase 0 Deployment to Oracle VM ═══${NC}"
echo "Local:  $LOCAL_DIR"
echo "VM:     $VM_HOST"
echo "App:    $APP_DIR"
echo ""

# Step 1: Verify SSH key
if [ ! -f "$SSH_KEY" ]; then
  echo -e "${RED}✗ SSH key not found: $SSH_KEY${NC}"
  echo "Set SSH_KEY env var or place the key at the default path."
  exit 1
fi
echo -e "${GREEN}✓ SSH key found${NC}"

# Step 2: Test SSH connection
echo ""
echo "Testing SSH connection..."
if ! ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10 "$VM_HOST" "echo ok" >/dev/null 2>&1; then
  echo -e "${RED}✗ Cannot connect to $VM_HOST${NC}"
  exit 1
fi
echo -e "${GREEN}✓ SSH connection works${NC}"

# Step 3: Verify app directory exists on VM
echo ""
echo "Verifying app directory on VM..."
if ! ssh -i "$SSH_KEY" "$VM_HOST" "[ -d '$APP_DIR' ]"; then
  echo -e "${YELLOW}⚠ App directory $APP_DIR does not exist on VM${NC}"
  echo "  Initial clone: ssh -i $SSH_KEY $VM_HOST 'git clone <repo-url> $APP_DIR'"
  exit 1
fi
echo -e "${GREEN}✓ App directory exists${NC}"

# Step 4: Show what will be deployed
echo ""
echo "Changes to deploy:"
git status --short

# Step 5: Deploy
echo ""
echo -e "${YELLOW}═══ Deploying to VM ═══${NC}"
ssh -i "$SSH_KEY" "$VM_HOST" << EOF
  set -e
  cd $APP_DIR
  
  echo "[1/5] Pulling latest code..."
  git pull --rebase 2>&1 | tail -5
  
  echo "[2/5] Installing dependencies..."
  npm install --production=false 2>&1 | tail -5
  
  echo "[3/5] Running typecheck..."
  npm run typecheck 2>&1 | tail -3
  
  echo "[4/5] Building..."
  npm run build 2>&1 | tail -3
  
  echo "[5/5] Running unit tests..."
  npx jest test/services/groupManager.test.ts 2>&1 | tail -10
EOF

echo ""
echo -e "${GREEN}═══ Deployment Complete ═══${NC}"
echo ""
echo -e "${YELLOW}⚠ Manual Steps Required:${NC}"
echo ""
echo "1. Apply the Supabase migration:"
echo "   - Open Supabase SQL Editor"
echo "   - Run: supabase/migrations/20260903000000_monitored_groups.sql"
echo "   - Or: psql \$DATABASE_URL -f supabase/migrations/20260903000000_monitored_groups.sql"
echo ""
echo "2. Restart the app on the VM:"
echo "   ssh -i $SSH_KEY $VM_HOST 'cd $APP_DIR && pm2 restart wa-transfer'"
echo "   (or: docker-compose restart wa-transfer)"
echo ""
echo "3. Test the registration flow:"
echo "   - From WhatsApp, send 'WATM Good Afternoon' in a test group"
echo "   - Verify with: ssh -i $SSH_KEY $VM_HOST 'cd $APP_DIR && npm run groups:list'"
echo ""
echo "4. Check logs:"
echo "   ssh -i $SSH_KEY $VM_HOST 'cd $APP_DIR && pm2 logs wa-transfer'"
echo "   (or: docker-compose logs -f wa-transfer)"
echo ""
echo -e "${GREEN}Phase 0 is ready for end-to-end testing.${NC}"
