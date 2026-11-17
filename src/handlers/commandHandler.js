import botConfig from "../config/botConfig.js";
import { registry as defaultRegistry } from "../commands/registry.js";
import { checkCooldown } from "../commands/cooldowns.js";
import isAdmin from "../utils/isAdmin.js";
import { increment } from "../utils/stats.js";

export const parseCommand = (body, prefix = botConfig.prefix) => {
  if (!body?.startsWith(prefix)) return null;
  const [name, ...args] = body.slice(prefix.length).trim().split(/\s+/);
  if (!name || !/^[a-z]+$/i.test(name)) return null; // ignore "!!!", "!?" etc.
  return { name, args };
};

// Levenshtein distance, for "did you mean" suggestions.
const distance = (a, b) => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
};

export const suggestCommand = (name, names) => {
  const input = name.toLowerCase();
  let best = null;
  for (const candidate of names) {
    const d = distance(input, candidate);
    if (d <= 2 && (!best || d < best.d)) best = { candidate, d };
  }
  return best?.candidate ?? null;
};

export const createCommandHandler = (registry, prefix = botConfig.prefix) =>
  async (client, message) => {
    const parsed = parseCommand(message.body, prefix);
    if (!parsed) return;

    const reply = (text, options) => client.sendMessage(message.from, text, options);
    const command = registry.get(parsed.name);

    if (!command) {
      const suggestion = suggestCommand(parsed.name, registry.names());
      await reply(
        suggestion
          ? `Unknown command. Did you mean *${prefix}${suggestion}*? 🤔`
          : `Unknown command. Type ${prefix}help to see what I can do.`
      );
      return;
    }

    const chat = await client.getChatById(message.from);
    const senderId = message.author || message.from;
    const usage = `Usage: ${prefix}${command.name}${command.usage ? ` ${command.usage}` : ""}`;

    if ((command.groupOnly || command.adminOnly) && !chat.isGroup) {
      await reply("This command only works in groups.");
      return;
    }
    if (command.adminOnly && !(await isAdmin(chat, senderId))) {
      await reply("Nice try, but that one's for admins only. 👑");
      return;
    }
    if (command.requiresArgs && parsed.args.length === 0) {
      await reply(usage);
      return;
    }
    if (command.requiresMention && !message.mentionedIds?.length) {
      await reply(`Please mention someone. ${usage}`);
      return;
    }

    const cooldown = checkCooldown(command, message.from, senderId);
    if (cooldown.limited) {
      if (cooldown.notify) {
        await reply(
          `⏳ Easy there! ${prefix}${command.name} is on cooldown. ` +
            `Try again in ${cooldown.remainingSeconds}s.`
        );
      }
      return;
    }

    increment(message.from, "commands_run");
    try {
      await command.execute({
        client,
        message,
        chat,
        args: parsed.args,
        senderId,
        prefix,
        commands: registry.commands,
        reply,
      });
    } catch (error) {
      console.error(`Error running ${prefix}${command.name}:`, error);
      await reply(
        `Something went wrong running ${prefix}${command.name}. Even bots have bad days. 🫠`
      );
    }
  };

export const commandHandler = createCommandHandler(defaultRegistry);
