import { vi } from "vitest";

export const GROUP_ID = "120363000000000000@g.us";
export const BOT_ID = "910000000000@c.us";
export const ADMIN_ID = "911111111111@c.us";
export const USER_ID = "912222222222@c.us";

/**
 * Fake whatsapp-web.js client. `lidMap` maps an id to { lid, pn } for
 * getContactLidAndPhone.
 */
export const makeClient = ({ lidMap = {} } = {}) => ({
  info: { wid: { _serialized: BOT_ID } },
  sendMessage: vi.fn(async () => ({ delete: vi.fn() })),
  getContactLidAndPhone: vi.fn(async ([id]) => [lidMap[id] || {}]),
  getChatById: vi.fn(),
});

/** Fake group chat. `admins` / `members` are lists of serialized ids. */
export const makeChat = (
  client,
  { admins = [ADMIN_ID, BOT_ID], members = [USER_ID], isGroup = true } = {}
) => {
  const chat = {
    client,
    isGroup,
    id: { _serialized: GROUP_ID },
    participants: [
      ...admins.map((id) => ({ id: { _serialized: id }, isAdmin: true })),
      ...members.map((id) => ({ id: { _serialized: id }, isAdmin: false })),
    ],
    removeParticipants: vi.fn(async () => {}),
  };
  client.getChatById.mockResolvedValue(chat);
  return chat;
};

export const makeMessage = (body, overrides = {}) => ({
  body,
  from: GROUP_ID,
  author: USER_ID,
  type: "chat",
  mentionedIds: [],
  delete: vi.fn(async () => {}),
  reply: vi.fn(async () => {}),
  ...overrides,
});

/** All texts the fake client sent, in order. */
export const sentTexts = (client) =>
  client.sendMessage.mock.calls.map(([, text]) => text);
