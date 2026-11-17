import isAdmin from "../utils/isAdmin.js";
import { classifyMessage } from "./classifier.js";
import { checkSpam } from "./spam.js";
import { increment } from "../utils/stats.js";
import {
  getSettings,
  addWarning,
  resetWarnings,
  logAction,
} from "./settings.js";

const SPAM_WARN_COOLDOWN_MS = 15_000;
const lastSpamWarning = new Map(); // `${groupId}:${userId}` -> timestamp

const tag = (userId) => `@${userId.split("@")[0]}`;

const CATEGORY_LABELS = {
  harassment: "harassment",
  hate_speech: "hate speech",
  sexual: "sexual content",
  threat: "threats",
  scam: "a suspected scam",
  spam: "spam",
};

/**
 * Checks a group message and takes action if needed.
 * Returns true when the message was actioned (caller should stop processing).
 */
export async function moderateMessage(client, chat, message) {
  const groupId = chat.id._serialized;
  const settings = getSettings(groupId);
  if (!settings.enabled) return false;

  const senderId = message.author || message.from;
  if (await isAdmin(chat, senderId)) return false; // admins are exempt

  increment(groupId, "messages_checked");
  const verdict = await evaluate(groupId, senderId, message, settings);
  if (!verdict) return false;

  if (verdict.category === "self_harm") {
    await handleSelfHarm(client, chat, message, senderId, verdict);
    return false;
  }

  await enforce(client, chat, message, senderId, verdict, settings);
  return true;
}

async function evaluate(groupId, senderId, message, settings) {
  if (settings.spamFilter) {
    const spam = checkSpam(groupId, senderId, message);
    if (spam.isSpam) {
      return { category: "spam", severity: 1, reason: spam.reason, source: "spam-filter" };
    }
  }

  if (message.type !== "chat" || !message.body) return null;

  const result = await classifyMessage(message.body);
  if (!result || result.category === "none") return null;

  // Always surface self-harm, regardless of threshold.
  if (result.category === "self_harm" && result.severity >= 0.5) {
    return { ...result, source: "llm" };
  }
  if (result.severity < settings.threshold) return null;

  return { ...result, source: "llm" };
}

async function enforce(client, chat, message, senderId, verdict, settings) {
  const groupId = chat.id._serialized;
  const botIsAdmin = await isAdmin(chat, client.info.wid._serialized);
  const actions = [];

  if (settings.deleteMessages && botIsAdmin) {
    try {
      await message.delete(true);
      actions.push("deleted");
    } catch (error) {
      console.warn("Could not delete message:", error.message);
    }
  }

  // Avoid a wall of warnings while someone is flooding the chat.
  if (verdict.category === "spam") {
    const key = `${groupId}:${senderId}`;
    const last = lastSpamWarning.get(key) || 0;
    if (Date.now() - last < SPAM_WARN_COOLDOWN_MS) {
      record(groupId, senderId, message, verdict, actions);
      return;
    }
    lastSpamWarning.set(key, Date.now());
  }

  const count = addWarning(groupId, senderId);
  actions.push(`warning ${count}/${settings.warnLimit}`);
  const label = CATEGORY_LABELS[verdict.category] || verdict.category;

  if (count >= settings.warnLimit && botIsAdmin) {
    await chat.removeParticipants([senderId]);
    resetWarnings(groupId, senderId);
    actions.push("removed");
    await client.sendMessage(
      groupId,
      `${tag(senderId)} has been removed after ${count} warnings (last: ${label}).`,
      { mentions: [senderId] }
    );
  } else {
    const limitNote = botIsAdmin
      ? `${count}/${settings.warnLimit} warnings.`
      : `${count} warning(s). (Make me an admin to enforce removals.)`;
    await client.sendMessage(
      groupId,
      `⚠️ ${tag(senderId)}, your message was flagged for ${label}. ${limitNote}`,
      { mentions: [senderId] }
    );
  }

  record(groupId, senderId, message, verdict, actions);
}

async function handleSelfHarm(client, chat, message, senderId, verdict) {
  const groupId = chat.id._serialized;
  await message.reply(
    "Hey, it sounds like you might be going through something difficult. " +
      "You're not alone — please consider reaching out to someone you trust " +
      "or a local helpline (in India: Tele-MANAS 14416; elsewhere: findahelpline.com)."
  );
  record(groupId, senderId, message, verdict, ["support message sent"]);
}

const ACTION_METRICS = [
  ["deleted", "deleted"],
  ["warning", "warned"],
  ["removed", "removed"],
  ["support message sent", "support_sent"],
];

function record(groupId, userId, message, verdict, actions) {
  increment(groupId, "flagged");
  increment(groupId, `flagged:${verdict.category}`);
  for (const action of actions) {
    const match = ACTION_METRICS.find(([prefix]) => action.startsWith(prefix));
    if (match) increment(groupId, match[1]);
  }

  const entry = {
    userId,
    category: verdict.category,
    severity: verdict.severity,
    reason: verdict.reason,
    source: verdict.source,
    actions,
    excerpt: (message.body || "").slice(0, 80),
  };
  logAction(groupId, entry);
  console.log(
    `[moderation] ${groupId} ${userId} ${verdict.category} ` +
      `(${verdict.severity.toFixed(2)}, ${verdict.source}): ${actions.join(", ") || "no action"}`
  );
}
