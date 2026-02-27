import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
} from "crypto";

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
}

const ALGORITHM = "aes-256-gcm";
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export function deriveKey(secret: string, salt: string): Buffer {
  return pbkdf2Sync(secret, salt, 120000, KEY_LENGTH, "sha256");
}

export function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    nonce: nonce.toString("base64"),
  };
}

export function decrypt(payload: EncryptedPayload, key: Buffer): string {
  const nonce = Buffer.from(payload.nonce, "base64");
  const data = Buffer.from(payload.ciphertext, "base64");
  const tag = data.subarray(data.length - TAG_LENGTH);
  const encrypted = data.subarray(0, data.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
