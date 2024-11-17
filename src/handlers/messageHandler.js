import { commandHandler } from "./commandHandler.js";
import isUserSpamming from "../utils/spamDetector.js";

const messageHandler = async (client, message) => {
  if (message.body.startsWith("!")) {
    await commandHandler(client, message);
  }

  const spamCheck = isUserSpamming(client, message);

  if (spamCheck.isSpam) {
    await client.sendMessage(
      message.from,
      `Your message was flagged as spam: ${spamCheck.reason}`
    );
    //await client.deleteMessages(message.from, [message.id]); // Deletes the spammy message
    return;
  }
};

export default messageHandler;
