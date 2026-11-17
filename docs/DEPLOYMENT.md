# Deploying to a VPS

This guide runs the bot 24/7 on a small Linux server using Docker Compose. Once it's set up, Docker restarts the bot automatically after crashes, disconnects and server reboots.

## 1. Pick a server

The bot runs a headless Chromium, so memory matters more than CPU.

| | Minimum | Recommended |
|---|---|---|
| RAM | 1 GB (with swap) | 2 GB |
| Disk | 10 GB | 20 GB |
| OS | Any Linux with Docker | Ubuntu 24.04 LTS |

Good options: Oracle Cloud Always Free (ARM), Hetzner, DigitalOcean, AWS Lightsail. The image works on both x86_64 and ARM64.

## 2. Install Docker

SSH into the server, then:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in so the group change applies
```

**On a 1 GB server, add swap** so Chromium doesn't get killed for running out of memory:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Configure

```bash
git clone https://github.com/KrishKhattar/whatsapp-moderator-bot.git
cd whatsapp-moderator-bot
cp .env.example .env
nano .env   # add GEMINI_API and SERPAPI_KEY
```

## 4. Start and link WhatsApp

> **Stop the bot on your own computer first.** If two copies are linked to the same number, every command gets answered twice.

```bash
docker compose up -d --build
docker compose logs -f
```

Wait for the QR code (about 20 seconds), then scan it in WhatsApp under **Settings → Linked devices → Link a device**. If the QR code looks broken, make the terminal window wider. Press `Ctrl+C` to stop following the logs; the bot keeps running.

After "WhatsApp bot is ready!", check the status:

```bash
docker compose ps   # STATUS should become "healthy" within a few minutes
```

The login is saved in a Docker volume, so you won't need to scan again after restarts or updates.

## How it stays up

| Situation | What happens |
|---|---|
| The bot crashes | `restart: unless-stopped` starts it again |
| The server reboots | Docker starts the bot on boot |
| WhatsApp disconnects | The bot exits on purpose and Docker restarts it |
| The browser page silently dies | A watchdog checks the connection every minute and exits after 3 failures, which triggers a restart |
| Chromium lock files left from a previous run | Cleared at startup |

The container's health status comes from the watchdog's heartbeat, so `healthy` means WhatsApp was confirmed connected in the last 3 minutes.

## Updating

```bash
git pull
docker compose up -d --build
```

## Useful commands

```bash
docker compose logs -f --tail 100   # follow recent logs
docker compose restart              # restart the bot
docker compose down                 # stop it (data is kept)
docker compose ps                   # status, health and uptime
```

## Backups

The database lives in the `bot-data` volume. To take a consistent backup while the bot is running:

```bash
docker compose exec bot node -e "require('better-sqlite3')('data/bot.db').backup('data/backup.db').then(() => console.log('Backup done'))"
docker compose cp bot:/app/data/backup.db ./backup-$(date +%F).db
```

## Troubleshooting

**Need to link a different number, or the login broke:** delete the saved session and scan again.

```bash
docker compose down
docker volume rm whatsapp-moderator-bot_wwebjs-auth
docker compose up -d && docker compose logs -f
```

**The container keeps restarting:** check `docker compose logs --tail 200`. The usual causes are a missing `GEMINI_API` key, or running out of memory on a 1 GB server without swap.

**Moderation isn't doing anything:** an admin has to send `!moderation on` in each group, and the bot needs to be a group admin to delete messages and remove users.
