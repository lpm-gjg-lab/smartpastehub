import { describe, expect, it } from "vitest";
import {
  createAckMessage,
  createRegisterMessage,
  createRelayMessage,
  createRoomKeyHash,
  parseRelayMessage,
} from "../../src/sync/relay-client";

describe("relay-client protocol helpers", () => {
  it("creates deterministic room key hash size", () => {
    const hash = createRoomKeyHash("abc");
    expect(hash).toHaveLength(64);
  });

  it("creates register and ack messages with required fields", () => {
    const register = createRegisterMessage("room1", "token1", "devA");
    expect(register.type).toBe("register");
    expect(register.relayAuthToken).toBe("token1");

    const ack = createAckMessage("room1", "devA", "msg1", "devB");
    expect(ack.type).toBe("ack");
    expect(ack.ackOf).toBe("msg1");
    expect(ack.targetDeviceId).toBe("devB");
  });

  it("parses valid messages and rejects invalid payloads", () => {
    const msg = createRelayMessage("ping", "room1", "devA", 1);
    const raw = JSON.stringify(msg);
    expect(parseRelayMessage(raw)?.messageId).toBe(msg.messageId);
    expect(parseRelayMessage("not-json")).toBeNull();
    expect(parseRelayMessage(JSON.stringify({ nope: true }))).toBeNull();
  });
});
