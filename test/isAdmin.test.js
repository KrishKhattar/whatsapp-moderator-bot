import { describe, it, expect, vi } from "vitest";
import isAdmin, { isSameUser, resolveIds } from "../src/utils/isAdmin.js";

// isAdmin.js caches resolved ids at module level, so tests use distinct ids.
const makeClient = (lidMap = {}) => ({
  getContactLidAndPhone: vi.fn(async ([id]) => [lidMap[id] || {}]),
});

const makeChat = (client, participants) => ({
  client,
  participants: participants.map(([id, flags]) => ({
    id: { _serialized: id },
    ...flags,
  })),
});

describe("isAdmin", () => {
  it("matches participants by exact id without a lookup", async () => {
    const client = makeClient();
    const chat = makeChat(client, [["100@c.us", { isAdmin: true }]]);
    expect(await isAdmin(chat, "100@c.us")).toBe(true);
    expect(client.getContactLidAndPhone).not.toHaveBeenCalled();
  });

  it("treats super admins (group creators) as admins", async () => {
    const chat = makeChat(makeClient(), [["101@c.us", { isSuperAdmin: true }]]);
    expect(await isAdmin(chat, "101@c.us")).toBe(true);
  });

  it("returns false for regular members", async () => {
    const chat = makeChat(makeClient(), [["102@c.us", { isAdmin: false }]]);
    expect(await isAdmin(chat, "102@c.us")).toBe(false);
  });

  it("finds an admin listed by phone when the message uses their LID", async () => {
    const client = makeClient({
      "555@lid": { lid: "555@lid", pn: "919900000000@c.us" },
    });
    const chat = makeChat(client, [["919900000000@c.us", { isAdmin: true }]]);
    expect(await isAdmin(chat, "555@lid")).toBe(true);
  });

  it("finds an admin listed by LID when the message uses their phone id", async () => {
    const client = makeClient({
      "918800000000@c.us": { lid: "666@lid", pn: "918800000000@c.us" },
    });
    const chat = makeChat(client, [["666@lid", { isAdmin: true }]]);
    expect(await isAdmin(chat, "918800000000@c.us")).toBe(true);
  });

  it("returns false for unknown users", async () => {
    const chat = makeChat(makeClient(), [["103@c.us", { isAdmin: true }]]);
    expect(await isAdmin(chat, "999@lid")).toBe(false);
  });

  it("returns false instead of throwing when the lookup fails", async () => {
    const client = {
      getContactLidAndPhone: vi.fn(async () => {
        throw new Error("Execution context was destroyed");
      }),
    };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const chat = makeChat(client, [["104@c.us", { isAdmin: true }]]);
    expect(await isAdmin(chat, "777@lid")).toBe(false);
  });
});

describe("isSameUser / resolveIds", () => {
  it("recognises the phone and LID forms of one person", async () => {
    const client = makeClient({
      "888@lid": { lid: "888@lid", pn: "917700000000@c.us" },
    });
    expect(await isSameUser(client, "888@lid", "917700000000@c.us")).toBe(true);
    expect(await isSameUser(client, "888@lid", "123@c.us")).toBe(false);
  });

  it("caches lookups for every form of the id", async () => {
    const client = makeClient({
      "889@lid": { lid: "889@lid", pn: "917711111111@c.us" },
    });
    await resolveIds(client, "889@lid");
    await resolveIds(client, "889@lid");
    await resolveIds(client, "917711111111@c.us");
    expect(client.getContactLidAndPhone).toHaveBeenCalledTimes(1);
  });
});
