const { Client, LocalAuth } = require('whatsapp-web.js');

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

client.on('ready', async () => {
  console.log('Connected. Fetching groups...\n');
  const chats = await client.getChats();
  const groups = chats.filter(c => c.isGroup);

  if (groups.length === 0) {
    console.log('No groups found in this account.');
    process.exit(0);
  }

  console.log(`Found ${groups.length} groups:\n`);

  for (const g of groups) {
    const info = `${g.name}: ${g.id._serialized}`;
    console.log(info);
  }

  console.log('\nDone.');
  await client.destroy();
  process.exit(0);
});

client.on('auth_failure', (msg) => {
  console.error('Auth failure:', msg);
  process.exit(1);
});

client.on('disconnected', (reason) => {
  console.error('Disconnected:', reason);
  process.exit(1);
});

client.initialize();
