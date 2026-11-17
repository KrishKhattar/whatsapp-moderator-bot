export default {
  name: "ping",
  category: "general",
  description: "Check if I'm alive (I am. Unfortunately.)",
  cooldown: { seconds: 5, scope: "user" },
  execute: async ({ reply }) => {
    await reply("Pong! 🏓");
  },
};
