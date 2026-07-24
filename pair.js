const { Client, LocalAuth } = require('whatsapp-web.js');
const http = require('http');
const qrcode = require('qrcode');
const path = require('path');

const PORT = 3003;
const CREDS_DIR = path.resolve(__dirname, 'wwebjs-auth');

let qrHTML = '';
let connected = false;
let code = '';

const PAGE = () => `<!DOCTYPE html>
<html><head><title>WhatsApp Pairing</title>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="2">
<style>
  *{margin:0;padding:0;box-sizing:border-box;background:#111;color:#eee;font-family:-apple-system,sans-serif}
  body{display:flex;justify-content:center;align-items:center;min-height:100vh}
  .c{text-align:center;padding:20px;max-width:500px}
  h2{color:#25D366;margin-bottom:24px}
  .ok{color:#25D366;font-weight:bold;font-size:28px;margin:40px 0}
  img{border-radius:12px;background:white;padding:16px;max-width:100%;margin:20px 0}
  p{color:#aaa;margin-top:20px;font-size:14px}
</style></head><body><div class="c">
<h2>WhatsApp Web Pairing</h2>
${connected ? '<div class="ok">Connected!</div><p>Device linked successfully</p>' : qrHTML ? `<img src="${qrHTML}" alt="QR"><p>Scan with WhatsApp</p><p>Three dots (or Settings) → Linked Devices → Link a Device</p>` : '<p>Starting WhatsApp...</p>'}
</div></body></html>`;

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'wa-transfer', dataPath: CREDS_DIR }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  },
});

client.on('qr', async (qr) => {
  code = qr;
  try {
    qrHTML = await qrcode.toDataURL(qr, { width: 400, margin: 2 });
    console.log('QR ready - scan at http://localhost:' + PORT);
  } catch (e) {
    console.error('QR error:', e.message);
  }
});

client.on('authenticated', () => console.log('Authenticated!'));
client.on('ready', () => { connected = true; console.log('SUCCESS! Connected.'); });
client.on('auth_failure', (m) => console.error('Auth failure:', m));
client.on('disconnected', (r) => console.log('Disconnected:', r));

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(PAGE());
}).listen(PORT, '0.0.0.0', () => console.log('Server: http://0.0.0.0:' + PORT));

console.log('Initializing WhatsApp...');
client.initialize();
