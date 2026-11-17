import isAdmin from "../../utils/isAdmin.js";
import { tag } from "../../utils/mentionUser.js";
import {
  getSettings,
  updateSettings,
  getWarnings,
  resetWarnings,
  getAuditLog,
} from "../../moderation/settings.js";

const onOff = (value) => (value ? "on" : "off");

const formatSettings = (s) =>
  `*Moderation settings*\n` +
  `• Moderation: ${onOff(s.enabled)}\n` +
  `• Threshold: ${s.threshold} (0-1, lower = stricter)\n` +
  `• Warn limit: ${s.warnLimit}\n` +
  `• Delete flagged messages: ${onOff(s.deleteMessages)}\n` +
  `• Spam filter: ${onOff(s.spamFilter)}`;

const SUBCOMMANDS = [
  ["on|off", "Unleash me / put me on a leash"],
  ["threshold <0.1-1>", "Lower = I get stricter"],
  ["warnlimit <1-10>", "Strikes before you're out"],
  ["delete on|off", "Should I delete bad messages?"],
  ["spam on|off", "Toggle the spam police"],
];

const USAGE =
  "*Usage:*\n!moderation — show settings\n" +
  SUBCOMMANDS.map(([sub]) => `!moderation ${sub}`).join("\n");

const parseToggle = (value) =>
  value === "on" ? true : value === "off" ? false : null;

const parseChanges = (option, value) => {
  if (option === "on" || option === "off") return { enabled: option === "on" };
  if (option === "threshold") {
    const n = Number(value);
    return n >= 0.1 && n <= 1 ? { threshold: n } : null;
  }
  if (option === "warnlimit") {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= 10 ? { warnLimit: n } : null;
  }
  if (option === "delete" && parseToggle(value) !== null) {
    return { deleteMessages: parseToggle(value) };
  }
  if (option === "spam" && parseToggle(value) !== null) {
    return { spamFilter: parseToggle(value) };
  }
  return null;
};

export const moderation = {
  name: "moderation",
  aliases: ["mod"],
  category: "moderation",
  description: "See current settings",
  subcommands: SUBCOMMANDS,
  adminOnly: true,
  groupOnly: true,
  execute: async ({ client, chat, args, reply }) => {
    const groupId = chat.id._serialized;
    const [option, value] = args.map((a) => a.toLowerCase());

    if (!option) {
      await reply(formatSettings(getSettings(groupId)));
      return;
    }

    const changes = parseChanges(option, value);
    if (!changes) {
      await reply(USAGE);
      return;
    }

    const updated = updateSettings(groupId, changes);
    let text = `✅ Updated.\n\n${formatSettings(updated)}`;

    const botIsAdmin = await isAdmin(chat, client.info.wid._serialized);
    if (updated.enabled && !botIsAdmin) {
      text +=
        "\n\n_Note: I'm not a group admin, so I can warn but not delete messages or remove users._";
    }
    await reply(text);
  },
};

export const warnings = {
  name: "warnings",
  category: "moderation",
  description: "Check someone's criminal record",
  usage: "@user",
  adminOnly: true,
  groupOnly: true,
  requiresMention: true,
  execute: async ({ chat, message, reply }) => {
    const groupId = chat.id._serialized;
    const { warnLimit } = getSettings(groupId);
    const lines = message.mentionedIds.map(
      (id) => `${tag(id)}: ${getWarnings(groupId, id)}/${warnLimit} warnings`
    );
    await reply(lines.join("\n"), { mentions: message.mentionedIds });
  },
};

export const resetwarnings = {
  name: "resetwarnings",
  category: "moderation",
  description: "Wipe someone's record clean",
  usage: "@user",
  adminOnly: true,
  groupOnly: true,
  requiresMention: true,
  execute: async ({ chat, message, reply }) => {
    const groupId = chat.id._serialized;
    message.mentionedIds.forEach((id) => resetWarnings(groupId, id));
    await reply(`Warnings reset for ${message.mentionedIds.map(tag).join(", ")}. Fresh start! ✨`, {
      mentions: message.mentionedIds,
    });
  },
};

export const modlog = {
  name: "modlog",
  category: "moderation",
  description: "See who's been naughty lately",
  adminOnly: true,
  groupOnly: true,
  execute: async ({ chat, reply }) => {
    const entries = getAuditLog(chat.id._serialized, 10);
    if (entries.length === 0) {
      await reply("No moderation actions yet. Suspiciously well-behaved group. 😇");
      return;
    }

    const lines = entries.map((e) => {
      const time = e.at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      return (
        `*${time}* ${tag(e.userId)} — ${e.category} (${e.severity.toFixed(2)})\n` +
        `  ${e.reason}\n  Actions: ${e.actions.join(", ") || "none"}`
      );
    });

    await reply(`*Recent moderation actions*\n\n${lines.join("\n\n")}`, {
      mentions: [...new Set(entries.map((e) => e.userId))],
    });
  },
};
