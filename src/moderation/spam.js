// Local spam heuristics — no API calls, so they run on every message.

const FLOOD_WINDOW_MS = 10_000;
const FLOOD_MAX_MESSAGES = 6; // more than this many messages in the window
const REPEAT_MAX = 3; // same text this many times in a row
const MAX_MENTIONS = 5;

// key: `${groupId}:${userId}` -> { timestamps: number[], lastText, repeatCount }
const activity = new Map();

export const checkSpam = (groupId, userId, message) => {
  const key = `${groupId}:${userId}`;
  const now = Date.now();
  const text = (message.body || "").trim().toLowerCase();

  const state = activity.get(key) || {
    timestamps: [],
    lastText: null,
    repeatCount: 0,
  };

  state.timestamps = state.timestamps.filter((t) => now - t < FLOOD_WINDOW_MS);
  state.timestamps.push(now);

  if (text && text === state.lastText) {
    state.repeatCount += 1;
  } else {
    state.lastText = text;
    state.repeatCount = 1;
  }

  activity.set(key, state);

  if ((message.mentionedIds?.length || 0) > MAX_MENTIONS) {
    return { isSpam: true, reason: "Mass mentions" };
  }
  if (state.timestamps.length > FLOOD_MAX_MESSAGES) {
    return { isSpam: true, reason: "Message flooding" };
  }
  if (text && state.repeatCount >= REPEAT_MAX) {
    return { isSpam: true, reason: "Repeated messages" };
  }
  return { isSpam: false };
};

// Drop idle entries so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of activity) {
    const last = state.timestamps[state.timestamps.length - 1] || 0;
    if (now - last > FLOOD_WINDOW_MS * 6) activity.delete(key);
  }
}, 60_000).unref();
