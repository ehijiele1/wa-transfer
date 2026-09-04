/**
 * WhatsApp pairing via PHONE NUMBER CODE (no QR scanning)
 * Uses the same LocalAuth config as src/services/whatsapp.ts
 * so the paired session is instantly recognized by the main app.
 *
 * Usage: node scripts/pair-code.js <international-number>
 *   e.g. node scripts/pair-code.js 2348024427735
 *
 * On your phone: WhatsApp > Settings > Linked Devices >
 *   Link a Device > "Link with phone number instead" > type the code
 */
const { Client, LocalAuth } = require('whatsapp-web.js');

const phone = process.argv[2];
if (!phone || !/^\d{8,15}$/.test(phone)) {
  console.error('Usage: node scripts/pair-code.js <international-number> (digits only, no +)');
  process.exit(1);
}

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'wa-transfer',
    dataPath: './wwebjs-auth',
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--user-data-dir=/tmp/chrome-profile',
      '--disable-crash-reporter',
      '--crash-dumps-dir=/tmp',
    ],
  },
});

let codeRequested = false;

// Clear stale Chromium profile locks from previous crashed runs
// (lock files embed the old container's hostname and block relaunch)
const fs = require('fs');
const path = require('path');
const sessionDir = path.join('./wwebjs-auth', 'session-wa-transfer');
for (const f of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
  try { fs.unlinkSync(path.join(sessionDir, f)); } catch (e) { /* absent */ }
}

client.on('qr', async () => {
  if (codeRequested) return;
  codeRequested = true;
  try {
    console.log('Requesting pairing code for +' + phone + '...');
    const code = await client.requestPairingCode(phone);
    const pretty = code.replace(/(.{4})/, '$1-');
    console.log('');
    console.log('================================================');
    console.log('  YOUR PAIRING CODE:  ' + pretty);
    console.log('================================================');
    console.log('On your phone:');
    console.log('  WhatsApp > Settings > Linked Devices >');
    console.log('  Link a Device > Link with phone number instead');
    console.log('  > type: ' + pretty);
    console.log('(code refreshes if it expires — just wait for a new one)');
    console.log('');
  } catch (e) {
    console.error('Failed to request pairing code:', e.message);
    process.exit(1);
  }
});

client.on('ready', () => {
  console.log('');
  console.log('✅ WHATSAPP CONNECTED! Session saved to ./wwebjs-auth');
  console.log('   You can close this and start the main application.');
  client.destroy().then(() => process.exit(0)).catch(() => process.exit(0));
});

client.on('auth_failure', (msg) => {
  console.error('❌ AUTH FAILED:', msg);
  process.exit(1);
});

client.initialize();

setTimeout(() => {
  console.error('⏱ TIMEOUT: not paired within 180s. Re-run to get a fresh code.');
  process.exit(1);
}, 180000).unref();
