// Per-group moderation settings, warnings and audit log, stored in SQLite.
import db from "../db/index.js";

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: false, // opt-in per group via `!moderation on`
  threshold: 0.7, // toxicity severity (0-1) at or above which a message is actioned
  warnLimit: 3, // warnings before a user is removed
  deleteMessages: true, // delete flagged messages (bot must be a group admin)
  spamFilter: true, // local flood / repeat / mass-mention detection
});

const AUDIT_LOG_LIMIT = 500; // per group

const statements = {
  getSettings: db.prepare("SELECT * FROM group_settings WHERE group_id = ?"),
  upsertSettings: db.prepare(`
    INSERT INTO group_settings
      (group_id, enabled, threshold, warn_limit, delete_messages, spam_filter, updated_at)
    VALUES
      (@groupId, @enabled, @threshold, @warnLimit, @deleteMessages, @spamFilter, @now)
    ON CONFLICT (group_id) DO UPDATE SET
      enabled = excluded.enabled,
      threshold = excluded.threshold,
      warn_limit = excluded.warn_limit,
      delete_messages = excluded.delete_messages,
      spam_filter = excluded.spam_filter,
      updated_at = excluded.updated_at
  `),

  getWarnings: db.prepare(
    "SELECT count FROM warnings WHERE group_id = ? AND user_id = ?"
  ),
  addWarning: db.prepare(`
    INSERT INTO warnings (group_id, user_id, count, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT (group_id, user_id) DO UPDATE SET
      count = count + 1,
      updated_at = excluded.updated_at
    RETURNING count
  `),
  resetWarnings: db.prepare(
    "DELETE FROM warnings WHERE group_id = ? AND user_id = ?"
  ),

  insertLog: db.prepare(`
    INSERT INTO mod_log
      (group_id, user_id, category, severity, reason, source, actions, excerpt, created_at)
    VALUES
      (@groupId, @userId, @category, @severity, @reason, @source, @actions, @excerpt, @now)
  `),
  trimLog: db.prepare(`
    DELETE FROM mod_log
    WHERE group_id = @groupId AND id NOT IN (
      SELECT id FROM mod_log WHERE group_id = @groupId ORDER BY id DESC LIMIT @limit
    )
  `),
  recentLog: db.prepare(`
    SELECT * FROM (
      SELECT * FROM mod_log WHERE group_id = ? ORDER BY id DESC LIMIT ?
    ) ORDER BY id ASC
  `),
};

const rowToSettings = (row) => ({
  enabled: Boolean(row.enabled),
  threshold: row.threshold,
  warnLimit: row.warn_limit,
  deleteMessages: Boolean(row.delete_messages),
  spamFilter: Boolean(row.spam_filter),
});

export const getSettings = (groupId) => {
  const row = statements.getSettings.get(groupId);
  return row ? rowToSettings(row) : { ...DEFAULT_SETTINGS };
};

export const updateSettings = (groupId, changes) => {
  const next = { ...getSettings(groupId), ...changes };
  statements.upsertSettings.run({
    groupId,
    enabled: next.enabled ? 1 : 0,
    threshold: next.threshold,
    warnLimit: next.warnLimit,
    deleteMessages: next.deleteMessages ? 1 : 0,
    spamFilter: next.spamFilter ? 1 : 0,
    now: Date.now(),
  });
  return next;
};

export const getWarnings = (groupId, userId) =>
  statements.getWarnings.get(groupId, userId)?.count ?? 0;

export const addWarning = (groupId, userId) =>
  statements.addWarning.get(groupId, userId, Date.now()).count;

export const resetWarnings = (groupId, userId) => {
  statements.resetWarnings.run(groupId, userId);
};

const insertAndTrimLog = db.transaction((params) => {
  statements.insertLog.run(params);
  statements.trimLog.run({ groupId: params.groupId, limit: AUDIT_LOG_LIMIT });
});

export const logAction = (groupId, entry) => {
  insertAndTrimLog({
    groupId,
    userId: entry.userId,
    category: entry.category,
    severity: entry.severity,
    reason: entry.reason ?? null,
    source: entry.source ?? null,
    actions: JSON.stringify(entry.actions || []),
    excerpt: entry.excerpt ?? null,
    now: Date.now(),
  });
};

export const getAuditLog = (groupId, limit = 10) =>
  statements.recentLog.all(groupId, limit).map((row) => ({
    at: new Date(row.created_at),
    userId: row.user_id,
    category: row.category,
    severity: row.severity,
    reason: row.reason,
    source: row.source,
    actions: JSON.parse(row.actions),
    excerpt: row.excerpt,
  }));
