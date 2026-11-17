// Recent group messages (for !summarize), stored in SQLite and capped per chat.
import db from "../db/index.js";

const MAX_HISTORY = 300; // keep only the most recent messages per chat

const statements = {
  insert: db.prepare(`
    INSERT INTO chat_history (group_id, author_id, name, body, created_at)
    VALUES (@chatId, @authorId, @name, @body, @now)
  `),
  trim: db.prepare(`
    DELETE FROM chat_history
    WHERE group_id = @chatId AND id NOT IN (
      SELECT id FROM chat_history WHERE group_id = @chatId ORDER BY id DESC LIMIT @limit
    )
  `),
  getAll: db.prepare(`
    SELECT author_id AS authorId, name, body
    FROM chat_history WHERE group_id = ? ORDER BY id ASC
  `),
  clear: db.prepare("DELETE FROM chat_history WHERE group_id = ?"),
};

const insertAndTrim = db.transaction((params) => {
  statements.insert.run(params);
  statements.trim.run({ chatId: params.chatId, limit: MAX_HISTORY });
});

export const addMessageToHistory = (chatId, { authorId, name, body }) => {
  insertAndTrim({
    chatId,
    authorId,
    name: name ?? null,
    body,
    now: Date.now(),
  });
};

export const getChatHistory = (chatId) => statements.getAll.all(chatId);

export const clearChatHistory = (chatId) => {
  statements.clear.run(chatId);
};
