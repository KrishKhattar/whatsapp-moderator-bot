import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  makeClient,
  makeChat,
  makeMessage,
  sentTexts,
  GROUP_ID,
  ADMIN_ID,
  BOT_ID,
  USER_ID,
} from "./helpers.js";

vi.mock("../src/moderation/classifier.js", () => ({ classifyMessage: vi.fn() }));

const { classifyMessage } = await import("../src/moderation/classifier.js");
const { moderateMessage } = await import("../src/moderation/moderator.js");
const settings = await import("../src/moderation/settings.js");

const verdict = (category, severity = 0.9) => ({ category, severity, reason: "test" });

describe("moderateMessage", () => {
  let client, chat;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    classifyMessage.mockReset();
    client = makeClient();
    chat = makeChat(client);
    settings.updateSettings(GROUP_ID, {
      ...settings.DEFAULT_SETTINGS,
      enabled: true,
      spamFilter: false, // spam is covered separately below
    });
    settings.resetWarnings(GROUP_ID, USER_ID);
  });

  it("does nothing when moderation is disabled for the group", async () => {
    settings.updateSettings(GROUP_ID, { enabled: false });
    classifyMessage.mockResolvedValue(verdict("threat"));
    expect(await moderateMessage(client, chat, makeMessage("bad"))).toBe(false);
    expect(classifyMessage).not.toHaveBeenCalled();
  });

  it("exempts group admins", async () => {
    classifyMessage.mockResolvedValue(verdict("threat"));
    const msg = makeMessage("bad", { author: ADMIN_ID });
    expect(await moderateMessage(client, chat, msg)).toBe(false);
    expect(classifyMessage).not.toHaveBeenCalled();
  });

  it("lets harmless messages through", async () => {
    classifyMessage.mockResolvedValue(verdict("none", 0));
    const msg = makeMessage("kal milte hai");
    expect(await moderateMessage(client, chat, msg)).toBe(false);
    expect(msg.delete).not.toHaveBeenCalled();
  });

  it("ignores verdicts below the group's threshold", async () => {
    settings.updateSettings(GROUP_ID, { threshold: 0.8 });
    classifyMessage.mockResolvedValue(verdict("harassment", 0.6));
    expect(await moderateMessage(client, chat, makeMessage("meh"))).toBe(false);
  });

  it("fails open when the classifier is unavailable", async () => {
    classifyMessage.mockResolvedValue(null);
    expect(await moderateMessage(client, chat, makeMessage("anything"))).toBe(false);
  });

  it("deletes, warns and logs a flagged message", async () => {
    classifyMessage.mockResolvedValue(verdict("hate_speech"));
    const msg = makeMessage("hateful text");

    expect(await moderateMessage(client, chat, msg)).toBe(true);
    expect(msg.delete).toHaveBeenCalledWith(true);
    expect(sentTexts(client)[0]).toMatch(/flagged for hate speech\. 1\/3 warnings/);
    expect(settings.getWarnings(GROUP_ID, USER_ID)).toBe(1);

    const [entry] = settings.getAuditLog(GROUP_ID, 1);
    expect(entry).toMatchObject({
      userId: USER_ID,
      category: "hate_speech",
      actions: ["deleted", "warning 1/3"],
    });
  });

  it("records stats for checked and flagged messages", async () => {
    const { getGroupStats } = await import("../src/utils/stats.js");
    const before = getGroupStats(GROUP_ID);
    const delta = (metric) => (getGroupStats(GROUP_ID)[metric] || 0) - (before[metric] || 0);

    classifyMessage.mockResolvedValueOnce(verdict("none", 0));
    await moderateMessage(client, chat, makeMessage("hello"));
    classifyMessage.mockResolvedValueOnce(verdict("scam"));
    await moderateMessage(client, chat, makeMessage("free money"));

    expect(delta("messages_checked")).toBe(2);
    expect(delta("flagged")).toBe(1);
    expect(delta("flagged:scam")).toBe(1);
    expect(delta("deleted")).toBe(1);
    expect(delta("warned")).toBe(1);
  });

  it("removes the user on reaching the warn limit and resets their warnings", async () => {
    settings.updateSettings(GROUP_ID, { warnLimit: 2 });
    classifyMessage.mockResolvedValue(verdict("threat"));

    await moderateMessage(client, chat, makeMessage("threat one"));
    expect(chat.removeParticipants).not.toHaveBeenCalled();

    await moderateMessage(client, chat, makeMessage("threat two"));
    expect(chat.removeParticipants).toHaveBeenCalledWith([USER_ID]);
    expect(sentTexts(client).at(-1)).toMatch(/removed after 2 warnings/);
    expect(settings.getWarnings(GROUP_ID, USER_ID)).toBe(0);
  });

  it("keeps the message when message deletion is turned off", async () => {
    settings.updateSettings(GROUP_ID, { deleteMessages: false });
    classifyMessage.mockResolvedValue(verdict("harassment"));
    const msg = makeMessage("rude");
    await moderateMessage(client, chat, msg);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(settings.getWarnings(GROUP_ID, USER_ID)).toBe(1);
  });

  it("only warns when the bot is not a group admin", async () => {
    chat = makeChat(client, { admins: [ADMIN_ID], members: [BOT_ID, USER_ID] });
    settings.updateSettings(GROUP_ID, { warnLimit: 1 });
    classifyMessage.mockResolvedValue(verdict("harassment"));
    const msg = makeMessage("rude");

    expect(await moderateMessage(client, chat, msg)).toBe(true);
    expect(msg.delete).not.toHaveBeenCalled();
    expect(chat.removeParticipants).not.toHaveBeenCalled();
    expect(sentTexts(client)[0]).toMatch(/Make me an admin/);
  });

  it("replies with support for self-harm instead of punishing", async () => {
    settings.updateSettings(GROUP_ID, { threshold: 0.95 }); // still triggers
    classifyMessage.mockResolvedValue(verdict("self_harm", 0.6));
    const msg = makeMessage("I don't want to live anymore");

    expect(await moderateMessage(client, chat, msg)).toBe(false);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringMatching(/helpline/i));
    expect(msg.delete).not.toHaveBeenCalled();
    expect(settings.getWarnings(GROUP_ID, USER_ID)).toBe(0);
  });

  it("skips the classifier for media messages", async () => {
    const msg = makeMessage("", { type: "image" });
    expect(await moderateMessage(client, chat, msg)).toBe(false);
    expect(classifyMessage).not.toHaveBeenCalled();
  });

  describe("spam", () => {
    it("catches spam locally without calling the classifier", async () => {
      settings.updateSettings(GROUP_ID, { spamFilter: true });
      const mentions = ["a", "b", "c", "d", "e", "f"].map((x) => `${x}@c.us`);
      const msg = makeMessage("wake up", { author: "spammer1@c.us", mentionedIds: mentions });

      expect(await moderateMessage(client, chat, msg)).toBe(true);
      expect(classifyMessage).not.toHaveBeenCalled();
      expect(msg.delete).toHaveBeenCalled();
      expect(sentTexts(client)[0]).toMatch(/flagged for spam/);
    });

    it("warns once per cooldown while someone is flooding", async () => {
      settings.updateSettings(GROUP_ID, { spamFilter: true, warnLimit: 10 });
      const author = "spammer2@c.us";
      for (let i = 0; i < 5; i++) {
        await moderateMessage(client, chat, makeMessage("buy now", { author }));
      }
      // Messages 3, 4 and 5 are spam, but only the first gets a warning.
      expect(settings.getWarnings(GROUP_ID, author)).toBe(1);
      expect(sentTexts(client)).toHaveLength(1);
    });
  });
});
