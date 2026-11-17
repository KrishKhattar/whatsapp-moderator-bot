import { getSummary } from "../../utils/geminiconfig.js";
import { getChatHistory, clearChatHistory } from "../../utils/chathistory.js";
import resolveUserMentions, { handleFor } from "../../utils/mentionUser.js";

export default {
  name: "summarize",
  aliases: ["tldr"],
  category: "ai",
  description: "Missed 300 messages? I read them so you don't have to",
  groupOnly: true,
  cooldown: { seconds: 60, scope: "group" },
  execute: async ({ chat, reply }) => {
    const groupId = chat.id._serialized;
    const chatHistory = getChatHistory(groupId);
    if (chatHistory.length === 0) {
      await reply("Nothing to summarize yet. Y'all have been suspiciously quiet. 🤨");
      return;
    }

    // Each person is referred to by a short handle ("@919876543210") that we can
    // map back to their exact WhatsApp id after the AI responds.
    const handleToId = new Map();
    const transcript = chatHistory
      .map(({ authorId, name, body }) => {
        const handle = handleFor(authorId);
        handleToId.set(handle, authorId);
        return name ? `@${handle} (${name}): ${body}` : `@${handle}: ${body}`;
      })
      .join("\n");

    const summary = await getSummary(transcript);
    const { text, mentions } = resolveUserMentions(summary, handleToId);

    await reply(text, { mentions });
    clearChatHistory(groupId);
  },
};
