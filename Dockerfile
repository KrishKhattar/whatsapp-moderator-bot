# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim

# System Chromium for whatsapp-web.js (more reliable in containers than
# Puppeteer's downloaded Chrome) plus fonts so emoji and Indic scripts render.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        fonts-liberation \
        fonts-noto-color-emoji \
        fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    RUNNING_IN_DOCKER=true \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    DB_PATH=/app/data/bot.db

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Directories that hold state; mounted as volumes in docker-compose.yml.
RUN mkdir -p data .wwebjs_auth .wwebjs_cache && chown -R node:node /app
USER node

# Healthy = the watchdog confirmed a live WhatsApp connection in the last 3 minutes.
HEALTHCHECK --interval=60s --timeout=10s --start-period=5m --retries=3 \
    CMD node -e "const s=require('fs').statSync('/app/data/heartbeat');process.exit(Date.now()-s.mtimeMs<180000?0:1)"

CMD ["node", "src/bot.js"]
