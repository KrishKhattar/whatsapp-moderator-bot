import { commandHandler } from "./commandHandler.js";
//import isUserSpamming from "../utils/spamDetector.js";
import { containsCussWords } from "../utils/badwordsfilter.js";

const userWarnings = {};

const messageHandler = async (client, message) => {
  const senderId = message.author || message.from;

  if (message.body.startsWith("!")) {
    await commandHandler(client, message);
  }

  // const spamCheck = isUserSpamming(client, message);

  // if (spamCheck.isSpam) {
  //   await client.sendMessage(
  //     message.from,
  //     `Your message was flagged as spam: ${spamCheck.reason}`
  //   );
  //   message.delete(true);
  //   return;
  // }

  if (containsCussWords(message.body)) {
    console.log("Deleting offensive message:", message.id);
    await message.delete(true);
    console.log("Message deleted successfully.");

    if (!userWarnings[senderId]) {
      userWarnings[senderId] = 1; // First warning
    } else {
      userWarnings[senderId] += 1; // Increment warning count
    }

    // Send a warning message
    await client.sendMessage(
      message.from,
      `@${
        senderId.split("@")[0]
      }, you have been warned for using offensive language. You now have ${
        userWarnings[senderId]
      } warning(s).`,
      { mentions: [senderId] }
    );
    return;
  }

  // Check if the user has reached the warning limit
  // if (userWarnings[senderId] > 1) {
  //   const chat = await client.getChatById(message.from);
  //   await chat.removeParticipants([senderId]); // Kick the user
  //   await client.sendMessage(
  //     message.from,
  //     `@${
  //       senderId.split("@")[0]
  //     } has been kicked for exceeding the warning limit.`,
  //     {
  //       mentions: [senderId],
  //     }
  //   );

  // Reset the user's warnings after kicking
  //delete userWarnings[senderId];
};
export default messageHandler;
