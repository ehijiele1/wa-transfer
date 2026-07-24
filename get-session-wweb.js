const { Client, LocalAuth } = require('whatsapp-web.js');
const http = require('http');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const PORT = 3003;
const CREDS_DIR = path.resolve(__dirname, 'wwebjs-auth');

let qrHTML = null;
let connected = false;
let clientReady = false;

const PAGE = () => `<!DOCTYPE html>
<html><head><title>WhatsApp Web Pairing</title>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="2">
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
<h2>WhatsApp Web Pairing</h2>
${connected ? '<div class="s ok">Connected!</div><p>Device linked successfully</p>' : qrHTML || '<div class="s">Starting WhatsApp Web...</div>'}
${connected ? '' : '<p>Open WhatsApp on your phone</p><div class="st">Three dots (or Settings) &rarr; Linked Devices &rarr; Link a Device</div><div class="st">Point camera at the QR code above</div>'}
</div></body></html>`;

async function main() {
  fs.mkdirSync(CREDS_DIR, { recursive: true });

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'wa-transfer', dataPath: CREDS_DIR }),
    puppeteer: {
      executablePath: puppeteer.executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      headless: true,
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnectteam/wa-version/main/html/2.3000.1019707846.html',
    },
  });

  client.on('qr', async (qr) => {
    try {
      const dataUrl = await qrcode.toDataURL(qr, { width: 400, margin: 2 });
      qrHTML = `<img src="${dataUrl}" alt="QR">`;
      console.log('\nQR CODE READY — scan with WhatsApp');
      console.log('Web: http://localhost:' + PORT);
      if (!clientReady) {
        console.log('(or use tunnel URL if available)\n');
      }
    } catch (e) {
      console.error('QR error:', e.message);
    }
  });

  client.on('ready', () => {
    connected = true;
    clientReady = true;
    console.log('\nSUCCESS! WhatsApp connected.');
    setTimeout(() => process.exit(0), 5000);
  });

  client.on('authenticated', () => {
    console.log('Authenticated!');
  });

  client.on('auth_failure', (msg) => {
    console.error('Auth failure:', msg);
  });

  client.on('disconnected', (reason) => {
    console.log('Disconnected:', reason);
    if (!connected) {
      console.log('Will restart...');
    }
  });

  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(PAGE());
  }).listen(PORT, '0.0.0.0', () => console.log('Server: http://0.0.0.0:' + PORT));

  console.log('Starting WhatsApp Web client...');
  await client.initialize();
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
