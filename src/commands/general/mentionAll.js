import isAdmin from "../../utils/isAdmin.js";

const mentionAll = async (client, message) => {
  const chat = await client.getChatById(message.from);
  if (!chat.isGroup) return;

  const senderId = message.author || message.from;

  const senderIsAdmin = await isAdmin(chat, senderId);
  if (!senderIsAdmin) {
    // If sender is not an admin, send a message and return
    await client.sendMessage(
      message.from,
      "This command is available only to admins."
    );
    return;
  }

  const mentions = chat.participants.map(
    (participant) => participant.id._serialized
  );
  const mentionText = mentions.map((id) => `@${id.split("@")[0]}`).join(" ");

  const sentMessage = await client.sendMessage(message.from, mentionText, { mentions });
  
  // Delete the mention message after 1 second
  setTimeout(async () => {
    await sentMessage.delete(true);
  }, 1000);
};

export default mentionAll;
