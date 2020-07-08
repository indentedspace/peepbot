import Discord from "discord.io";

import { discordOptions } from "./config";
import log from "./log";
import { onReady, onMessage } from "./responses";

const getClient = async () => {
  const bot = new Discord.Client(discordOptions);

  bot.on("connect", () => log("connected"));
  bot.on("disconnect", () => {
    log("disconnected");

    setTimeout(() => {
      bot.connect();
    }, 5000);
  });

  bot.on("ready", () => onReady(bot));

  bot.on("message", (user, userID, channelID, message, event) =>
    onMessage(bot, user, userID, channelID, message, event)
  );
};

getClient();

setTimeout(() => {
  log("ending script for the day");
  process.exit();
}, 1000 * 60 * 60 * 24);
