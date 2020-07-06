import axios from "axios";
import { discordOptions } from "./config";
import Discord from "discord.io";
import emoji from "node-emoji";

import log from "./log";

const getClient = async () => {
  const bot = new Discord.Client(discordOptions);

  bot.on("connect", () => log("connected"));
  bot.on("disconnect", () => {
    log("disconnected");

    setTimeout(() => {
      bot.connect();
    }, 5000);
  });

  bot.on("ready", () => log(`logged in as ${bot.username} - ${bot.id}`));

  bot.on("message", async (user, userID, channelID, message, event) => {
    const mentionRegExp = new RegExp(`^<@!${bot.id}>`);
    const hasBeenMentioned = mentionRegExp.test(message);
    const messageID: string = event.d.id;

    if (hasBeenMentioned) {
      const words = message
        .split(/\s{1,}/)
        .filter((word) => !mentionRegExp.test(word));

      const command = words[0]?.toLowerCase();

      switch (command) {
        case "add":
          // add server to watch
          const addServer = words[1];
          if (!addServer) {
            bot.sendMessage({
              to: channelID,
              message: `Missing server details \`@peep add <url>\``,
            });
            break;
          } else {
            // add server to monitor
            bot.addReaction({
              channelID,
              messageID,
              reaction: emoji.get("ok"),
            });
          }
          break;
        case "list":
          // list all servers for user
          bot.sendMessage({
            to: channelID,
            message: "list",
          });
          break;
        case "remove":
          // remove server from list
          const removeServer = words[1];
          if (!removeServer) {
            bot.sendMessage({
              to: channelID,
              message: `Missing server details \`@peep remove <url | index>\``,
            });
          } else {
            // add server to monitor
            bot.addReaction({
              channelID,
              messageID,
              reaction: emoji.get("ok"),
            });
          }
          break;
        case "help":
          // help
          bot.sendMessage({
            to: channelID,
            message: `hello, i'm peep! please mention me with your requests\n\`\`\`\n  * add: @peep add <url>\n  * list: @peep list\n  * remove: @peep remove <url | index>\n\`\`\``,
          });
          break;
        default:
          bot.sendMessage({
            to: channelID,
            message: `Unknown command "${command}"`,
          });
          break;
      }
    }
  });
};

getClient();

setTimeout(() => {
  log("ending script for the day");
  process.exit();
}, 1000 * 60 * 60 * 24);
