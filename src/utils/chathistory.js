const chatHistories = new Map(); // Use a Map to store chat history by chat ID

export const addMessageToHistory = (chatId, message) => {
  if (!chatHistories.has(chatId)) {
    chatHistories.set(chatId, []);
  }
  chatHistories.get(chatId).push(message);
};

export const getChatHistory = (chatId) => {
  return chatHistories.get(chatId) || [];
};

export const clearChatHistory = (chatId) => {
  chatHistories.delete(chatId);
};
