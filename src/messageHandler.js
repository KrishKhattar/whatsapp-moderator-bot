import commandHandler from "./commandHandler.js";

export default (client, message) => {
  const messageContent = message.body.trim();

  if (messageContent.startsWith("!")) {
    commandHandler(client, message);
  }

  const offensiveWords = ["alsoshubham", "lavanya"];
  client.on("message", async (message) => {
    const messageContent = message.body.toLowerCase();
    if (offensiveWords.some((word) => messageContent.includes(word))) {
      // Send a warning message to the sender
      await client.sendMessage(
        message.from,
        "Please refrain from using offensive language."
      );

      // Delete the offensive message
      await message
        .delete()
        .catch((error) => console.error("Failed to delete message:", error));
    }
  });
};
