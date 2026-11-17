import { askGemini } from "../../utils/geminiconfig.js";

export default {
  name: "askGemini",
  aliases: ["ask"],
  category: "ai",
  description: "Ask a real question, get a real answer",
  usage: "<question>",
  requiresArgs: true,
  cooldown: { seconds: 15, scope: "user" },
  execute: async ({ args, reply }) => {
    const response = await askGemini(args.join(" "));
    await reply(response);
  },
};
