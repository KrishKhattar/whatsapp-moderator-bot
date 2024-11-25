const chatHistories = new Map(); // Use a Map to store chat history by chat ID

export const addMessageToHistory = (client, message) => {
  if (!chatHistories.has(client)) {
    chatHistories.set(client, []);
  }
  chatHistories.get(client).push(message);
};

export const getChatHistory = (client) => {
  return chatHistories.get(client) || [];
};

export const clearChatHistory = (client) => {
  chatHistories.delete(client);
};
