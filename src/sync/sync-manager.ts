import { decrypt, encrypt } from "./encryption";
import {
  createAckMessage,
  createRegisterMessage,
  createRelayMessage,
  parseRelayMessage,
  RelayMessage,
} from "./relay-client";
import { logger } from "../shared/logger";

export interface SyncStatus {
  connected: boolean;
  devices: { id: string; name: string }[];
  roomId?: string;
}

export interface SyncConnectionOptions {
  roomId: string;
  relayAuthToken: string;
  deviceId?: string;
  onIncomingClipboard?: (text: string, fromDeviceId: string) => void;
}

export interface SyncTransport {
  send: (payload: string) => void;
  close: () => void;
  onMessage: (handler: (payload: string) => void) => void;
  onOpen: (handler: () => void) => void;
  onClose: (handler: () => void) => void;
  onError: (handler: (error: unknown) => void) => void;
}

export interface SyncEventHandlers {
  onConnected?: (details: { roomId: string; deviceId: string }) => void;
  onDisconnected?: (details: { roomId: string; deviceId: string }) => void;
  onReceived?: (details: { text: string; fromDeviceId: string }) => void;
}

const status: SyncStatus = { connected: false, devices: [] };

let transport: SyncTransport | null = null;
let sharedSecret: Buffer | null = null;
let relayAuthToken = "";
let roomId = "";
let localDeviceId = `desktop-${Math.random().toString(36).slice(2, 11)}`;
let onIncomingClipboard: ((text: string, fromDeviceId: string) => void) | null =
  null;

let seq = 1;
const seenMessageIds = new Set<string>();

let transportFactory: ((url: string) => SyncTransport) | null = null;
let syncEventHandlers: SyncEventHandlers = {};

interface WebSocketLike {
  send(payload: string): void;
  close(): void;
  addEventListener(event: string, listener: (evt?: unknown) => void): void;
}

