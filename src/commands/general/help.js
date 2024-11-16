const help = async (client, message) => {
  const helpMessage = `
  *Commands:*
  1. !promote [tag user] - Promote a user to admin.
  2. !demote [tag user] - Demote a user from admin.
  3. !kick [tag user] - Remove a user from the group.
  4. !ping - Check bot status.
  5. !mentionAll - Mention everyone in the group.
  6. !help - Display this help message.
    `;
  await client.sendMessage(message.from, helpMessage);
};

export default help;
