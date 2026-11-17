// Must be the first import: loads .env before any other module reads process.env.
import "dotenv/config";
import qrcode from "qrcode-terminal";
import whatsappWeb from "whatsapp-web.js";
import handleMessage from "./handlers/messageHandler.js";
import fs from "node:fs";
import path from "node:path";
import { closeDb } from "./db/index.js";
import { recordStartup } from "./utils/stats.js";

const { Client, LocalAuth } = whatsappWeb;

const IN_DOCKER = process.env.RUNNING_IN_DOCKER === "true";
const AUTH_PATH = ".wwebjs_auth";
const HEARTBEAT_FILE = path.join(path.dirname(process.env.DB_PATH || "data/bot.db"), "heartbeat");

// Chromium leaves Singleton* lock files in its profile. After a container
// restart they point at a process that no longer exists and Chromium refuses
// to start, so clear them. Safe because only one bot instance may run.
const clearStaleBrowserLocks = () => {
  const profileDir = path.join(AUTH_PATH, "session");
  for (const file of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
    try {
      fs.rmSync(path.join(profileDir, file), { force: true });
    } catch {}
  }
};
if (IN_DOCKER) clearStaleBrowserLocks();

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: AUTH_PATH }),
  puppeteer: {
    // In Docker we use the system Chromium (see Dockerfile).
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: IN_DOCKER
      ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      : [],
  },
});

client.on("loading_screen", (percent, message) => {
  console.log(`Loading WhatsApp Web: ${percent}% ${message}`);
});

client.on("authenticated", () => {
  console.log("Authenticated, waiting for ready...");
});

client.on("auth_failure", (msg) => {
  console.error("Authentication failed:", msg);
});

client.on("qr", (qr) => {
  console.log("Scan this QR code with WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp bot is ready!");

  const botUserId = client.info.wid._serialized;
  console.log("Bot user ID:", botUserId);
  startWatchdog();
});

// Exit on disconnect so the process manager (Docker's restart policy, pm2, …)
// starts a fresh instance instead of leaving a zombie bot running.
client.on("disconnected", async (reason) => {
  console.error("Client disconnected:", reason, "- exiting so it can be restarted.");
  try {
    await client.destroy();
  } catch {}
  closeDb();
  process.exit(1);
});

client.on("call", (call) => {
  console.log("Incoming Call: ", call);
  call.reject();
});

client.on("message", async (message) => {
  try {
    await handleMessage(client, message);
  } catch (err) {
    console.error("Error handling message:", err);
  }
});

// WhatsApp Web occasionally reloads its page (e.g. right after login or on an
// update), which destroys Puppeteer's execution context mid-call. Retry init
// instead of letting the rejection crash the process.
const initializeClient = async (attempt = 1) => {
  try {
    await client.initialize();
  } catch (err) {
    console.error(`Client initialize failed (attempt ${attempt}):`, err.message);
    if (attempt >= 5) {
      console.error("Giving up after 5 attempts.");
      process.exit(1);
    }
    try {
      await client.destroy();
    } catch {}
    setTimeout(() => initializeClient(attempt + 1), 5000);
  }
};

// Watchdog: every minute, check WhatsApp is still connected. Writes a heartbeat
// file for Docker's HEALTHCHECK, and exits after 3 failed checks in a row
// (e.g. the browser page crashed silently) so the bot gets restarted.
const WATCHDOG_INTERVAL_MS = 60_000;
const WATCHDOG_MAX_FAILURES = 3;
let watchdogStarted = false;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);

function startWatchdog() {
  if (watchdogStarted) return;
  watchdogStarted = true;
  let failures = 0;

  const check = async () => {
    try {
      const state = await withTimeout(client.getState(), 20_000);
      if (state !== "CONNECTED") throw new Error(`state is ${state}`);
      failures = 0;
      fs.writeFileSync(HEARTBEAT_FILE, new Date().toISOString());
    } catch (error) {
      failures += 1;
      console.warn(`Watchdog check failed (${failures}/${WATCHDOG_MAX_FAILURES}):`, error.message);
      if (failures >= WATCHDOG_MAX_FAILURES) {
        console.error("WhatsApp connection is unhealthy - exiting so it can be restarted.");
        closeDb();
        process.exit(1);
      }
    }
  };

  check();
  setInterval(check, WATCHDOG_INTERVAL_MS).unref();
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down...`);
  try {
    await client.destroy();
  } catch {}
  closeDb();
  process.exit(0);
};
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

recordStartup();
console.log("Starting WhatsApp client...");
initializeClient();
