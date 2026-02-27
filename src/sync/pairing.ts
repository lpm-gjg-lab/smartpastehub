import { randomBytes } from "crypto";
import { createRoomKeyHash } from "./relay-client";

export interface PairingInfo {
  deviceId: string;
  roomId: string;
  relayUrl: string;
  relayAuthToken: string;
  secretKeyHex: string;
  keyVersion: number;
  expiresAt: number;
}

interface PairingPayload {
  relayUrl: string;
  roomId: string;
  relayAuthToken: string;
  secretKeyHex: string;
  keyVersion: number;
  expiresAt: number;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

export function generatePairingPayload(relayUrl: string): PairingPayload {
  const secretKeyHex = randomBytes(32).toString("hex");
  const relayAuthToken = randomBytes(24).toString("hex");
  const roomId = createRoomKeyHash(secretKeyHex).slice(0, 20);
  const expiresAt = Date.now() + 10 * 60 * 1000;

  return {
    relayUrl,
    roomId,
    relayAuthToken,
    secretKeyHex,
    keyVersion: 1,
    expiresAt,
  };
}

export async function generatePairingCode(
  relayUrl = "wss://relay.smartpastehub.local",
): Promise<string> {
  const payload = generatePairingPayload(relayUrl);
  return toBase64Url(JSON.stringify(payload));
}

export async function confirmPairing(
  code: string,
  deviceId = `device-${randomBytes(4).toString("hex")}`,
): Promise<PairingInfo> {
  const decoded = fromBase64Url(code);
  const payload = JSON.parse(decoded) as PairingPayload;

  if (
    !payload.relayUrl ||
    !payload.roomId ||
    !payload.relayAuthToken ||
    !payload.secretKeyHex
  ) {
    throw new Error("Invalid pairing payload");
  }

  if (payload.expiresAt <= Date.now()) {
    throw new Error("Pairing code expired");
  }

  return {
    deviceId,
    roomId: payload.roomId,
    relayUrl: payload.relayUrl,
    relayAuthToken: payload.relayAuthToken,
    secretKeyHex: payload.secretKeyHex,
    keyVersion: payload.keyVersion,
    expiresAt: payload.expiresAt,
  };
}
