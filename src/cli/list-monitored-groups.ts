/**
 * CLI: List Monitored Groups
 *
 * Usage:
 *   npm run groups:list                # All groups
 *   npm run groups:list -- --active    # Only active groups
 *   npm run groups:list -- --json      # Output as JSON
 *   npm run groups:list -- --unregister <group_id>   # Unregister a group
 *
 * Phase 0 — Silent registration only.
 */

import { groupManager, MonitoredGroup } from '../services/groupManager';
import { logger } from '../utils/logger';

interface CliOptions {
  activeOnly: boolean;
  json: boolean;
  unregister: string | null;
  help: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    activeOnly: false,
    json: false,
    unregister: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    switch (arg) {
      case '--active':
        opts.activeOnly = true;
        break;
      case '--json':
        opts.json = true;
        break;
      case '--unregister':
        if (i + 1 < args.length) {
          const next = args[i + 1];
          if (next !== undefined) {
            opts.unregister = next;
          }
          i++;
        }
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
    }
  }

  return opts;
}

function printHelp(): void {
  console.log(`
wa-transfer Group Manager CLI
=============================

USAGE:
  npm run groups:list [options]

OPTIONS:
  --active              Show only active groups
  --json                Output as JSON
  --unregister <id>     Unregister a group (mark as inactive)
  --help, -h            Show this help

EXAMPLES:
  npm run groups:list
  npm run groups:list -- --active
  npm run groups:list -- --json
  npm run groups:list -- --unregister 120363@g.us

REGISTRATION:
  Send "WATM Good Afternoon" in any WhatsApp group to register it.
  The bot will NOT reply in the group (silent registration).
  Unregistration is done via this CLI or the future dashboard.
`);
}

function formatGroup(g: MonitoredGroup): string {
  const status = g.is_active ? '✅ ACTIVE  ' : '⏸️  INACTIVE';
  const lastSeen = g.last_seen_message_at
    ? new Date(g.last_seen_message_at).toLocaleString()
    : 'never';
  const registered = new Date(g.registered_at).toLocaleString();

  return `${status}  ${g.group_name || '(unnamed)'}  [${g.group_id}]
    Registered:  ${registered}
    Last seen:   ${lastSeen}
    Msg count:   ${g.message_count}
    Registered by: ${g.registered_by || 'unknown'}
`;
}

async function main(): Promise<void> {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.unregister) {
    const ok = await groupManager.unregisterGroup(opts.unregister);
    if (ok) {
      console.log(`✅ Unregistered group: ${opts.unregister}`);
    } else {
      console.error(`❌ Failed to unregister group: ${opts.unregister}`);
      process.exit(1);
    }
    process.exit(0);
  }

  let groups: MonitoredGroup[];
  if (opts.activeOnly) {
    groups = await groupManager.getActiveGroups();
  } else {
    groups = await groupManager.getAllGroups();
  }

  if (opts.json) {
    console.log(JSON.stringify(groups, null, 2));
    process.exit(0);
  }

  console.log(`\n📋 Monitored WhatsApp Groups (${groups.length})\n`);
  if (groups.length === 0) {
    console.log('  No groups registered yet.');
    console.log('  Send "WATM Good Afternoon" in a group to register it.\n');
  } else {
    for (const g of groups) {
      console.log(formatGroup(g));
    }
  }

  process.exit(0);
}

main().catch((err) => {
  logger.error('CLI error', err as Error);
  console.error('❌ Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
