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
  const botId = client.info.wid._serialized;
  const mentionedUsers = message.mentionedIds;

  if (mentionedUsers.length === 0) {
    await client.sendMessage(
      message.from,
      "Please mention the user(s) to kick."
    );
    return;
  }

  for (let userId of mentionedUsers) {
    if (userId === botId) {
      await client.sendMessage(message.from, `¯\_(ツ)_/¯`);
      return;
    }

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
