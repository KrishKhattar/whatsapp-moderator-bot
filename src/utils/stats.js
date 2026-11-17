// Persistent usage counters for !stats.
import db from "../db/index.js";

export const GLOBAL = "_global"; // bot-wide metrics not tied to one group

const statements = {
  increment: db.prepare(`
    INSERT INTO stats (group_id, metric, count) VALUES (?, ?, ?)
    ON CONFLICT (group_id, metric) DO UPDATE SET count = count + excluded.count
  `),
  forGroup: db.prepare("SELECT metric, count FROM stats WHERE group_id = ?"),
  totals: db.prepare(`
    SELECT metric, SUM(count) AS count FROM stats
    WHERE group_id != '${GLOBAL}' GROUP BY metric
  `),
  groupCount: db.prepare(`
    SELECT COUNT(DISTINCT group_id) AS n FROM stats WHERE group_id != '${GLOBAL}'
  `),
  getMeta: db.prepare("SELECT value FROM meta WHERE key = ?"),
  setMeta: db.prepare(`
    INSERT INTO meta (key, value) VALUES (?, ?)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value
  `),
};

const toObject = (rows) => Object.fromEntries(rows.map((r) => [r.metric, r.count]));

export const increment = (groupId, metric, by = 1) => {
  try {
    statements.increment.run(groupId, metric, by);
  } catch (error) {
    // Stats must never break message handling.
    console.warn(`Could not record stat ${metric}:`, error.message);
  }
};

export const getGroupStats = (groupId) => toObject(statements.forGroup.all(groupId));

export const getTotals = () => ({
  ...toObject(statements.totals.all()),
  ...toObject(statements.forGroup.all(GLOBAL)),
  groups: statements.groupCount.get().n,
});

const getMeta = (key) => statements.getMeta.get(key)?.value ?? null;

/** Call once per process start. */
export const recordStartup = (now = Date.now()) => {
  db.transaction(() => {
    if (!getMeta("first_started_at")) {
      statements.setMeta.run("first_started_at", String(now));
    }
    const starts = Number(getMeta("start_count") || 0) + 1;
    statements.setMeta.run("start_count", String(starts));
  })();
};

export const getLifetime = () => ({
  firstStartedAt: Number(getMeta("first_started_at")) || null,
  startCount: Number(getMeta("start_count")) || 0,
});
