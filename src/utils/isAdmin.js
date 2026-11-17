// WhatsApp identifies users either by phone number ("91xxxxxxxxxx@c.us") or by
// an anonymous Linked ID ("1234567890@lid"). A message author, a mention and a
// group participant can each use a different form for the same person, so IDs
// must be resolved to both forms before comparing.

const idCache = new Map(); // any known id -> Set of all ids for that user

export const resolveIds = async (client, userId) => {
  if (idCache.has(userId)) return idCache.get(userId);

  const ids = new Set([userId]);
  try {
    const [result] = await client.getContactLidAndPhone([userId]);
    if (result?.lid) ids.add(result.lid);
    if (result?.pn) ids.add(result.pn);
  } catch (error) {
    console.warn(`Could not resolve LID/phone for ${userId}:`, error.message);
  }

  for (const id of ids) idCache.set(id, ids);
  return ids;
};

export const isSameUser = async (client, a, b) => {
  if (a === b) return true;
  return (await resolveIds(client, a)).has(b);
};

const findParticipant = async (chat, userId) => {
  const direct = chat.participants.find((p) => p.id._serialized === userId);
  if (direct) return direct;

  const ids = await resolveIds(chat.client, userId);
  return chat.participants.find((p) => ids.has(p.id._serialized));
};

const isAdmin = async (chat, userId) => {
  const participant = await findParticipant(chat, userId);
  return participant?.isAdmin || participant?.isSuperAdmin || false;
};

export default isAdmin;
