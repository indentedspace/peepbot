import axios from "axios";
import { hgetall, hset, hdel } from "./redis";
import log from "./log";

const DEFAULT_INTERVAL = 1000 * 60;
const key = "peepbot-monitor";

export const addMonitor = async (
  userID: string,
  channelID: string,
  serverUri: string
) => {
  const monitorList = await listMonitors();
  const monitorArray = Object.keys(monitorList).map((id) => monitorList[id]);
  const monitorExists =
    monitorArray.findIndex(
      (elem) =>
        userID === elem.userID &&
        channelID === elem.channelID &&
        serverUri === elem.serverUri
    ) >= 0;

  if (monitorExists) return;

  const timeAdded = new Date().getTime();
  const id = userID + channelID + timeAdded;

  const monitor: ServerMonitor = {
    id,
    userID,
    channelID,
    serverUri,
    timeAdded,
    status: "DOWN",
  };

  await hset(key, id, JSON.stringify(monitor));
};

const updateMonitor = async (monitor: ServerMonitor) => {
  await hset(key, monitor.id, JSON.stringify(monitor));
};

export const removeMonitor = async (id: string) => {
  await hdel(key, id);
};

export const listMonitors = async () => {
  const strings = await hgetall(key);
  let monitors: Record<string, ServerMonitor> = {};

  if (!strings) return monitors;

  Object.keys(strings).forEach((string) => {
    monitors[string] = JSON.parse(strings[string]);
  });
  return monitors;
};

export const listMonitorsForUser = async (
  userID: string,
  channelID: string
) => {
  const monitorList = await listMonitors();
  let monitors: Record<string, ServerMonitor> = {};
  Object.keys(monitorList).forEach((id) => {
    const monitor = monitorList[id];
    if (userID === monitor.userID && channelID === monitor.channelID)
      monitors[id] = monitor;
  });
  return monitors;
};

const checkMonitor = async (monitor: ServerMonitor) => {
  try {
    const { serverUri } = monitor;
    const response = await axios.get(serverUri);
    if (response.status !== 200)
      log("check server succeeded but not 200", serverUri, response.status);
    return true;
  } catch (e) {
    log("check server failed", e.response);
    return false;
  }
};

const monitorServers = async (callback: (monitor: ServerMonitor) => void) => {
  try {
    const monitors = await listMonitors();
    const ids = Object.keys(monitors);
    for await (const id of ids) {
      const monitor = monitors[id];
      const isUp = await checkMonitor(monitor);
      const lastUp = isUp ? new Date().getTime() : monitor.lastUp;
      const upSince = isUp
        ? monitor.upSince
          ? monitor.upSince
          : new Date().getTime()
        : undefined;
      const status = isUp ? "UP" : "DOWN";

      const newMonitor: ServerMonitor = {
        ...monitor,
        lastUp,
        status,
        upSince,
      };

      if (status !== monitor.status) callback(newMonitor);

      updateMonitor(newMonitor);
    }
    return true;
  } catch (e) {
    log("monitor servers failed", e);
    return false;
  }
};

export const startInterval = (
  callback: (monitor: ServerMonitor) => void,
  interval?: number
) => {
  const intervalFunction = async () => {
    const startTime = new Date().getTime();
    const monitorResult = await monitorServers(callback);
    const endTime = new Date().getTime();
    log(
      `monitored servers ${
        monitorResult ? "successfully" : "unsuccessfully"
      } in ${((endTime - startTime) / 1000).toFixed(3)}s`
    );
  };
  const id = setInterval(intervalFunction, interval || DEFAULT_INTERVAL);
  intervalFunction();

  return id;
};
