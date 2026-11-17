import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCommandHandler,
  parseCommand,
  suggestCommand,
} from "../src/handlers/commandHandler.js";
import { buildRegistry, registry } from "../src/commands/registry.js";
import { checkCooldown, resetCooldowns } from "../src/commands/cooldowns.js";
import { buildHelpText } from "../src/commands/general/help.js";
import {
  makeClient,
  makeChat,
  makeMessage,
  sentTexts,
  ADMIN_ID,
  USER_ID,
} from "./helpers.js";

// A small fake registry so these tests don't depend on real commands.
const makeCommands = () => ({
  echo: {
    name: "echo",
    aliases: ["say"],
    category: "general",
    description: "Repeat after me",
    usage: "<text>",
    requiresArgs: true,
    execute: vi.fn(async ({ args, reply }) => reply(args.join(" "))),
  },
  secret: {
    name: "secret",
    category: "admin",
    description: "Admins only",
    adminOnly: true,
    execute: vi.fn(async ({ reply }) => reply("classified")),
  },
  poke: {
    name: "poke",
    category: "general",
    description: "Poke someone",
    usage: "@user",
    requiresMention: true,
    execute: vi.fn(async () => {}),
  },
  slow: {
    name: "slow",
    category: "general",
    description: "Rate limited",
    cooldown: { seconds: 30, scope: "user" },
    execute: vi.fn(async ({ reply }) => reply("done")),
  },
  broken: {
    name: "broken",
    category: "general",
    description: "Always throws",
    execute: vi.fn(async () => {
      throw new Error("boom");
    }),
  },
});

describe("parseCommand", () => {
  it("splits the command name and arguments", () => {
    expect(parseCommand("!google  best  biryani ")).toEqual({
      name: "google",
      args: ["best", "biryani"],
    });
  });

  it("ignores messages that are not commands", () => {
    expect(parseCommand("hello")).toBeNull();
    expect(parseCommand("!")).toBeNull();
    expect(parseCommand("!!!")).toBeNull();
    expect(parseCommand("!?")).toBeNull();
  });

  it("supports a custom prefix", () => {
    expect(parseCommand("/ping", "/")).toEqual({ name: "ping", args: [] });
    expect(parseCommand("!ping", "/")).toBeNull();
  });
});

describe("suggestCommand", () => {
  const names = ["summarize", "promote", "ping", "help"];

  it("suggests the closest command for a typo", () => {
    expect(suggestCommand("sumarize", names)).toBe("summarize");
    expect(suggestCommand("promte", names)).toBe("promote");
    expect(suggestCommand("HLEP", names)).toBe("help");
  });

  it("returns null when nothing is close", () => {
    expect(suggestCommand("banana", names)).toBeNull();
  });
});

describe("command handler", () => {
  let client, commands, handle;

  beforeEach(() => {
    resetCooldowns();
    vi.spyOn(console, "error").mockImplementation(() => {});
    client = makeClient();
    makeChat(client);
    commands = makeCommands();
    handle = createCommandHandler(buildRegistry(Object.values(commands)));
  });

  it("runs commands by name or alias, case-insensitively", async () => {
    await handle(client, makeMessage("!echo hi"));
    await handle(client, makeMessage("!SAY hello there"));
    expect(sentTexts(client)).toEqual(["hi", "hello there"]);
  });

  it("passes chat, sender and the command list to the command", async () => {
    await handle(client, makeMessage("!echo hi"));
    const ctx = commands.echo.execute.mock.calls[0][0];
    expect(ctx.senderId).toBe(USER_ID);
    expect(ctx.chat.isGroup).toBe(true);
    expect(ctx.commands).toHaveLength(5);
  });

  it("suggests a command for typos", async () => {
    await handle(client, makeMessage("!ecoh hi"));
    expect(sentTexts(client)[0]).toMatch(/Did you mean \*!echo\*/);
  });

  it("points to !help for unknown commands", async () => {
    await handle(client, makeMessage("!banana"));
    expect(sentTexts(client)[0]).toMatch(/Type !help/);
  });

  it("blocks admin-only commands for regular members", async () => {
    await handle(client, makeMessage("!secret"));
    expect(commands.secret.execute).not.toHaveBeenCalled();
    expect(sentTexts(client)[0]).toMatch(/admins only/);
  });

  it("allows admin-only commands for admins", async () => {
    await handle(client, makeMessage("!secret", { author: ADMIN_ID }));
    expect(sentTexts(client)).toEqual(["classified"]);
  });

  it("blocks admin-only commands outside groups", async () => {
    makeChat(client, { isGroup: false });
    await handle(client, makeMessage("!secret", { author: undefined }));
    expect(sentTexts(client)[0]).toMatch(/only works in groups/);
  });

  it("shows usage when required arguments are missing", async () => {
    await handle(client, makeMessage("!echo"));
    expect(commands.echo.execute).not.toHaveBeenCalled();
    expect(sentTexts(client)[0]).toBe("Usage: !echo <text>");
  });

  it("asks for a mention when one is required", async () => {
    await handle(client, makeMessage("!poke"));
    expect(commands.poke.execute).not.toHaveBeenCalled();
    expect(sentTexts(client)[0]).toMatch(/Please mention someone\. Usage: !poke @user/);
  });

  it("rate limits and only warns once per cooldown", async () => {
    for (let i = 0; i < 4; i++) await handle(client, makeMessage("!slow"));
    expect(commands.slow.execute).toHaveBeenCalledTimes(1);
    expect(sentTexts(client)).toHaveLength(2); // "done" + one cooldown notice
    expect(sentTexts(client)[1]).toMatch(/on cooldown\. Try again in 30s/);
  });

  it("does not consume the cooldown when usage is wrong", async () => {
    commands.echo.cooldown = { seconds: 30, scope: "user" };
    await handle(client, makeMessage("!echo"));
    await handle(client, makeMessage("!echo now"));
    expect(commands.echo.execute).toHaveBeenCalledTimes(1);
  });

  it("replies with an error instead of crashing when a command throws", async () => {
    await handle(client, makeMessage("!broken"));
    expect(sentTexts(client)[0]).toMatch(/Something went wrong running !broken/);
  });
});

