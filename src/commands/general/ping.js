const ping = async (client, message) => {
    await client.sendMessage(message.reply, "Pong!");
  };
  
  export default ping;
  