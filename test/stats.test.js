import { describe, it, expect, vi, beforeEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import {
  GLOBAL,
  increment,
  getGroupStats,
  getTotals,
  recordStartup,
  getLifetime,
} from "../src/utils/stats.js";
import { buildStatsText, formatDuration } from "../src/commands/general/stats.js";
import { commandHandler } from "../src/handlers/commandHandler.js";
import { resetCooldowns } from "../src/commands/cooldowns.js";
import { makeClient, makeChat, makeMessage, sentTexts, GROUP_ID } from "./helpers.js";

describe("stats storage", () => {
  it("counts per group and sums totals across groups", () => {
    increment("stats-a@g.us", "messages_seen", 5);
    increment("stats-a@g.us", "flagged");
    increment("stats-b@g.us", "messages_seen", 3);
    increment(GLOBAL, "ai_checks", 7);

    expect(getGroupStats("stats-a@g.us")).toEqual({ messages_seen: 5, flagged: 1 });

    const totals = getTotals();
    expect(totals.messages_seen).toBeGreaterThanOrEqual(8);
    expect(totals.ai_checks).toBeGreaterThanOrEqual(7);
    expect(totals.groups).toBeGreaterThanOrEqual(2);
  });

  it("does not count the global bucket as a group", () => {
    const before = getTotals().groups;
    increment(GLOBAL, "ai_cache_hits");
    expect(getTotals().groups).toBe(before);
  });

  it("records the first start once and counts every start", () => {
    recordStartup(1_000);
    recordStartup(2_000);
    const { firstStartedAt, startCount } = getLifetime();
    expect(firstStartedAt).toBe(1_000);
    expect(startCount).toBeGreaterThanOrEqual(2);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0m"],
    [59_999, "0m"],
    [5 * 60_000, "5m"],
    [(2 * 60 + 5) * 60_000, "2h 5m"],
    [((3 * 24 + 4) * 60 + 12) * 60_000, "3d 4h 12m"],
  ])("%i ms -> %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe("buildStatsText", () => {
  const lifetime = { firstStartedAt: Date.UTC(2026, 10, 18, 12), startCount: 4 };
  const totals = {
    groups: 3,
    messages_seen: 12345,
    flagged: 9,
    ai_checks: 900,
    ai_cache_hits: 80,
  };

  it("shows this group's numbers with a sorted category breakdown", () => {
    const text = buildStatsText({
      group: {
        messages_seen: 1200,
        messages_checked: 1000,
        flagged: 6,
        "flagged:spam": 4,
        "flagged:hate_speech": 2,
        deleted: 6,
        warned: 5,
        removed: 1,
        commands_run: 42,
      },
      totals,
      lifetime,
      uptimeMs: 26 * 60 * 60_000,
    });

    expect(text).toContain("*This group*");
    expect(text).toContain("• Messages seen: 1,200");
    expect(text).toContain("• Flagged: 6 (spam 4, hate speech 2)");
    expect(text).toContain("• Actions: 6 deleted, 5 warned, 1 removed");
    expect(text).toContain("• Groups: 3");
    expect(text).toContain("• Messages seen: 12,345");
    expect(text).toContain("• AI checks: 900 (cache saved 80 calls)");
    expect(text).toContain("Up for 1d 2h 0m");
    expect(text).toContain("On duty since 18 Nov 2026 (4 starts)");
    expect(text).toContain("Order has been maintained");
  });

  it("is wholesome when nothing was flagged", () => {
    const text = buildStatsText({
      group: { messages_seen: 10 },
      totals,
      lifetime,
      uptimeMs: 0,
    });
    expect(text).toContain("• Flagged: 0\n");
    expect(text).toContain("Suspiciously wholesome");
  });

  it("shows only bot-wide stats in a direct message", () => {
    const text = buildStatsText({ group: null, totals, lifetime, uptimeMs: 0 });
    expect(text).not.toContain("This group");
    expect(text).toContain("Across all groups");
  });
});

describe("!stats command", () => {
  beforeEach(() => resetCooldowns());

  it("replies with this group's stats and counts itself as a command", async () => {
    const client = makeClient();
    makeChat(client);
    const before = getGroupStats(GROUP_ID).commands_run || 0;

    await commandHandler(client, makeMessage("!stats"));

    expect(getGroupStats(GROUP_ID).commands_run).toBe(before + 1);
    expect(sentTexts(client)[0]).toMatch(/📊 \*Bot stats\*[\s\S]*This group/);
  });
});

describe("database migrations", () => {
  it("upgrades an existing version 1 database without losing data", async () => {
    const { migrations } = await import("../src/db/index.js");
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wa-bot-")), "old.db");

    // Build a database as it looked before stats existed.
    const old = new Database(file);
    old.exec(migrations[0]);
    old.pragma("user_version = 1");
    old.prepare(
      "INSERT INTO warnings (group_id, user_id, count, updated_at) VALUES ('g', 'u', 2, 0)"
    ).run();
    old.close();

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.resetModules();
    vi.stubEnv("DB_PATH", file);
    const { default: db, closeDb } = await import("../src/db/index.js");

    expect(db.pragma("user_version", { simple: true })).toBe(migrations.length);
    expect(db.prepare("SELECT count FROM warnings").get().count).toBe(2);
    expect(() => db.prepare("SELECT * FROM stats").all()).not.toThrow();

    closeDb();
    vi.unstubAllEnvs();
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  });
});
