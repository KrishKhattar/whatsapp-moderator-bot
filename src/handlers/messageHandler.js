import { commandHandler } from "./commandHandler.js";

const messageHandler = async (client, message) => {
  if (message.body.startsWith("!")) {
    await commandHandler(client, message);
  }


  
};

export default messageHandler;
