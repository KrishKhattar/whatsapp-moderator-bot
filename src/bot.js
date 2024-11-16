import qrcode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";
import handleMessage from "./handlers/messageHandler.js";

const client = new Client({
  authStrategy: LocalAuth(),
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp bot is ready!");

  client.on("disconnected", (reason) => {
    console.log("Client disconnected:", reason);
  });

  const botUserId = client.info.wid._serialized;
  console.log("Bot user ID:", botUserId);
});

client.on("message", (message) => {
  handleMessage(client, message);
});

client.initialize();
