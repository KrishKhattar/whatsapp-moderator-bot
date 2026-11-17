import { describe, it, expect, beforeEach } from "vitest";
import { commandHandler } from "../src/handlers/commandHandler.js";
import { resetCooldowns } from "../src/commands/cooldowns.js";
import {
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings,
  addWarning,
  getWarnings,
  logAction,
} from "../src/moderation/settings.js";
import {
  makeClient,
  makeChat,
  makeMessage,
  sentTexts,
  GROUP_ID,
  ADMIN_ID,
  USER_ID,
} from "./helpers.js";

// These go through the real command handler + registry, end to end.
const asAdmin = (body, extra = {}) => makeMessage(body, { author: ADMIN_ID, ...extra });

describe("!moderation", () => {
  let client;
  const run = (body) => commandHandler(client, asAdmin(body));

  beforeEach(() => {
    resetCooldowns();
    client = makeClient();
    makeChat(client);
    updateSettings(GROUP_ID, { ...DEFAULT_SETTINGS });
  });

  it("shows current settings with no arguments", async () => {
    await run("!moderation");
    expect(sentTexts(client)[0]).toMatch(/Moderation: off/);
  });

  it("turns moderation on and off, case-insensitively", async () => {
    await run("!moderation on");
    expect(getSettings(GROUP_ID).enabled).toBe(true);
    await run("!MODERATION OFF");
    expect(getSettings(GROUP_ID).enabled).toBe(false);
  });

  it("works through the !mod alias", async () => {
    await run("!mod on");
    expect(getSettings(GROUP_ID).enabled).toBe(true);
  });

  it.each([
    ["!moderation threshold 0.5", { threshold: 0.5 }],
    ["!moderation warnlimit 5", { warnLimit: 5 }],
    ["!moderation delete off", { deleteMessages: false }],
    ["!moderation spam off", { spamFilter: false }],
  ])("%s", async (command, expected) => {
    await run(command);
    expect(getSettings(GROUP_ID)).toMatchObject(expected);
  });

  it.each([
    "!moderation threshold 5",
    "!moderation threshold abc",
    "!moderation warnlimit 0",
    "!moderation warnlimit 2.5",
    "!moderation delete maybe",
    "!moderation banana",
  ])("shows usage for invalid input: %s", async (command) => {
    await run(command);
    expect(sentTexts(client)[0]).toMatch(/Usage/);
    expect(getSettings(GROUP_ID)).toEqual(DEFAULT_SETTINGS);
  });

  it("rejects non-admins without changing anything", async () => {
    await commandHandler(client, makeMessage("!moderation on"));
    expect(sentTexts(client)[0]).toMatch(/admins only/);
    expect(getSettings(GROUP_ID).enabled).toBe(false);
  });

  it("notes when the bot isn't an admin and can't enforce", async () => {
    makeChat(client, { admins: [ADMIN_ID] });
    await run("!moderation on");
    expect(sentTexts(client)[0]).toMatch(/I'm not a group admin/);
  });
});

describe("!warnings / !resetwarnings / !modlog", () => {
  let client;

  beforeEach(() => {
    resetCooldowns();
    client = makeClient();
    makeChat(client);
  });

  it("shows and resets warnings for mentioned users", async () => {
    addWarning(GROUP_ID, USER_ID);
    addWarning(GROUP_ID, USER_ID);
    const mention = { mentionedIds: [USER_ID] };

    await commandHandler(client, asAdmin("!warnings @user", mention));
    expect(sentTexts(client)[0]).toMatch(/2\/\d+ warnings/);

    await commandHandler(client, asAdmin("!resetwarnings @user", mention));
    expect(getWarnings(GROUP_ID, USER_ID)).toBe(0);
  });

  it("asks for a mention when none is given", async () => {
    await commandHandler(client, asAdmin("!warnings"));
    expect(sentTexts(client)[0]).toMatch(/Please mention someone/);
  });

  it("lists recent moderation actions", async () => {
    logAction(GROUP_ID, {
      userId: USER_ID,
      category: "scam",
      severity: 0.9,
      reason: "Phishing link",
      source: "llm",
      actions: ["deleted", "warning 1/3"],
      excerpt: "free money",
    });
    await commandHandler(client, asAdmin("!modlog"));
    const text = sentTexts(client)[0];
    expect(text).toMatch(/scam \(0\.90\)/);
    expect(text).toMatch(/Phishing link/);
    expect(text).toMatch(/deleted, warning 1\/3/);
  });
});
