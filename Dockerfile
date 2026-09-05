# Multi-stage build for production
FROM node:22-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    libgbm1 \
    libxkbcommon0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Stage: Build dependencies
FROM base AS deps
ENV PUPPETEER_CACHE_DIR=/app/.puppeteer-cache
COPY package*.json ./
# Skip lifecycle scripts: no src/ yet so prepare-build would fail;
# Chromium is downloaded explicitly instead of via postinstall.
RUN npm ci --ignore-scripts \
    && npx puppeteer browsers install chrome@146.0.7680.31

# Stage: Build application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.puppeteer-cache /app/.puppeteer-cache
COPY . .

# Build the application
RUN npm run build

# Create directories and set permissions
RUN mkdir -p /app/wwebjs-auth /app/logs /app/data && \
    chown -R appuser:appuser /app

# Stage: Production
FROM base AS production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.puppeteer-cache /app/.puppeteer-cache

# Copy configuration files (not secrets)
COPY --chown=appuser:appuser docker/config ./config
COPY --chown=appuser:appuser docker/entrypoint.sh /app/entrypoint.sh

# Create necessary directories
RUN mkdir -p /app/wwebjs-auth /app/logs /app/data && \
    chown -R appuser:appuser /app && \
    chmod +x /app/entrypoint.sh

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Expose health check port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HEALTH_PORT=3001
ENV PUPPETEER_CACHE_DIR=/app/.puppeteer-cache

# Run the application
CMD ["/app/entrypoint.sh"]