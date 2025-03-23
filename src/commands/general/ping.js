const ping = async (client, message) => {
  await client.sendMessage(message.from, "Pong!");
};

export default ping;