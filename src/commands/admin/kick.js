import isAdmin from "../../utils/isAdmin.js";

const kick = async (client, message) => {
  const chat = await client.getChatById(message.from);
  const senderId = message.author || message.from;
  if (!chat.isGroup) return;

  const senderIsAdmin = await isAdmin(chat, senderId);

  if (!senderIsAdmin) {
    // If the sender is not an admin, return a message saying only admins can use this command
    await client.sendMessage(message.from, "Command available only to admins.");
    return;
  }

  const mentionedUsers = message.mentionedIds;
  for (let userId of mentionedUsers) {
    const isTargetAdmin = await isAdmin(chat, userId);
    if (isTargetAdmin) {
      await client.sendMessage(
        message.from,
        `@${userId.split("@")[0]} is an admin and cannot be removed.`,
        { mentions: [userId] }
      );
    } else {
      await chat.removeParticipants([userId]);
      await client.sendMessage(
        message.from,
        `@${userId.split("@")[0]} has been removed.`,
        { mentions: [userId] }
      );
    }
  }
};

export default kick;
