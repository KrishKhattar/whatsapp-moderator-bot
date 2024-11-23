import { getSummary } from "../../utils/geminiconfig.js";
import { getChatHistory } from "../../utils/chathistory.js";

const summarize = async (client, message) => {
  const chat = await client.getChatById(message.from);
  if (!chat.isGroup) return;

  const chatContent = getChatHistory(message.from)
    .map((msg) => `${msg.author}: ${msg.body}`)
    .join("\n");
  console.log(chatContent);

  try {
    const summary = await getSummary(chatContent);
    await client.sendMessage(message.from, summary);
  } catch (error) {
    console.error("Error generating summary:", error);
    await client.sendMessage(
      message.from,
      "Sorry, I couldn't generate a summary at this time."
    );
  }
};

export default summarize;
