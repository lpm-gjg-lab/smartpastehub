type RelayMessageType =
  | "register"
  | "registered"
  | "clipboard"
  | "ack"
  | "ping"
  | "pong"
  | "error";

interface RelayMessage {
  type: RelayMessageType;
  roomId: string;
  deviceId: string;
  relayAuthToken?: string;
  targetDeviceId?: string;
  payload?: string;
  nonce: string;
  messageId: string;
  ackOf?: string;
  seq: number;
  timestamp: number;
}

interface RoomClient {
  socket: any;
  deviceId: string;
  roomId: string;
}

declare const WebSocketPair: {
  new (): { 0: any; 1: any };
};

const rooms = new Map<string, Map<string, RoomClient>>();
const roomAuthTokens = new Map<string, string>();

function parseRelayMessage(raw: string): RelayMessage | null {
  try {
    const parsed = JSON.parse(raw) as RelayMessage;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.type !== "string" ||
      typeof parsed.roomId !== "string" ||
      typeof parsed.deviceId !== "string" ||
      typeof parsed.messageId !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function sendJson(socket: any, payload: unknown): void {
  socket.send(JSON.stringify(payload));
}

function getRoom(roomId: string): Map<string, RoomClient> {
  const existing = rooms.get(roomId);
  if (existing) {
    return existing;
  }
  const created = new Map<string, RoomClient>();
  rooms.set(roomId, created);
  return created;
}

function cleanupRoomIfEmpty(roomId: string): void {
  const room = rooms.get(roomId);
  if (room && room.size === 0) {
    rooms.delete(roomId);
    roomAuthTokens.delete(roomId);
  }
}

function isAuthorized(roomId: string, token?: string): boolean {
  if (!token) {
    return false;
  }
  const existing = roomAuthTokens.get(roomId);
  if (!existing) {
    roomAuthTokens.set(roomId, token);
    return true;
  }
  return existing === token;
}

function handleRelayMessage(client: RoomClient, msg: RelayMessage): void {
  if (msg.roomId !== client.roomId) {
    sendJson(client.socket, { type: "error", message: "room_mismatch" });
    return;
  }

  if (msg.type === "ping") {
    sendJson(client.socket, {
      type: "pong",
      roomId: client.roomId,
      deviceId: "relay",
      messageId: msg.messageId,
      nonce: msg.nonce,
      seq: 0,
      timestamp: Date.now(),
    });
    return;
  }

  const room = getRoom(client.roomId);
  for (const [deviceId, peer] of room.entries()) {
    if (deviceId === client.deviceId) {
      continue;
    }
    if (msg.targetDeviceId && msg.targetDeviceId !== deviceId) {
      continue;
    }
    sendJson(peer.socket, msg);
  }
}

function handleSocket(server: any): void {
  let client: RoomClient | null = null;

  server.addEventListener("message", (event: MessageEvent) => {
    const msg = parseRelayMessage(String(event.data));
    if (!msg) {
      sendJson(server, { type: "error", message: "invalid_message" });
      return;
    }

    if (msg.type === "register") {
      if (!isAuthorized(msg.roomId, msg.relayAuthToken)) {
        sendJson(server, { type: "error", message: "unauthorized" });
        server.close(1008, "unauthorized");
        return;
      }

      const room = getRoom(msg.roomId);
      client = {
        socket: server,
        deviceId: msg.deviceId,
        roomId: msg.roomId,
      };
      room.set(msg.deviceId, client);

      sendJson(server, {
        type: "registered",
        roomId: msg.roomId,
        deviceId: msg.deviceId,
        messageId: msg.messageId,
        nonce: msg.nonce,
        seq: 0,
        timestamp: Date.now(),
      });
      return;
    }

    if (!client) {
      sendJson(server, { type: "error", message: "not_registered" });
      return;
    }

    handleRelayMessage(client, msg);
  });

  server.addEventListener("close", () => {
    if (!client) {
      return;
    }
    const room = rooms.get(client.roomId);
    room?.delete(client.deviceId);
    cleanupRoomIfEmpty(client.roomId);
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      handleSocket(server);
      return new Response(null, { status: 101, webSocket: client } as any);
    }

    return new Response("Smart Paste Hub Relay", { status: 200 });
  },
};
