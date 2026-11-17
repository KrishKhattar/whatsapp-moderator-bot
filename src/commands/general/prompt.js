import { promptCommand } from "../../utils/geminiconfig.js";

export default {
  name: "prompt",
  category: "ai",
  description: "Talk to me. I *will* roast you.",
  usage: "<text>",
  requiresArgs: true,
  cooldown: { seconds: 15, scope: "user" },
  execute: async ({ args, reply }) => {
    const response = await promptCommand(args.join(" "));
    await reply(response);
  },
};
