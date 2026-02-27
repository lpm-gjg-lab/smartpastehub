import { createHash, randomUUID } from "crypto";

export type RelayMessageType =
  | "register"
  | "registered"
  | "clipboard"
  | "ack"
  | "ping"
  | "pong"
  | "error";

export interface RelayMessage {
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

export interface RelayAuthEnvelope {
  roomId: string;
  relayAuthToken: string;
}

export function createRoomKeyHash(secretKeyHex: string): string {
  return createHash("sha256").update(secretKeyHex).digest("hex");
}

export function createRelayMessage(
  type: RelayMessageType,
  roomId: string,
  deviceId: string,
  seq: number,
  payload?: string,
): RelayMessage {
  return {
    type,
    roomId,
    deviceId,
    payload,
    nonce: randomUUID(),
    messageId: randomUUID(),
    seq,
    timestamp: Date.now(),
  };
}

export function createRegisterMessage(
  roomId: string,
  relayAuthToken: string,
  deviceId: string,
): RelayMessage {
  const message = createRelayMessage("register", roomId, deviceId, 0);
  return {
    ...message,
    relayAuthToken,
  };
}

export function createAckMessage(
  roomId: string,
  deviceId: string,
  ackOf: string,
  targetDeviceId?: string,
): RelayMessage {
  const message = createRelayMessage("ack", roomId, deviceId, 0);
  return {
    ...message,
    ackOf,
    targetDeviceId,
  };
}

export function parseRelayMessage(raw: string): RelayMessage | null {
  try {
    const parsed = JSON.parse(raw) as RelayMessage;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (
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
