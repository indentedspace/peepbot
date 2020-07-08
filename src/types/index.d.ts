interface ServerMonitor {
  id: string;
  userID: string;
  channelID: string;
  serverUri: string;
  timeAdded: number;
  status: ServerStatus;
  lastUp?: number;
  upSince?: number;
}

type ServerStatus = "UP" | "DOWN";
