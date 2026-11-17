import { describe, it, expect } from "vitest";
import {
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings,
  getWarnings,
  addWarning,
  resetWarnings,
  logAction,
  getAuditLog,
} from "../src/moderation/settings.js";
import {
  addMessageToHistory,
  getChatHistory,
  clearChatHistory,
} from "../src/utils/chathistory.js";

// Runs against an in-memory SQLite database (DB_PATH=":memory:" in vitest.config.js).
// Each test uses its own group id so tests don't share rows.

describe("group settings", () => {
  it("returns defaults for a group with no saved settings", () => {
    expect(getSettings("settings-1@g.us")).toEqual(DEFAULT_SETTINGS);
  });

  it("saves partial updates and keeps the other values", () => {
    const g = "settings-2@g.us";
    updateSettings(g, { enabled: true });
    updateSettings(g, { threshold: 0.5, warnLimit: 5 });
    expect(getSettings(g)).toEqual({
      ...DEFAULT_SETTINGS,
      enabled: true,
      threshold: 0.5,
      warnLimit: 5,
    });
  });

  it("stores booleans correctly when turned off", () => {
    const g = "settings-3@g.us";
    updateSettings(g, { enabled: true, deleteMessages: false, spamFilter: false });
    const s = getSettings(g);
    expect(s.deleteMessages).toBe(false);
    expect(s.spamFilter).toBe(false);
  });
});

describe("warnings", () => {
  it("counts per user and per group", () => {
    const g = "warn-1@g.us";
    expect(getWarnings(g, "a@c.us")).toBe(0);
    expect(addWarning(g, "a@c.us")).toBe(1);
    expect(addWarning(g, "a@c.us")).toBe(2);
    expect(addWarning(g, "b@c.us")).toBe(1);
    expect(getWarnings("warn-other@g.us", "a@c.us")).toBe(0);
  });

  it("resets a single user's warnings", () => {
    const g = "warn-2@g.us";
    addWarning(g, "a@c.us");
    addWarning(g, "b@c.us");
    resetWarnings(g, "a@c.us");
    expect(getWarnings(g, "a@c.us")).toBe(0);
    expect(getWarnings(g, "b@c.us")).toBe(1);
  });
});

describe("audit log", () => {
  const entry = (reason) => ({
    userId: "u@c.us",
    category: "spam",
    severity: 1,
    reason,
    source: "spam-filter",
    actions: ["deleted", "warning 1/3"],
    excerpt: "buy now",
  });

  it("returns the most recent entries, oldest first, with parsed fields", () => {
    const g = "log-1@g.us";
    ["first", "second", "third"].forEach((r) => logAction(g, entry(r)));
    const log = getAuditLog(g, 2);
    expect(log.map((e) => e.reason)).toEqual(["second", "third"]);
    expect(log[0].at).toBeInstanceOf(Date);
    expect(log[0].actions).toEqual(["deleted", "warning 1/3"]);
  });

  it("keeps only the latest 500 entries per group", () => {
    const g = "log-2@g.us";
    for (let i = 0; i < 510; i++) logAction(g, entry(`r${i}`));
    const log = getAuditLog(g, 1000);
    expect(log).toHaveLength(500);
    expect(log[0].reason).toBe("r10");
    expect(log.at(-1).reason).toBe("r509");
  });
});

describe("chat history", () => {
  const add = (g, body) =>
    addMessageToHistory(g, { authorId: "u@c.us", name: "Krish", body });

  it("returns messages in order with author details", () => {
    const g = "history-1@g.us";
    add(g, "hello");
    add(g, "world");
    expect(getChatHistory(g)).toEqual([
      { authorId: "u@c.us", name: "Krish", body: "hello" },
      { authorId: "u@c.us", name: "Krish", body: "world" },
    ]);
  });

  it("keeps only the latest 300 messages per group", () => {
    const g = "history-2@g.us";
    for (let i = 0; i < 320; i++) add(g, `m${i}`);
    const history = getChatHistory(g);
    expect(history).toHaveLength(300);
    expect(history[0].body).toBe("m20");
    expect(history.at(-1).body).toBe("m319");
  });

  it("clears one group without touching others", () => {
    add("history-3@g.us", "a");
    add("history-4@g.us", "b");
    clearChatHistory("history-3@g.us");
    expect(getChatHistory("history-3@g.us")).toEqual([]);
    expect(getChatHistory("history-4@g.us")).toHaveLength(1);
  });
});
