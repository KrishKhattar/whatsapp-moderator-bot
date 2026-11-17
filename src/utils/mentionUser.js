// Turns "@<number>" handles in AI-generated text into real WhatsApp mentions.
//
// WhatsApp only renders a tag when the text contains "@<user part of the id>"
// AND that id is passed in the `mentions` option. IDs can be phone-based
// ("919876543210@c.us") or Linked IDs ("123456789@lid"), so we map each
// handle back to the exact id that appeared in the chat.

export const handleFor = (userId) => userId.split("@")[0];

/**
 * @param {string} text AI output referring to people as @<handle>
 * @param {Map<string, string>} handleToId handle -> full WhatsApp id
 * @returns {{ text: string, mentions: string[] }}
 */
const resolveUserMentions = (text, handleToId) => {
  const mentions = new Set();

  // Normalise forms the model sometimes produces: "@123@c.us", "123@lid",
  // "@ 123", or the bare number without "@".
  const resolved = text.replace(
    /(?:@\s?)?\b(\d{6,})(?:@(?:c\.us|lid|s\.whatsapp\.net))?/g,
    (match, handle) => {
      const id = handleToId.get(handle);
      if (!id) return match; // not a participant (e.g. a phone number someone shared)
      mentions.add(id);
      return `@${handle}`;
    }
  );

  return { text: resolved, mentions: [...mentions] };
};

export default resolveUserMentions;

/** "@<user part>" text for a WhatsApp id, e.g. "919876543210@c.us" -> "@919876543210". */
export const tag = (userId) => `@${handleFor(userId)}`;
