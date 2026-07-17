# wa-transfer

CLI tool to generate and export WhatsApp Web session credentials using [Baileys](https://github.com/WhiskeySockets/Baileys).

## Setup

```bash
npm install
```

## Usage

```bash
npm start
```

Scan the QR code with your phone. Credentials will be saved to the `./creds/` folder.

## Important

**Never commit the `creds/` folder.** It contains sensitive authentication keys for your WhatsApp account.
