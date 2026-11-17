import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DB_PATH || "data/bot.db";

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL"); // better concurrency + crash safety
db.pragma("foreign_keys = ON");

// Each migration runs once, in order. The applied count is tracked in
// SQLite's built-in `user_version`. Never edit an old migration — add a new one.
export const migrations = [
  `
  CREATE TABLE group_settings (
    group_id        TEXT PRIMARY KEY,
    enabled         INTEGER NOT NULL,
    threshold       REAL    NOT NULL,
    warn_limit      INTEGER NOT NULL,
    delete_messages INTEGER NOT NULL,
    spam_filter     INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  );

  CREATE TABLE warnings (
    group_id   TEXT    NOT NULL,
    user_id    TEXT    NOT NULL,
    count      INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (group_id, user_id)
  );

  CREATE TABLE mod_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id   TEXT    NOT NULL,
    user_id    TEXT    NOT NULL,
    category   TEXT    NOT NULL,
    severity   REAL    NOT NULL,
    reason     TEXT,
    source     TEXT,
    actions    TEXT    NOT NULL, -- JSON array
    excerpt    TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_mod_log_group ON mod_log (group_id, id);

  CREATE TABLE chat_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id   TEXT    NOT NULL,
    author_id  TEXT    NOT NULL,
    name       TEXT,
    body       TEXT    NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_chat_history_group ON chat_history (group_id, id);
  `,

  // 2: usage statistics for !stats
  `
  CREATE TABLE stats (
    group_id TEXT    NOT NULL, -- "_global" for bot-wide metrics
    metric   TEXT    NOT NULL,
    count    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (group_id, metric)
  );

  CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

const migrate = () => {
  const current = db.pragma("user_version", { simple: true });
  for (let version = current; version < migrations.length; version++) {
    db.transaction(() => {
      db.exec(migrations[version]);
      db.pragma(`user_version = ${version + 1}`);
    })();
    console.log(`Database migrated to version ${version + 1}`);
  }
};

migrate();

export const closeDb = () => {
  if (db.open) db.close();
};

export default db;
