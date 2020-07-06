interface ServerMonitor {
  userID: string;
  channelID: string;
  serverUri: string;
  added: number;
  status: ServerStatus;
}

type ServerStatus = "UP" | "DOWN";
