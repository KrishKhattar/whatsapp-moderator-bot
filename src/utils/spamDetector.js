const spamTracker = {};
const cooldownTracker = {};

const isSpam = (userId, message) => {
  const now = Date.now();

  // Initialize user's data if not already present
  if (!spamTracker[userId]) {
    spamTracker[userId] = {
      messages: [],
      mentions: 0,
    };
  }

  // Add current message to the user's message history
  spamTracker[userId].messages.push({
    message,
    timestamp: now,
  });

  // Remove messages older than the threshold (e.g., 60 seconds)
  spamTracker[userId].messages = spamTracker[userId].messages.filter(
    (msg) => now - msg.timestamp <= 60000
  );

  // Check for flooding (e.g., more than 5 messages in 10 seconds)
  if (spamTracker[userId].messages.length > 5) {
    const firstMessageTimestamp = spamTracker[userId].messages[0].timestamp;
    if (now - firstMessageTimestamp <= 10000) {
      return true; // Spam detected due to flooding
    }
  }

  // Check for repeated content (same message within a short period)
  const recentMessages = spamTracker[userId].messages.slice(-2);
  if (
    recentMessages.length === 2 &&
    recentMessages[0].message === recentMessages[1].message
  ) {
    return true; // Spam detected due to repeated content
  }

  return false;
};

const handleMentions = (message) => {
  const userId = message.author || message.from;

  // Count mentions in the message (simple approach)
  const mentions = message.mentionedIds || [];
  if (mentions.length > 5) {
    return true; // Spam detected due to excessive mentions
  }

  // Update the mention count for the user
  if (!spamTracker[userId].mentions) {
    spamTracker[userId].mentions = 0;
  }

  spamTracker[userId].mentions += mentions.length;

  // Check if the user is exceeding mention limits
  if (spamTracker[userId].mentions > 10) {
    return true; // Spam detected due to excessive mentions
  }

  return false;
};

const checkCooldown = (userId) => {
  const now = Date.now();

  // If user is on cooldown, block their message
  if (cooldownTracker[userId] && now - cooldownTracker[userId] < 5000) {
    return true; // Block spam: user is on cooldown
  }

  // Set a cooldown of 5 seconds after their last message
  cooldownTracker[userId] = now;
  return false;
};

// Main function to check for spam conditions
const isUserSpamming = (client, message) => {
  const userId = message.author || message.from;

  // Check for flooding or repeated content
  if (isSpam(userId, message.body)) {
    return { isSpam: true, reason: "Flooding or repeated content." };
  }

  // Check for excessive mentions
  if (handleMentions(message)) {
    return { isSpam: true, reason: "Excessive mentions." };
  }

  // Check if the user is under cooldown (if sending messages too fast)
  if (checkCooldown(userId)) {
    return { isSpam: true, reason: "Message sent too quickly." };
  }

  return { isSpam: false };
};

export default isUserSpamming;
