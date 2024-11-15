const isAdmin = async (client, message) => {
  // Check if the message is from a group chat
  if (!message.from.includes("@g.us")) return false;

  const chat = await client.getChatById(message.from);
  const senderId = message.author || message.from; // Author for group messages, from for private
  // Find the participant in the group
  const sender = chat.participants.find((p) => p.id._serialized === senderId);
  return sender?.isAdmin || sender?.isSuperAdmin;
};

export default async (client, message) => {
  if (!message.from.includes("@g.us")) return;
  const command = message.body.slice(1).trim().split(/\s+/)[0];
  const sender = message.from;

  // Check if the command requires admin privileges
  const isSenderAdmin = await isAdmin(client, message);
  if (
    (command === "kick" || command === "promote" || command === "demote") &&
    !isSenderAdmin
  ) {
    client.sendMessage(sender, "This command is only available to admins.");
    return;
  }

  switch (command) {
    case "ping":
      client.sendMessage(sender, "pong");
      break;

    case "kick":
      const chatForKick = await client.getChatById(sender);
      if (chatForKick.isGroup && !isSenderAdmin) {
        const botId = client.info.wid._serialized;
        const mentionedUsers = message.mentionedIds; 

        if (mentionedUsers.includes(botId)) {
          client.sendMessage(message.from, "Andha hai kya lawde");
          return;
        }
        for (let userId of mentionedUsers) {
          await chatForKick.removeParticipants([userId]);
        }
        client.sendMessage(
          message.from,
          `${mentionedUsers} removed successfully.`
        );
      }
      break;

    case "promote":
      const chatForPromote = await client.getChatById(sender);
      if (chatForPromote.isGroup) {
        const mentionedUsers = message.mentionedIds;
        for (let userId of mentionedUsers) {
          await chatForPromote.promoteParticipants([userId]);
        }
        const mentionText = mentionedUsers
          .map((userId) => `@${userId.split("@")[0]}`)
          .join(" ");
        await client.sendMessage(
          message.from,
          `${mentionText} promoted to admin `,
          { mentions: mentionedUsers }
        );
      }
      break;

    case "demote":
      const chatForDemote = await client.getChatById(sender);
      if (chatForDemote.isGroup) {
        const mentionedUsers = message.mentionedIds;
        for (let userId of mentionedUsers) {
          await chatForDemote.demoteParticipants([userId]);
        }
        const mentionText = mentionedUsers
          .map((userId) => `@${userId.split("@")[0]}`)
          .join(" ");
        await client.sendMessage(
          message.from,
          `${mentionText} demoted from admin `,
          { mentions: mentionedUsers }
        );
      }
      break;

    case "mentionAll":
      const chatForMention = await client.getChatById(sender);
      if (chatForMention.isGroup) {
        const allParticipants = chatForMention.participants;
        const mentions = allParticipants.map(
          (participant) => participant.id._serialized
        );
        const mentionText = mentions
          .map((userId) => `@${userId.split("@")[0]}`)
          .join(" ");
        await client.sendMessage(
          message.from,
          `Attention everyone:\n${mentionText}`,
          { mentions: mentions }
        );
      }
      break;

    case "help":
      client.sendMessage(
        sender,
        "Admin Commands:\n!kick @user\n!promote @user\n!demote @user"
      );
      break;

    default:
      client.sendMessage(
        sender,
        "I'm sorry, I didn't understand that command."
      );
  }
};
