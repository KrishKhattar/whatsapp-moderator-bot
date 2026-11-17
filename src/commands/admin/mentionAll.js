import { tag } from "../../utils/mentionUser.js";

export default {
  name: "mentionAll",
  aliases: ["everyone", "all"],
  category: "admin",
  description: "Wake up the entire group (use responsibly)",
  adminOnly: true,
  groupOnly: true,
  cooldown: { seconds: 120, scope: "group" },
  execute: async ({ chat, reply }) => {
    const mentions = chat.participants.map((p) => p.id._serialized);
    const sent = await reply(mentions.map(tag).join(" "), { mentions });

    // Everyone gets the notification; the wall of tags disappears.
    setTimeout(() => {
      sent?.delete(true).catch((error) =>
        console.warn("Could not delete mentionAll message:", error.message)
      );
    }, 1000);
  },
};
