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

  const seen = new Set();
  let attempts = 0;

  async function fetchGroups() {
    try {
      const chats = await client.getChats();
      const groups = chats.filter(c => c.isGroup);
      if (groups.length === 0) {
        console.log('No groups found.');
      } else {
        console.log(`Found ${groups.length} groups:\n`);
        for (const g of groups) {
          const line = `${g.name}: ${g.id._serialized}`;
          console.log(line);
          seen.add(g.id._serialized);
        }
      }
      return true;
    } catch (err) {
      attempts++;
      console.log(`Attempt ${attempts} failed: ${err.message}`);
      if (attempts < 3) {
        console.log('Retrying in 5s...');
        await new Promise(r => setTimeout(r, 5000));
        return false;
      }
      return null;
    }
  }

  let result = await fetchGroups();
  if (result === null) {
    console.log('\nAll attempts failed. Listening for incoming messages instead...\n');
    client.on('message_create', (msg) => {
      if (msg.from.endsWith('@g.us') && !seen.has(msg.from)) {
        seen.add(msg.from);
        console.log(`${msg._data?.notifyName || msg.from}: ${msg.from}`);
      }
    });
    await new Promise(r => setTimeout(r, 30000));
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
