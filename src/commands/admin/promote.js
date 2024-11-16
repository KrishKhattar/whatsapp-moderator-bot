import isAdmin from "../../utils/isAdmin.js";

const promote = async (client, message) => {
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

  if (mentionedUsers.length === 0) {
    await client.sendMessage(
      message.from,
      "Please mention the user(s) to promote."
    );
    return;
  }

  for (let userId of mentionedUsers) {
    await chat.promoteParticipants([userId]);
    await client.sendMessage(
      message.from,
      `@${userId.split("@")[0]} has been promoted to admin.`,
      { mentions: [userId] }
    );
  }
};

export default promote;
