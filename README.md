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

## Deploy

### Docker (Recommended)

Build and run with Docker Compose:

```bash
# Build the image
docker-compose build

# Run interactively to scan QR code
docker-compose run --rm wa-transfer
```

Or with plain Docker:

```bash
docker build -t wa-transfer .
docker run -it --rm -v $(pwd)/creds:/app/creds wa-transfer
```

## Important

**Never commit the `creds/` folder.** It contains sensitive authentication keys for your WhatsApp account.
