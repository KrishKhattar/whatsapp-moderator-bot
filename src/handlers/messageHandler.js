import botConfig from "../config/botConfig.js";
import { commandHandler } from "./commandHandler.js";
import { addMessageToHistory } from "../utils/chathistory.js";
import { moderateMessage } from "../moderation/moderator.js";
import { increment } from "../utils/stats.js";

const isGroupMessage = (message) => message.from.endsWith("@g.us");

const messageHandler = async (client, message) => {
  if (isGroupMessage(message)) {
    increment(message.from, "messages_seen");
    const chat = await message.getChat();

    try {
      const actioned = await moderateMessage(client, chat, message);
      if (actioned) return; // flagged messages don't reach history or commands
    } catch (error) {
      // Moderation must never stop the bot from working.
      console.error("Moderation error:", error);
    }

    if (message.body && !message.body.startsWith(botConfig.prefix)) {
      addMessageToHistory(message.from, {
        authorId: message.author,
        name: message._data?.notifyName || null,
        body: message.body,
      });
    }
  }

  if (message.body?.startsWith(botConfig.prefix)) {
    await commandHandler(client, message);
  }
};

export default messageHandler;
