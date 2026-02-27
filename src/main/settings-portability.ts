import crypto from "crypto";
import { AppSettings } from "../shared/types";

interface PortableEnvelope {
  version: 1;
  salt: string;
  iv: string;
  authTag: string;
  payload: string;
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, 32);
}

export function exportPortableSettings(
  settings: AppSettings,
  passphrase: string,
): string {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(passphrase, salt);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const rawPayload = Buffer.from(JSON.stringify(settings), "utf8");
  const encrypted = Buffer.concat([cipher.update(rawPayload), cipher.final()]);
  const envelope: PortableEnvelope = {
    version: 1,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    payload: encrypted.toString("base64"),
  };
  return JSON.stringify(envelope, null, 2);
}

export function importPortableSettings(
  serialized: string,
  passphrase: string,
): AppSettings {
  const parsed = JSON.parse(serialized) as PortableEnvelope;
  if (parsed.version !== 1) {
    throw new Error("Unsupported portable settings version");
  }
  const salt = Buffer.from(parsed.salt, "base64");
  const iv = Buffer.from(parsed.iv, "base64");
  const authTag = Buffer.from(parsed.authTag, "base64");
  const payload = Buffer.from(parsed.payload, "base64");
  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as AppSettings;
}
