/**
 * Protect sensitive SMS registration fields (EIN/BRN) at rest.
 *
 * Uses AES-256-GCM with SMS_SENSITIVE_DATA_KEY (32-byte key, base64 or hex).
 * Secrets (Telnyx API keys) must NEVER be stored in the database.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGO = "aes-256-gcm";

function loadKey(): Buffer | null {
  const raw = process.env.SMS_SENSITIVE_DATA_KEY?.trim();
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {
    /* fall through */
  }
  // Derive a stable 32-byte key from a passphrase-length secret (dev only).
  return createHash("sha256").update(raw).digest();
}

export function canEncryptSmsSensitiveData(): boolean {
  return loadKey() !== null;
}

/** Encrypt a sensitive string. Returns null when encryption key is unset (fail closed for writes). */
export function encryptSmsSensitive(plaintext: string): string | null {
  const key = loadKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptSmsSensitive(ciphertext: string): string | null {
  const key = loadKey();
  if (!key) return null;
  const parts = ciphertext.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, ivB64, tagB64, dataB64] = parts;
  try {
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64!, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64!, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64!, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/** Never log full EIN/BRN — last 4 only when present. */
export function redactEin(value: string | null | undefined): string {
  if (!value) return "(none)";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***-**-${digits.slice(-4)}`;
}
