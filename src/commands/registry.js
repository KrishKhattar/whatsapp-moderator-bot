// Single source of truth for every command. To add a command, create a file
// that exports a definition and add it to COMMANDS — routing, permissions,
// rate limits and !help all come from the definition.
//
// Definition shape:
// {
//   name: string,                 // invoked as !name (case-insensitive)
//   aliases?: string[],
//   category: "general" | "ai" | "admin" | "moderation",
//   description: string,          // shown in !help
//   usage?: string,               // e.g. "@user", "<query>"
//   subcommands?: [usage, description][],
//   adminOnly?: boolean,          // only group admins may run it
//   groupOnly?: boolean,          // only works in group chats
//   requiresArgs?: boolean,       // reply with usage if no arguments
//   requiresMention?: boolean,    // reply with usage if nobody is @mentioned
//   cooldown?: { seconds: number, scope: "user" | "group" },
//   execute: (ctx) => Promise<void>,
// }

import ping from "./general/ping.js";
import help from "./general/help.js";
import prompt from "./general/prompt.js";
import askGemini from "./general/askgemini.js";
import google from "./general/googleSearch.js";
import summarize from "./general/summarize.js";
import stats from "./general/stats.js";
import promote from "./admin/promote.js";
import demote from "./admin/demote.js";
import kick from "./admin/kick.js";
import mentionAll from "./admin/mentionAll.js";
import {
  moderation,
  warnings,
  resetwarnings,
  modlog,
} from "./admin/moderation.js";

export const COMMANDS = [
  ping,
  help,
  prompt,
  askGemini,
  google,
  summarize,
  stats,
  promote,
  demote,
  kick,
  mentionAll,
  moderation,
  warnings,
  resetwarnings,
  modlog,
];

const CATEGORIES = new Set(["general", "ai", "admin", "moderation"]);

export const buildRegistry = (commands) => {
  const lookup = new Map();

  for (const command of commands) {
    const { name, category, description, execute } = command;
    if (!name || !description || typeof execute !== "function") {
      throw new Error(`Invalid command definition: ${name ?? "(unnamed)"}`);
    }
    if (!CATEGORIES.has(category)) {
      throw new Error(`Command "${name}" has unknown category "${category}"`);
    }

    for (const key of [name, ...(command.aliases || [])]) {
      const normalized = key.toLowerCase();
      if (lookup.has(normalized)) {
        throw new Error(`Duplicate command name or alias: "${key}"`);
      }
      lookup.set(normalized, command);
    }
  }

  return {
    commands,
    get: (name) => lookup.get(name.toLowerCase()),
    names: () => [...lookup.keys()],
  };
};

export const registry = buildRegistry(COMMANDS);
