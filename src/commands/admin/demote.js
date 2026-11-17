import isAdmin, { isSameUser } from "../../utils/isAdmin.js";
import { tag } from "../../utils/mentionUser.js";

export default {
  name: "demote",
  category: "admin",
  description: "Take the crown back 😬",
  usage: "@user",
  adminOnly: true,
  groupOnly: true,
  requiresMention: true,
  execute: async ({ client, chat, message, reply }) => {
    const botId = client.info.wid._serialized;

    for (const userId of message.mentionedIds) {
      if (await isSameUser(client, userId, botId)) {
        await reply("Nice try. ¯\\_(ツ)_/¯");
      } else if (!(await isAdmin(chat, userId))) {
        await reply(`${tag(userId)} is not an admin.`, { mentions: [userId] });
      } else {
        await chat.demoteParticipants([userId]);
        await reply(`${tag(userId)} has been demoted.`, { mentions: [userId] });
      }
    }
  },
};
