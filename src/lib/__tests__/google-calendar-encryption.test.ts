import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  decryptToken,
  deserializeEncryptedToken,
  encryptToken,
  serializeEncryptedToken,
} from "@/lib/google-calendar-encryption";

describe("google-calendar-encryption", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  });

  it("encrypts and decrypts token values", () => {
    const plaintext = "ya29.test-token";
    const encrypted = encryptToken(plaintext);

    expect(encrypted.encrypted).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();
    expect(encrypted.salt).toBeTruthy();
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext", () => {
    const plaintext = "repeat-token";
    const first = encryptToken(plaintext);
    const second = encryptToken(plaintext);

    expect(first.encrypted).not.toBe(second.encrypted);
    expect(first.iv).not.toBe(second.iv);
    expect(first.salt).not.toBe(second.salt);
    expect(decryptToken(first)).toBe(plaintext);
    expect(decryptToken(second)).toBe(plaintext);
  });

  it("fails decryption for tampered data", () => {
    const encrypted = encryptToken("secure-token");
    const tampered = {
      ...encrypted,
      encrypted: `${encrypted.encrypted.slice(0, -1)}A`,
    };

    expect(() => decryptToken(tampered)).toThrow();
  });

  it("serializes and deserializes encrypted data", () => {
    const encrypted = encryptToken("refresh-token");
    const serialized = serializeEncryptedToken(encrypted);
    const deserialized = deserializeEncryptedToken(serialized);

    expect(deserialized).toEqual(encrypted);
    expect(decryptToken(deserialized)).toBe("refresh-token");
  });

  it("rejects invalid serialized token payloads", () => {
    expect(() =>
      deserializeEncryptedToken(JSON.stringify({ encrypted: "x", iv: "y" }))
    ).toThrow("Invalid encrypted token format");
  });
});
