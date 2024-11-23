// // Set a cooldown of 15 seconds after their last message
// const checkCooldown = (userId) => {
//   const now = Date.now();

//   // If user is on cooldown, block their message
//   if (cooldownTracker[userId] && now - cooldownTracker[userId] < 15000) {
//     // 15 seconds cooldown
//     return true; // Block spam: user is on cooldown
//   }

//   // Set a cooldown of 15 seconds after their last message
//   cooldownTracker[userId] = now;
//   return false;
// };

// // Remove or comment out the cooldown check
// const isUserSpamming = (client, message) => {
//   const userId = message.author || message.from;

//   // Check for flooding or repeated content
//   if (isSpam(userId, message.body)) {
//     return { isSpam: true, reason: "Flooding or repeated content." };
//   }

//   // Check for excessive mentions
//   if (handleMentions(message)) {
//     return { isSpam: true, reason: "Excessive mentions." };
//   }

//   // Remove the cooldown check entirely
//   // if (checkCooldown(userId)) {
//   //   return { isSpam: true, reason: "Message sent too quickly." };
//   // }

//   return { isSpam: false };
// };
// const checkCooldown = (userId) => {
//   const now = Date.now();

//   // If user is on cooldown, block their message
//   if (cooldownTracker[userId] && now - cooldownTracker[userId] < 3000) {
//     // 3 seconds cooldown
//     return true; // Block spam: user is on cooldown
//   }

//   // Set a cooldown of 3 seconds after their last message
//   cooldownTracker[userId] = now;
//   return false;
// };

// export default isUserSpamming;
