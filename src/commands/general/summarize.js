import { getSummary } from "../../utils/geminiconfig.js";
import { getChatHistory, clearChatHistory } from "../../utils/chathistory.js";
import resolveUserMentions from "../../utils/mentionUser.js";

const summarize = async (client, message) => {
  const chat = await client.getChatById(message.from);
  if (!chat.isGroup) return;

  const chatHistory = getChatHistory(message.from);

  const chatContent = chatHistory
    .map((msg) => `${msg.author}: ${msg.body}`)
    .join("\n");
  console.log(chatContent);

  try {
    const summary = await getSummary(chatContent);

    const updatedSummary = await resolveUserMentions(client, chat, summary);

    await client.sendMessage(message.from, updatedSummary);

    clearChatHistory(message.from);
  } catch (error) {
    console.error("Error generating summary:", error);
    await client.sendMessage(
      message.from,
      "Sorry, I couldn't generate a summary at this time."
    );
  }
};

export default summarize;
