const resolveUserMentions = async (client, chat, text) => {
  // Extract all potential user IDs (e.g., phone numbers or IDs)
  const userIdPattern = /\b\d{10,}\b/g; // Adjust this pattern as needed
  const userIds = text.match(userIdPattern) || [];

  for (const userId of userIds) {
    try {
      // Fetch contact information for the given user ID
      const contact = await client.getContactById(`${userId}@c.us`);
      const mention = `@${contact.pushname || contact.number}`;
      text = text.replace(new RegExp(userId, "g"), mention);
    } catch (error) {
      console.warn(`Could not resolve user ID ${userId}:`, error);
    }
  }

  return text;
};

export default resolveUserMentions;