interface WebSocketConstructorLike {
  new (url: string): WebSocketLike;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveWebSocketCtor(): WebSocketConstructorLike | null {
  const runtimeWithWs = globalThis as { WebSocket?: unknown };
  if (typeof runtimeWithWs.WebSocket === "function") {
    return runtimeWithWs.WebSocket as WebSocketConstructorLike;
  }

  try {
    const loaded = require("ws") as unknown;
    if (typeof loaded === "function") {
      return loaded as WebSocketConstructorLike;
    }
    if (isObjectRecord(loaded) && typeof loaded["WebSocket"] === "function") {
      return loaded["WebSocket"] as WebSocketConstructorLike;
    }
  } catch {
    return null;
  }

  return null;
}

export function isSyncTransportRuntimeAvailable(): boolean {
  return resolveWebSocketCtor() !== null;
}

function defaultTransportFactory(url: string): SyncTransport {
  const WebSocketCtor = resolveWebSocketCtor();
  if (!WebSocketCtor) {
    throw new Error("WebSocket runtime is unavailable");
  }
  const socket = new WebSocketCtor(url);

  return {
    send(payload: string) {
      socket.send(payload);
    },
    close() {
      socket.close();
    },
    onMessage(handler) {
      socket.addEventListener("message", (evt) => {
        if (isObjectRecord(evt) && "data" in evt) {
          handler(String(evt["data"]));
          return;
        }
        handler("");
      });
    },
    onOpen(handler) {
      socket.addEventListener("open", handler);
    },
    onClose(handler) {
      socket.addEventListener("close", handler);
    },
    onError(handler) {
      socket.addEventListener("error", handler);
    },
  };
}

function handleIncomingMessage(message: RelayMessage): void {
  if (seenMessageIds.has(message.messageId)) {
    return;
  }
  seenMessageIds.add(message.messageId);

  if (message.type === "registered") {
    status.connected = true;
    syncEventHandlers.onConnected?.({ roomId, deviceId: localDeviceId });
    return;
  }

  if (message.type !== "clipboard" || !message.payload || !sharedSecret) {
    return;
  }

  try {
    const encrypted = JSON.parse(message.payload) as {
      ciphertext: string;
      nonce: string;
    };
    const plaintext = decrypt(encrypted, sharedSecret);
    const decoded = JSON.parse(plaintext) as { text?: string };
    const text = decoded.text ?? "";

    if (onIncomingClipboard) {
      onIncomingClipboard(text, message.deviceId);
    }
    syncEventHandlers.onReceived?.({ text, fromDeviceId: message.deviceId });

    if (transport) {
      const ack = createAckMessage(
        roomId,
        localDeviceId,
        message.messageId,
        message.deviceId,
      );
      ack.relayAuthToken = relayAuthToken;
      transport.send(JSON.stringify(ack));
    }
  } catch (err) {
    logger.error("Failed to process incoming sync message", { err });
  }
}

function sendRegister(): void {
  if (!transport) {
    return;
  }
  const register = createRegisterMessage(roomId, relayAuthToken, localDeviceId);
  transport.send(JSON.stringify(register));
}

export function setSyncTransportFactory(
  factory: ((url: string) => SyncTransport) | null,
): void {
  transportFactory = factory;
}

export function setSyncEventHandlers(handlers: SyncEventHandlers): void {
  syncEventHandlers = handlers;
}

export function getSyncStatus(): SyncStatus {
  return {
    ...status,
    devices: [...status.devices],
  };
}

export function connectSync(
  relayUrl: string,
  secretKeyHex: string,
  options: SyncConnectionOptions,
): void {
  sharedSecret = Buffer.from(secretKeyHex, "hex");
  relayAuthToken = options.relayAuthToken;
  roomId = options.roomId;
  status.roomId = options.roomId;
  localDeviceId = options.deviceId ?? localDeviceId;
  onIncomingClipboard = options.onIncomingClipboard ?? null;
  status.connected = false;

  const factory = transportFactory ?? defaultTransportFactory;
  try {
    transport = factory(relayUrl);
  } catch (err) {
    logger.error("Failed to initialize sync transport", { err });
    status.connected = false;
    syncEventHandlers.onDisconnected?.({ roomId, deviceId: localDeviceId });
    return;
  }

  transport.onOpen(() => {
    logger.info("Sync transport open", { relayUrl, roomId });
    sendRegister();
  });
  transport.onMessage((payload) => {
    const parsed = parseRelayMessage(payload);
    if (!parsed || parsed.roomId !== roomId) {
      return;
    }
    handleIncomingMessage(parsed);
  });
  transport.onClose(() => {
    const wasConnected = status.connected;
    status.connected = false;
    if (wasConnected) {
      syncEventHandlers.onDisconnected?.({ roomId, deviceId: localDeviceId });
    }
  });
  transport.onError((err) => {
    logger.error("Sync transport error", { err });
  });
}

export function disconnectSync(): void {
  transport?.close();
  transport = null;
  status.connected = false;
}

export async function broadcastClipboard(text: string): Promise<void> {
  if (!status.connected || !sharedSecret || !transport || !roomId) {
    return;
  }

  const payload = JSON.stringify({ text, timestamp: Date.now() });
  const encrypted = encrypt(payload, sharedSecret);
  const msg = createRelayMessage(
    "clipboard",
    roomId,
    localDeviceId,
    seq++,
    JSON.stringify(encrypted),
  );
  msg.relayAuthToken = relayAuthToken;

  transport.send(JSON.stringify(msg));
  logger.info("Broadcasted clipboard to sync room", {
    roomId,
    size: msg.payload?.length ?? 0,
  });
}

export function resetSyncStateForTests(): void {
  transport = null;
  sharedSecret = null;
  relayAuthToken = "";
  roomId = "";
  status.connected = false;
  status.devices = [];
  delete status.roomId;
  seq = 1;
  seenMessageIds.clear();
  onIncomingClipboard = null;
  localDeviceId = `desktop-${Math.random().toString(36).slice(2, 11)}`;
  syncEventHandlers = {};
}
