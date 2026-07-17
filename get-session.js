const { useMultiFileAuthState, makeWASocket } = require('baileys');
const fs = require('fs');
const path = require('path');

const CREDS_DIR = path.resolve(__dirname, 'creds');
const TIMEOUT_MS = 60000;

async function main() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(CREDS_DIR);

    const sock = makeWASocket({ auth: state });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;

      console.log('Status:', connection);

      if (connection === 'open') {
        console.log('\n✅ Connected! Waiting for creds to save...');

        // Wait a few seconds for creds to be saved
        setTimeout(() => {
          try {
            const files = fs.readdirSync(CREDS_DIR);
            console.log('\nFiles in creds folder:');
            files.forEach((f) => console.log('  - ' + f));
            console.log('\nCopy these files to your phone!');
          } catch (err) {
            console.error('Failed to read creds directory:', err.message);
          }
          process.exit(0);
        }, 3000);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== 401;
        console.log(`Connection closed. Status: ${statusCode}. Reconnect? ${shouldReconnect}`);
        process.exit(1);
      }
    });

    // Run for 60 seconds
    setTimeout(() => {
      console.log('⏰ Time up!');
      process.exit(0);
    }, TIMEOUT_MS);
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main().catch(console.error);
