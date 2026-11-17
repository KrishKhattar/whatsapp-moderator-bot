import isAdmin, { isSameUser } from "../../utils/isAdmin.js";
import { tag } from "../../utils/mentionUser.js";

export default {
  name: "kick",
  aliases: ["remove"],
  category: "admin",
  description: "Yeet someone out of the group",
  usage: "@user",
  adminOnly: true,
  groupOnly: true,
  requiresMention: true,
  execute: async ({ client, chat, message, reply }) => {
    const botId = client.info.wid._serialized;

    for (const userId of message.mentionedIds) {
      if (await isSameUser(client, userId, botId)) {
        await reply("I'm not kicking myself. ¯\\_(ツ)_/¯");
      } else if (await isAdmin(chat, userId)) {
        await reply(`${tag(userId)} is an admin and cannot be removed.`, {
          mentions: [userId],
        });
      } else {
        await chat.removeParticipants([userId]);
        await reply(`${tag(userId)} has been removed. 👋`, { mentions: [userId] });
      }
    }
  },
};
