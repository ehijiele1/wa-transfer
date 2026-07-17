FROM node:18-slim

WORKDIR /app

# Install any system dependencies required by native modules (e.g. sharp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Ensure creds directory exists for volume mounting
RUN mkdir -p /app/creds

CMD ["node", "get-session.js"]
