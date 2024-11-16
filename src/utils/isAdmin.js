const isAdmin = async (chat, userId) => {
  const participant = chat.participants.find(
    (p) => p.id._serialized === userId
  );
  return participant?.isAdmin || participant?.isSuperAdmin || false;
};

export default isAdmin;
