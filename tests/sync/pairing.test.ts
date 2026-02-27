import { describe, expect, it } from "vitest";
import { confirmPairing, generatePairingCode } from "../../src/sync/pairing";

describe("pairing flow", () => {
  it("generates and confirms pairing payload", async () => {
    const code = await generatePairingCode("wss://relay.example.com");
    const info = await confirmPairing(code, "desktop-test");

    expect(info.deviceId).toBe("desktop-test");
    expect(info.roomId.length).toBeGreaterThan(5);
    expect(info.secretKeyHex.length).toBe(64);
    expect(info.relayAuthToken.length).toBeGreaterThan(10);
  });

  it("rejects invalid pairing code", async () => {
    await expect(confirmPairing("bad-code")).rejects.toThrow();
  });
});
