# Phase 0 Deployment Guide

This guide walks you through deploying **Phase 0 (Group Registration)** to the Oracle VM (`ubuntu@140.238.79.76`).

## Prerequisites

- SSH key in your `~/.ssh/` directory (e.g., `ssh-wa-transfer-backup.key`)
- Supabase project with credentials in `.env`
- Git remote configured (or local sync via scp)

## Quick Deploy

From your local PC:

```bash
# Default: ubuntu@140.238.79.76 with key at ~/.ssh/ssh-wa-transfer-backup.key
bash scripts/deploy-to-vm.sh
```

Or with custom values:

```bash
VM_HOST=ubuntu@140.238.79.76 \
SSH_KEY=~/.ssh/ssh-wa-transfer-backup.key \
APP_DIR=/home/ubuntu/wa-transfer \
bash scripts/deploy-to-vm.sh
```

## What the Script Does

1. ✅ Verifies SSH key exists
2. ✅ Tests SSH connection to VM
3. ✅ Verifies app directory exists
4. ✅ SSHes into VM and:
   - Pulls latest code (git pull --rebase)
   - Runs `npm install`
   - Runs `npm run typecheck`
   - Runs `npm run build`
   - Runs unit tests (groupManager)

## Manual Steps After Deployment

### 1. Apply the Supabase Migration

You have two options:

**Option A: Supabase Dashboard (easiest)**
1. Open https://app.supabase.com → your project
2. Go to SQL Editor
3. Paste the contents of `supabase/migrations/20260903000000_monitored_groups.sql`
4. Click "Run"

**Option B: psql command line**
```bash
ssh -i ~/.ssh/ssh-wa-transfer-backup.key ubuntu@140.238.79.76
psql "$SUPABASE_DB_URL" -f /home/ubuntu/wa-transfer/supabase/migrations/20260903000000_monitored_groups.sql
```

### 2. Restart the App

The app is typically managed by `pm2` or `docker-compose` on the VM.

**If using pm2:**
```bash
ssh -i ~/.ssh/ssh-wa-transfer-backup.key ubuntu@140.238.79.76
pm2 restart wa-transfer
pm2 logs wa-transfer
```

**If using Docker:**
```bash
ssh -i ~/.ssh/ssh-wa-transfer-backup.key ubuntu@140.238.79.76
cd /home/ubuntu/wa-transfer
docker-compose restart wa-transfer
docker-compose logs -f wa-transfer
```

### 3. Test the End-to-End Flow

1. **Send trigger message:**
   - Open WhatsApp on your phone
   - Go to a test group
   - Send the exact message: `WATM Good Afternoon`
   - **Expected:** Bot stays silent (no reply)

2. **Verify registration on VM:**
   ```bash
   ssh -i ~/.ssh/ssh-wa-transfer-backup.key ubuntu@140.238.79.76
   cd /home/ubuntu/wa-transfer
   npm run groups:list
   ```
   - **Expected:** Group appears in the list

3. **Verify processing:**
   - Send any normal message in the registered group
   - Check logs: `pm2 logs wa-transfer` or `docker-compose logs -f wa-transfer`
   - **Expected:** Message is processed (logged with "Property detected" or similar)

4. **Verify unmonitored groups are ignored:**
   - Send a message in a group that was NOT registered
   - Check logs
   - **Expected:** Log message: `Ignoring message from non-monitored group`

## Test Cases Checklist

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 1 | Send "WATM Good Afternoon" in a new group | Group appears in `npm run groups:list` | ⬜ |
| 2 | Send same message again in same group | Still 1 entry (idempotent) | ⬜ |
| 3 | Send "watm good afternoon" (lowercase) | Group registered (case-insensitive) | ⬜ |
| 4 | Send "  WATM Good Afternoon  " (extra spaces) | Group registered (whitespace trimmed) | ⬜ |
| 5 | Send "Hello WATM Good Afternoon" (extra text) | Group NOT registered (exact match only) | ⬜ |
| 6 | Send regular message in registered group | Message processed | ⬜ |
| 7 | Send regular message in unregistered group | Message skipped, log shows "Ignoring..." | ⬜ |
| 8 | Run `npm run groups:unregister -- <id>` | Group marked inactive | ⬜ |
| 9 | Restart the app | Groups still in DB (persistence) | ⬜ |
| 10 | Health check: `curl http://localhost:3001/health` | Returns healthy | ⬜ |

## Troubleshooting

### SSH Connection Fails
```bash
# Verify key permissions (must be 600)
chmod 600 ~/.ssh/ssh-wa-transfer-backup.key

# Test connection
ssh -i ~/.ssh/ssh-wa-transfer-backup.key -v ubuntu@140.238.79.76
```

### Build Fails on VM
```bash
ssh -i ~/.ssh/ssh-wa-transfer-backup.key ubuntu@140.238.79.76
cd /home/ubuntu/wa-transfer
npm run typecheck
npm run build
```

### Group Not Being Registered
1. Check logs: `pm2 logs wa-transfer` or `docker-compose logs -f wa-transfer`
2. Look for: "WATM trigger received" or "Failed to register group"
3. Verify Supabase migration was applied:
   ```sql
   SELECT * FROM monitored_groups;
   ```
4. Verify RLS policies allow anon to write:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'monitored_groups';
   ```

### Group Registered But Messages Not Processed
1. Check the cache: `npm run groups:list` (should show the group)
2. Restart the app to force cache reload
3. Check MessageProcessingJob logs for "skipping non-monitored group"

## Rollback

If Phase 0 causes issues:

```bash
ssh -i ~/.ssh/ssh-wa-transfer-backup.key ubuntu@140.238.79.76
cd /home/ubuntu/wa-transfer

# Option 1: Revert code
git revert HEAD
npm run build
pm2 restart wa-transfer

# Option 2: Disable group filtering (keep code, but skip check)
# Edit src/services/whatsapp.ts and comment out the group check
```

## Next Steps After Phase 0 Verification

1. Run for 1 week in production
2. Monitor logs for any errors
3. Start Phase 1: Multi-Layer Product Filters
4. See `MASTER_DOCUMENTATION.md` Section 8 for the full roadmap
