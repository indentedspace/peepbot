import { discordOptions } from "./config";
import Discord from "discord.io";
import emoji from "node-emoji";

import log from "./log";
import {
  addMonitor,
  startInterval,
  listMonitorsForUser,
  removeMonitor,
} from "./monitor";

const getClient = async () => {
  const bot = new Discord.Client(discordOptions);

  bot.on("connect", () => log("connected"));
  bot.on("disconnect", () => {
    log("disconnected");

    setTimeout(() => {
      bot.connect();
    }, 5000);
  });

  bot.on("ready", () => {
    log(`logged in as ${bot.username} - ${bot.id}`);
    startInterval((server) => {
      bot.sendMessage({
        to: server.channelID,
        message: `<@!${server.userID}> :eyes: ${server.serverUri} is ${
          server.status === "UP"
            ? ":thumbup: **UP** :thumbup:"
            : ":thumbdown: **DOWN** :thumbdown:"
        } :eyes:`,
      });
    });
  });

  bot.on("message", async (user, userID, channelID, message, event) => {
    const userMentionRegExp = new RegExp(`^<@!${bot.id}>`);
    const roleMentionRegExp = /^<@&([0-9]{18})>/;

    const channel = bot.channels[channelID];
    const server = bot.servers[channel.guild_id];
    const member = server.members[bot.id];
    const roles = member.roles;

    const roleMatch = roleMentionRegExp.exec(message);
    const roleMentioned = roleMatch ? roles.includes(roleMatch[1]) : false;
    const userMentioned = userMentionRegExp.test(message);
    const hasBeenMentioned = userMentioned || roleMentioned;
    const messageID: string = event.d.id;

    log("got message", message, roleMentioned, userMentioned, hasBeenMentioned);

    if (hasBeenMentioned) {
      const words = message
        .split(/\s+/)
        .filter((word) => !/^<@[!&][0-9]{18}>/.test(word));

      log("got words", words);

      const command = words[0]?.toLowerCase();

      switch (command) {
        case "add":
          const addServer = words[1];
          const httpsRegExp = /^https?:\/\/[a-z0-9-.:@\/]+$/;
          if (!addServer) {
            bot.sendMessage({
              to: channelID,
              message: `<@!${userID}> Missing server details \`@peep add <url>\``,
            });
          } else if (!httpsRegExp.test(addServer)) {
            bot.sendMessage({
              to: channelID,
              message: `<@!${userID}> Url should start with http(s):// \`@peep add <url>\``,
            });
          } else {
            // add server to monitor
            bot.addReaction({
              channelID,
              messageID,
              reaction: emoji.get("eyes"),
            });
            await addMonitor(userID, channelID, addServer);
            bot.sendMessage({
              to: channelID,
              message: `<@!${userID}> :eyes: now monitoring <${addServer}> :eyes:`,
            });
          }
          break;
        case "list":
          // list all servers for user
          const list = await listMonitorsForUser(userID, channelID);
          if (Object.keys(list).length) {
            let message = `<@!${userID}> Here are the servers I'm monitoring for you in this channel:\n`;
            Object.keys(list).forEach((id, index) => {
              const server = list[id];
              const lastUp = server.lastUp
                ? Math.floor(
                    (new Date().getTime() - server.lastUp) / (1000 * 60)
                  )
                : -1;
              message += `\n${index + 1}) <${server.serverUri}> - **${
                server.status
              }** - (Last seen: ${
                lastUp >= 0
                  ? lastUp > 0
                    ? `${lastUp} minutes ago`
                    : `less than a minute ago`
                  : "Never"
              })`;
            });
            bot.sendMessage({
              to: channelID,
              message,
            });
          } else {
            bot.sendMessage({
              to: channelID,
              message: `<@!${userID}> I'm not monitoring any servers for you in this channel.`,
            });
          }
          break;
        case "remove":
          // remove server from list
          const removeServer = words[1];
          if (!removeServer) {
            bot.sendMessage({
              to: channelID,
              message: `<@!${userID}> Missing server details \`@peep remove <url>\``,
            });
          } else {
            bot.addReaction({
              channelID,
              messageID,
              reaction: emoji.get("eyes"),
            });

            const monitors = await listMonitorsForUser(userID, channelID);
            let id = "";
            Object.keys(monitors).forEach((key) => {
              const monitor = monitors[key];
              if (removeServer === monitor.serverUri) id = monitor.id;
            });

            if (!id.length) {
              bot.sendMessage({
                to: channelID,
                message: `<@!${userID}> can't find that url to remove it!`,
              });
            } else {
              await removeMonitor(id);
              bot.sendMessage({
                to: channelID,
                message: `<@!${userID}> :eyes: no longer monitoring <${removeServer}> :eyes:`,
              });
            }
          }
          break;
        case "help":
          // help
          bot.sendMessage({
            to: channelID,
            message: `<@!${userID}> Hello, i'm peep! Please mention me with your requests.\nI can track webservers for you and let you know when anything changes.\n  \\* add: @peep add <url>\n  \\* list: @peep list\n  \\* remove: @peep remove <url>`,
          });
          break;
        default:
          bot.sendMessage({
            to: channelID,
            message: `<@!${userID}> Unknown command "${command}"`,
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
