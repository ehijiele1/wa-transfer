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

  await new Promise(r => setTimeout(r, 10000));

  const seen = new Set();

  try {
    const items = await client.pupPage.evaluate(() => {
      try {
        return window.Store.Chat.getModelsArray().filter(c => c.isGroup).map(g => ({
          name: g.name,
          id: g.id._serialized,
        }));
      } catch (e) {
        try {
          const chats = window.Store.Chat.models;
          return chats.filter(c => c.isGroup).map(g => ({
            name: g.name,
            id: g.id._serialized,
          }));
        } catch (e2) {
          return null;
        }
      }
    });
    if (items && items.length > 0) {
      console.log('Found ' + items.length + ' groups:\n');
      for (const g of items) {
        console.log(g.name + ': ' + g.id);
        seen.add(g.id);
      }
    } else {
      console.log('Store not available, trying getChats...');
      const chats = await client.getChats();
      const groups = chats.filter(c => c.isGroup);
      if (groups.length > 0) {
        console.log('Found ' + groups.length + ' groups:\n');
        for (const g of groups) {
          console.log(g.name + ': ' + g.id._serialized);
          seen.add(g.id._serialized);
        }
      } else {
        console.log('No groups found via API');
      }
    }
  } catch (err) {
    console.log('API error: ' + err.message);
    console.log('Listening for messages to discover groups...');
    const handler = (msg) => {
      if (msg.from.endsWith('@g.us') && !seen.has(msg.from)) {
        seen.add(msg.from);
        console.log((msg._data ? msg._data.notifyName : msg.from) + ': ' + msg.from);
      }
    };
    client.on('message_create', handler);
    await new Promise(r => setTimeout(r, 20000));
    client.removeListener('message_create', handler);
    if (seen.size === 0) {
      console.log('No groups found via messages');
    }
  }

  console.log('\nDone. Total groups found: ' + seen.size);
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
