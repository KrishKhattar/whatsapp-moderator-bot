import isAdmin from "../../utils/isAdmin.js";

const kick = async (client, message) => {
  const chat = await client.getChatById(message.from);
  if (!chat.isGroup) return;

  const mentionedUsers = message.mentionedIds;
  for (let userId of mentionedUsers) {
    const isTargetAdmin = await isAdmin(chat, userId);
    if (isTargetAdmin) {
      await client.sendMessage(
        message.reply,
        `@${userId.split("@")[0]} is an admin and cannot be removed.`,
        { mentions: [userId] }
      );
    } else {
      await chat.removeParticipants([userId]);
      await client.sendMessage(
        message.reply,
        `@${userId.split("@")[0]} has been removed.`,
        { mentions: [userId] }
      );
    }
  }
};

export default kick;
