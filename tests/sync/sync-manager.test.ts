import { afterEach, describe, expect, it } from "vitest";
import {
  broadcastClipboard,
  connectSync,
  disconnectSync,
  getSyncStatus,
  resetSyncStateForTests,
  setSyncEventHandlers,
  setSyncTransportFactory,
  SyncTransport,
} from "../../src/sync/sync-manager";
import { createRelayMessage } from "../../src/sync/relay-client";
import { encrypt } from "../../src/sync/encryption";

class MockTransport implements SyncTransport {
  sent: string[] = [];
  private onMessageHandler: ((payload: string) => void) | null = null;
  private onOpenHandler: (() => void) | null = null;
  private onCloseHandler: (() => void) | null = null;
  private onErrorHandler: ((error: unknown) => void) | null = null;

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(): void {
    this.onCloseHandler?.();
  }

  onMessage(handler: (payload: string) => void): void {
    this.onMessageHandler = handler;
  }

  onOpen(handler: () => void): void {
    this.onOpenHandler = handler;
  }

  onClose(handler: () => void): void {
    this.onCloseHandler = handler;
  }

  onError(handler: (error: unknown) => void): void {
    this.onErrorHandler = handler;
  }

  emitOpen(): void {
    this.onOpenHandler?.();
  }

  emitMessage(payload: string): void {
    this.onMessageHandler?.(payload);
  }
}

afterEach(() => {
  resetSyncStateForTests();
  setSyncTransportFactory(null);
});

describe("sync-manager", () => {
  it("registers with relay on open and updates connected status", () => {
    const transport = new MockTransport();
    setSyncTransportFactory(() => transport);

    connectSync("wss://relay.example.com", "a".repeat(64), {
      roomId: "room-1",
      relayAuthToken: "token-1",
      deviceId: "dev-1",
    });

    transport.emitOpen();

    expect(transport.sent.length).toBe(1);
    const register = JSON.parse(transport.sent[0] ?? "{}");
    expect(register.type).toBe("register");
    expect(register.roomId).toBe("room-1");
    expect(getSyncStatus().connected).toBe(false);

    const registered = {
      ...createRelayMessage("registered", "room-1", "relay", 0),
      messageId: "registered-1",
    };
    transport.emitMessage(JSON.stringify(registered));
    expect(getSyncStatus().connected).toBe(true);
  });

  it("broadcasts encrypted clipboard payload when connected", async () => {
    const transport = new MockTransport();
    setSyncTransportFactory(() => transport);

    const secret = "b".repeat(64);
    connectSync("wss://relay.example.com", secret, {
      roomId: "room-2",
      relayAuthToken: "token-2",
      deviceId: "dev-2",
    });
    transport.emitOpen();
    transport.emitMessage(
      JSON.stringify({
        ...createRelayMessage("registered", "room-2", "relay", 0),
        messageId: "registered-2",
      }),
    );

    await broadcastClipboard("hello sync");

    const sent = transport.sent.map((raw) => JSON.parse(raw));
    const clipboardMsg = sent.find((msg) => msg.type === "clipboard");
    expect(clipboardMsg).toBeTruthy();
    expect(clipboardMsg.roomId).toBe("room-2");
  });

  it("decrypts incoming clipboard payload and emits ack", () => {
    const transport = new MockTransport();
    const secret = "c".repeat(64);
    const key = Buffer.from(secret, "hex");
    const incoming: Array<{ text: string; from: string }> = [];

    setSyncTransportFactory(() => transport);
    connectSync("wss://relay.example.com", secret, {
      roomId: "room-3",
      relayAuthToken: "token-3",
      deviceId: "dev-3",
      onIncomingClipboard(text, fromDeviceId) {
        incoming.push({ text, from: fromDeviceId });
      },
    });

    transport.emitOpen();
    transport.emitMessage(
      JSON.stringify({
        ...createRelayMessage("registered", "room-3", "relay", 0),
        messageId: "registered-3",
      }),
    );

    const encrypted = encrypt(JSON.stringify({ text: "from peer" }), key);
    const peerMessage = {
      ...createRelayMessage(
        "clipboard",
        "room-3",
        "peer-1",
        3,
        JSON.stringify(encrypted),
      ),
      messageId: "peer-msg-1",
    };

    transport.emitMessage(JSON.stringify(peerMessage));

    expect(incoming).toEqual([{ text: "from peer", from: "peer-1" }]);
    const ack = transport.sent
      .map((raw) => JSON.parse(raw))
      .find((msg) => msg.type === "ack");
    expect(ack?.ackOf).toBe("peer-msg-1");

    transport.emitMessage(JSON.stringify(peerMessage));
    expect(incoming).toHaveLength(1);

    disconnectSync();
  });

  it("emits sync lifecycle callbacks for connected/disconnected/received", () => {
    const transport = new MockTransport();
    const secret = "d".repeat(64);
    const key = Buffer.from(secret, "hex");
    const events: string[] = [];

    setSyncTransportFactory(() => transport);
    setSyncEventHandlers({
      onConnected() {
        events.push("connected");
      },
      onDisconnected() {
        events.push("disconnected");
      },
      onReceived() {
        events.push("received");
      },
    });

    connectSync("wss://relay.example.com", secret, {
      roomId: "room-4",
      relayAuthToken: "token-4",
      deviceId: "dev-4",
    });

    transport.emitOpen();
    transport.emitMessage(
      JSON.stringify({
        ...createRelayMessage("registered", "room-4", "relay", 0),
        messageId: "registered-4",
      }),
    );

    const encrypted = encrypt(JSON.stringify({ text: "hello" }), key);
    transport.emitMessage(
      JSON.stringify({
        ...createRelayMessage(
          "clipboard",
          "room-4",
          "peer-4",
          1,
          JSON.stringify(encrypted),
        ),
        messageId: "peer-msg-4",
      }),
    );

    disconnectSync();

    expect(events).toContain("connected");
    expect(events).toContain("received");
    expect(events).toContain("disconnected");
  });
});
