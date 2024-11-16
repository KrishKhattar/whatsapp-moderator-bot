const mentionAll = async (client, message) => {
  const chat = await client.getChatById(message.from);
  if (!chat.isGroup) return;

  const mentions = chat.participants.map(
    (participant) => participant.id._serialized
  );
  const mentionText = mentions.map((id) => `@${id.split("@")[0]}`).join(" ");

  await client.sendMessage(message.reply, mentionText, { mentions });
};

export default mentionAll;