describe("cooldowns", () => {
  beforeEach(() => resetCooldowns());
  const userScoped = { name: "u", cooldown: { seconds: 10, scope: "user" } };
  const groupScoped = { name: "g", cooldown: { seconds: 10, scope: "group" } };

  it("limits each user separately for user-scoped commands", () => {
    expect(checkCooldown(userScoped, "g1", "a", 0).limited).toBe(false);
    expect(checkCooldown(userScoped, "g1", "a", 1000).limited).toBe(true);
    expect(checkCooldown(userScoped, "g1", "b", 1000).limited).toBe(false);
  });

  it("limits the whole chat for group-scoped commands", () => {
    expect(checkCooldown(groupScoped, "g1", "a", 0).limited).toBe(false);
    expect(checkCooldown(groupScoped, "g1", "b", 1000).limited).toBe(true);
    expect(checkCooldown(groupScoped, "g2", "b", 1000).limited).toBe(false);
  });

  it("expires after the cooldown and reports remaining time", () => {
    checkCooldown(userScoped, "g1", "a", 0);
    expect(checkCooldown(userScoped, "g1", "a", 3500)).toMatchObject({
      limited: true,
      remainingSeconds: 7,
    });
    expect(checkCooldown(userScoped, "g1", "a", 10_000).limited).toBe(false);
  });

  it("never limits commands without a cooldown", () => {
    const free = { name: "free" };
    expect(checkCooldown(free, "g1", "a", 0).limited).toBe(false);
    expect(checkCooldown(free, "g1", "a", 1).limited).toBe(false);
  });
});

describe("registry", () => {
  const valid = { name: "a", category: "general", description: "d", execute: () => {} };

  it("rejects duplicate names and aliases", () => {
    expect(() => buildRegistry([valid, { ...valid }])).toThrow(/Duplicate/);
    expect(() =>
      buildRegistry([valid, { ...valid, name: "b", aliases: ["A"] }])
    ).toThrow(/Duplicate/);
  });

  it("rejects incomplete definitions and unknown categories", () => {
    expect(() => buildRegistry([{ name: "x" }])).toThrow(/Invalid/);
    expect(() => buildRegistry([{ ...valid, category: "misc" }])).toThrow(/category/);
  });

  it("loads every real command", () => {
    expect(registry.commands).toHaveLength(15);
    expect(registry.get("MENTIONALL")?.name).toBe("mentionAll");
    expect(registry.get("tldr")?.name).toBe("summarize");
  });
});

describe("generated !help", () => {
  const text = buildHelpText(registry.commands);

  it("lists every command and its subcommands", () => {
    for (const command of registry.commands) {
      expect(text).toContain(`!${command.name}`);
      expect(text).toContain(command.description);
    }
    expect(text).toContain("!moderation threshold <0.1-1>");
  });

  it("keeps the count and the signature line accurate", () => {
    expect(text).toContain(`That's ${registry.commands.length} commands`);
    expect(text).toContain("Thala for a Reason");
  });
});
