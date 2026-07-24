const { useMultiFileAuthState, makeWASocket, Browsers } = require('@whiskeysockets/baileys');
const http = require('http');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const qrcodeTerminal = require('qrcode-terminal');

process.env.BAILEYS_LOG_LEVEL = 'silent';
const CREDS_DIR = path.resolve(__dirname, 'creds');
const TIMEOUT_MS = 600000;
const PORT = 3003;
const PHONE_NUMBER = '2348024427735';

let qrHTML = null;
let connected = false;

const PAGE = () => `<!DOCTYPE html>
<html><head><title>WhatsApp Pairing</title>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="3">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{display:flex;justify-content:center;align-items:center;min-height:100vh;
    background:#111;font-family:-apple-system,sans-serif;color:#eee}
  .c{text-align:center;padding:20px;max-width:500px}
  h2{color:#25D366;margin-bottom:24px}
  .s{color:#888;font-size:20px;margin:40px 0}
  .ok{color:#25D366;font-weight:bold;font-size:28px}
  img{border-radius:12px;background:white;padding:16px;max-width:100%}
  p{color:#aaa;margin-top:20px;font-size:14px}
  .st{color:#777;font-size:13px;margin-top:6px}
</style></head><body><div class="c">
<h2>WhatsApp Pairing</h2>
${connected ? '<div class="s ok">Connected!</div><p>Device linked successfully</p>' : qrHTML || '<div class="s">Generating...</div>'}
${connected ? '' : '<p>Open WhatsApp</p><div class="st">Settings &rarr; Linked Devices &rarr; Link a Device</div><div class="st">Point camera at the QR code above</div>'}
</div></body></html>`;

async function tryPairingCode(sock) {
  try {
    console.log(`\n[${new Date().toISOString()}] Requesting pairing code for ${PHONE_NUMBER}...`);
    const code = await sock.requestPairingCode(PHONE_NUMBER);
    const formatted = code.match(/.{1,4}/g)?.join('-') || code;
    console.log('========================================');
    console.log('  PAIRING CODE:', formatted);
    console.log('========================================');
    console.log('  Open WhatsApp on your phone');
    console.log('  Settings > Linked Devices');
    console.log('  Tap "Link a Device"');
    console.log('  Then tap "Link with phone number"');
    console.log('  Enter this code:', formatted);
    console.log('========================================\n');
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Pairing code request failed: ${e.message}`);
    console.error('Full error:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
  }
}

async function main() {
  try {
    fs.mkdirSync(CREDS_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(CREDS_DIR);

    if (state.creds.registered) {
      console.log('Already registered, reconnecting...');
    }

    const sock = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('CHROME'),
      syncFullHistory: false,
      logger: {
        info() {},
        warn() {},
        error() {},
        trace() {},
        debug() {},
        fatal() {},
        child() { return this; },
        level: 'silent',
      },
    });

    sock.ev.on('creds.update', saveCreds);

    let qrCaptured = false;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (lastDisconnect?.error) {
        const e = lastDisconnect.error;
        console.log(`[${new Date().toISOString()}] ERROR:`, e.message);
        console.log('  statusCode:', e.output?.statusCode);
        if (e.data) console.log('  data:', JSON.stringify(e.data));
      }

      if (qr && !qrCaptured) {
        qrCaptured = true;
        try {
          const dataUrl = await qrcode.toDataURL(qr, { width: 400, margin: 2 });
          qrHTML = `<img src="${dataUrl}" alt="QR">`;
          console.log('');
          console.log('===========================================================');
          console.log('  QR CODE READY — SCAN WITH WHATSAPP');
          console.log('===========================================================');
          qrcodeTerminal.generate(qr, { small: true });
          console.log('===========================================================');
          console.log('');
          console.log('  Auto-trying pairing code in 30s...');

          setTimeout(() => {
            if (!connected) {
              tryPairingCode(sock);
            }
          }, 30000);
        } catch (e) { console.error('QR error:', e.message); }
      }

      if (connection === 'open') {
        connected = true;
        console.log('\nSUCCESS! WhatsApp connected.');
        console.log('Creds saved in:', CREDS_DIR);
        setTimeout(() => process.exit(0), 5000);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errorMsg = lastDisconnect?.error?.message || '';
        console.log(`Connection closed. Status: ${statusCode}, Error: ${errorMsg}`);
        if (statusCode === 401) {
          console.log('Logout (401). Delete creds and try again.');
          process.exit(1);
        }
        if (!connected && !qrCaptured) {
          console.log('Connection failed. Restart the script to retry.');
        }
      }
    });

    http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(PAGE());
    }).listen(PORT, '0.0.0.0', () => console.log('Server: http://0.0.0.0:' + PORT));

    setTimeout(() => {
      if (!connected) {
        console.log('\nTimeout. Process exiting.');
        process.exit(0);
      }
    }, TIMEOUT_MS);
  } catch (e) {
    console.error('Fatal error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}
main().catch(console.error);
