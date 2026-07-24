import { Client, LocalAuth } from 'whatsapp-web.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'wa-transfer',
    dataPath: './wwebjs-auth',
  }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  },
});

client.on('ready', () => {
  console.log('READY - Session auto-loaded, no QR needed!');
  client.destroy().then(() => process.exit(0));
});

client.on('qr', () => {
  console.log('QR generated - session not found, would need scan');
  client.destroy().then(() => process.exit(0));
});

client.on('auth_failure', (msg) => {
  console.log('Auth failure:', msg);
  process.exit(1);
});

client.on('disconnected', (reason) => {
  console.log('Disconnected:', reason);
  process.exit(1);
});

console.log('Initializing...');
await client.initialize();
