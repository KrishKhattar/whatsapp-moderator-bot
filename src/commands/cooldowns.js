// Per-command rate limits. A command's `cooldown` is { seconds, scope } where
// scope "user" limits each person separately and "group" limits the whole chat.

const lastUsed = new Map(); // key -> { at, notified }

const keyFor = (command, chatId, userId) =>
  command.cooldown.scope === "group"
    ? `${command.name}:${chatId}`
    : `${command.name}:${chatId}:${userId}`;

/**
 * Records a use of `command` and reports whether it is rate limited.
 * `notify` is true only for the first blocked attempt in a cooldown window,
 * so the bot doesn't spam "slow down" replies.
 */
export const checkCooldown = (command, chatId, userId, now = Date.now()) => {
  const seconds = command.cooldown?.seconds || 0;
  if (seconds <= 0) return { limited: false };

  const key = keyFor(command, chatId, userId);
  const entry = lastUsed.get(key);
  const elapsed = entry ? now - entry.at : Infinity;

  if (elapsed < seconds * 1000) {
    const notify = !entry.notified;
    entry.notified = true;
    return {
      limited: true,
      notify,
      remainingSeconds: Math.ceil((seconds * 1000 - elapsed) / 1000),
    };
  }

  lastUsed.set(key, { at: now, notified: false });
  return { limited: false };
};

export const resetCooldowns = () => lastUsed.clear();

// Drop expired entries so the map doesn't grow forever.
const MAX_COOLDOWN_MS = 60 * 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of lastUsed) {
    if (now - entry.at > MAX_COOLDOWN_MS) lastUsed.delete(key);
  }
}, 10 * 60_000).unref();
