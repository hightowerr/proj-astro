import crypto from "node:crypto";
import { getCalendarEncryptionKey } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32;

export type EncryptedTokenData = {
  encrypted: string;
  iv: string;
  authTag: string;
  salt: string;
};

function getBaseKeyMaterial(): Buffer {
  const encoded = getCalendarEncryptionKey();
  const key = Buffer.from(encoded, "base64");

  if (key.length !== KEY_LENGTH) {
    throw new Error("CALENDAR_ENCRYPTION_KEY must decode to 32 bytes");
  }

  return key;
}

function deriveKey(baseKey: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    baseKey,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );
}

export function encryptToken(plaintext: string): EncryptedTokenData {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(getBaseKeyMaterial(), salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    salt: salt.toString("base64"),
  };
}

export function decryptToken(data: EncryptedTokenData): string {
  const salt = Buffer.from(data.salt, "base64");
  const iv = Buffer.from(data.iv, "base64");
  const authTag = Buffer.from(data.authTag, "base64");
  const key = deriveKey(getBaseKeyMaterial(), salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function serializeEncryptedToken(data: EncryptedTokenData): string {
  return JSON.stringify(data);
}

export function deserializeEncryptedToken(serialized: string): EncryptedTokenData {
  const parsed = JSON.parse(serialized) as Partial<EncryptedTokenData>;

  if (
    typeof parsed.encrypted !== "string" ||
    typeof parsed.iv !== "string" ||
    typeof parsed.authTag !== "string" ||
    typeof parsed.salt !== "string"
  ) {
    throw new Error("Invalid encrypted token format");
  }

  return {
    encrypted: parsed.encrypted,
    iv: parsed.iv,
    authTag: parsed.authTag,
    salt: parsed.salt,
  };
}
