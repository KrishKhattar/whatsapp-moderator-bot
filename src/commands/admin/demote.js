const demote = async (client, message) => {
  const chat = await client.getChatById(message.from);
  if (!chat.isGroup) return;

  const mentionedUsers = message.mentionedIds;
  for (let userId of mentionedUsers) {
    await chat.demoteParticipants([userId]);
    await client.sendMessage(
      message.reply,
      `@${userId.split("@")[0]} has been demoted.`,
      { mentions: [userId] }
    );
  }
};

export default demote;
