import { promptCommand } from "../../utils/geminiconfig.js";

const prompt = async (client, message) => {
  try {
    const userPrompt = message.body.slice(message.body.indexOf(" ") + 1).trim();
    const response = await promptCommand(userPrompt);
    await client.sendMessage(message.from, response);
  } catch (error) {
    console.error("Error handling prompt command:", error);
    await client.sendMessage(
      message.from,
      "There was an error processing your prompt."
    );
  }
};

export default prompt;
