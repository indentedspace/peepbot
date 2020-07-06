import Redis from "redis";

import log from "./log";

const redisOptions = {
  hostName: "redis",
  port: 6379,
};

const getClient = () => {
  return new Promise<Redis.RedisClient>((resolve, reject) => {
    try {
      const client = Redis.createClient(redisOptions);
      client.on("ready", () => resolve(client));
      client.on("error", (error) => log(error));
    } catch (e) {
      reject(e);
    }
  });
};

export const set = (key: string, value: string) => {
  return new Promise<"OK">(async (resolve, reject) => {
    try {
      const client = await getClient();
      client.set(key, value, (err, data) => {
        client.quit();
        if (err) {
          reject(err);
          return;
        }

        resolve(data);
      });
    } catch (e) {
      reject(e);
    }
  });
};

export const get = (key: string) => {
  return new Promise<string | null>(async (resolve, reject) => {
    try {
      const client = await getClient();
      client.get(key, (err, data) => {
        client.quit();

        if (err) {
          reject(err);
          return;
        }

        resolve(data);
      });
    } catch (e) {
      reject(e);
    }
  });
};
