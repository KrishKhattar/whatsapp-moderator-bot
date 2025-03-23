import * as adminCommands from "../commands/admin/index.js";
import * as generalCommands from "../commands/general/index.js";

export const commandHandler = async (client, message) => {
  const [command, ...args] = message.body.slice(1).trim().split(/\s+/);

  switch (command) {
    case "promote":
      await adminCommands.promote(client, message);
      break;
    case "demote":
      await adminCommands.demote(client, message);
      break;
    case "kick":
      await adminCommands.kick(client, message);
      break;
    case "ping":
      await generalCommands.ping(client, message);
      break;
    case "mentionAll":
      await generalCommands.mentionAll(client, message);
      break;
    case "summarize":
      await generalCommands.summarize(client, message);
      break;
    case "help":
      await generalCommands.help(client, message);
      break;
    case "prompt":
      await generalCommands.prompt(client, message);
      break;
    case "askGemini":
      await generalCommands.askGeminiCommand(client, message);
      break;
    default:
      client.sendMessage(
        message.from,
        "Unknown command. Type !help for a list of commands."
      );
  }
};
