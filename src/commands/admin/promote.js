import isAdmin, { isSameUser } from "../../utils/isAdmin.js";
import { tag } from "../../utils/mentionUser.js";

export default {
  name: "promote",
  category: "admin",
  description: "Hand someone the crown",
  usage: "@user",
  adminOnly: true,
  groupOnly: true,
  requiresMention: true,
  execute: async ({ client, chat, message, reply }) => {
    const botId = client.info.wid._serialized;

    for (const userId of message.mentionedIds) {
      if (await isSameUser(client, userId, botId)) {
        await reply("I'm already the main character. ¯\\_(ツ)_/¯");
      } else if (await isAdmin(chat, userId)) {
        await reply(`${tag(userId)} is already an admin.`, { mentions: [userId] });
      } else {
        await chat.promoteParticipants([userId]);
        await reply(`${tag(userId)} has been promoted to admin. 👑`, {
          mentions: [userId],
        });
      }
    }
  },
};
