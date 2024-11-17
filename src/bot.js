import qrcode from "qrcode-terminal";
import whatsappWeb from "whatsapp-web.js";
import handleMessage from "./handlers/messageHandler.js";

const { Client, LocalAuth } = whatsappWeb;
const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp bot is ready!");

  const botUserId = client.info.wid._serialized;
  console.log("Bot user ID:", botUserId);
});

client.on("disconnected", (reason) => {
  console.log("Client disconnected:", reason);
});

client.on("call", (call) => {
  console.log("Incoming Call: ", call);
  call.reject;
});

client.on("message", (message) => {
  handleMessage(client, message);
});

client.initialize();
