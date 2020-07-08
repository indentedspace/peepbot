import Discord from "discord.io";
import emoji from "node-emoji";

import log from "./log";
import {
  startInterval,
  addMonitor,
  listMonitorsForUser,
  removeMonitor,
} from "./monitor";

const getTimeFromMs = (ms: number) => {
  const minutes = 1000 * 60;
  const hours = 1000 * 60 * 60;
  const days = 1000 * 60 * 60 * 24;
  const twoHours = hours * 2;
  const threeDays = days * 3;

  if (ms > threeDays) return `${Math.floor(ms / days)} days`;
  if (ms > twoHours) return `${Math.floor(ms / hours)} hours`;
  return `${Math.floor(ms / minutes)} minutes`;
};

export const onReady = (bot: Discord.Client) => {
  log(`logged in as ${bot.username} - ${bot.id}`);
  startInterval((server) => {
    bot.sendMessage({
      to: server.channelID,
      message: `<@!${server.userID}> :eyes: <${server.serverUri}> is ${
        server.status === "UP"
          ? ":thumbup: **UP** :thumbup:"
          : ":thumbdown: **DOWN** :thumbdown:"
      } :eyes:`,
    });
  });
};

export const onMessage = async (
  bot: Discord.Client,
  user: string,
  userID: string,
  channelID: string,
  message: string,
  event: any
) => {
  const userMentionRegExp = new RegExp(`^<@!?${bot.id}>`);
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

  // log("got message", message, hasBeenMentioned);

  if (hasBeenMentioned) {
    const words = message
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => !/^<@[!&]?[0-9]{18}>/.test(word));

    // log("got words", words);
    const command = words[0];

    switch (command) {
      case "add":
        add(bot, userID, channelID, messageID, words);
        break;
      case "list":
        list(bot, userID, channelID);
        break;
      case "remove":
        remove(bot, userID, channelID, messageID, words);
        break;
      case "help":
        help(bot, userID, channelID);
        break;
      default:
        bot.sendMessage({
          to: channelID,
          message: `<@!${userID}> Unknown command "${command}"`,
        });
        break;
    }
  }
};

const add = async (
  bot: Discord.Client,
  userID: string,
  channelID: string,
  messageID: string,
  words: string[]
) => {
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
};

const list = async (bot: Discord.Client, userID: string, channelID: string) => {
  const list = await listMonitorsForUser(userID, channelID);
  if (Object.keys(list).length) {
    let message = `<@!${userID}> Here are the servers I'm monitoring for you in this channel:\n`;
    Object.keys(list).forEach((id, index) => {
      const server = list[id];
      const lastUp = server.lastUp
        ? getTimeFromMs(new Date().getTime() - server.lastUp)
        : undefined;
      const upSince = server.upSince
        ? getTimeFromMs(new Date().getTime() - server.upSince)
        : undefined;
      if (server.status === "DOWN") {
        message += `\n${index + 1}) <${
          server.serverUri
        }> - **DOWN** - (Last seen: ${lastUp ? `${lastUp} ago` : "Never"})`;
      } else if (server.status === "UP") {
        message += `\n${index + 1}) <${server.serverUri}> - **UP** - (Up for: ${
          upSince ? `At least ${upSince}` : `?????`
        })`;
      }
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
};

const remove = async (
  bot: Discord.Client,
  userID: string,
  channelID: string,
  messageID: string,
  words: string[]
) => {
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
};

const help = (bot: Discord.Client, userID: string, channelID: string) => {
  bot.sendMessage({
    to: channelID,
    message: `<@!${userID}> Hello, i'm peep! Please mention me with your requests.\nI can track webservers for you and let you know when anything changes.\n  \\* add: @peep add <url>\n  \\* list: @peep list\n  \\* remove: @peep remove <url>`,
  });
};
