import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Symmetric encryption for secrets at rest (VoIP provider credentials, etc.).
 *
 * AES-256-GCM. The 32-byte key comes from `PRISMCORE_ENCRYPTION_KEY` (64 hex
 * chars). Behaviour is FAIL-CLOSED: with no key, `encryptSecret` throws rather
 * than silently persisting plaintext. Stored values are prefixed `v1:` —
 * `decryptSecret` passes through anything unprefixed, so legacy plaintext rows
 * still read correctly.
 */
const PREFIX = "v1:";

function getKey(): Buffer {
  const hex = process.env.PRISMCORE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "PRISMCORE_ENCRYPTION_KEY is not set or is not 32 bytes (64 hex chars).",
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt a secret. Empty input stays empty (nothing to protect). */
export function encryptSecret(plain: string): string {
  if (plain === "") return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

/** Decrypt a secret. Unprefixed input is treated as legacy plaintext. */
export function decryptSecret(packed: string): string {
  if (!packed.startsWith(PREFIX)) return packed;
  const [, ivHex, tagHex, ctHex] = packed.split(":");
  if (!ivHex || !tagHex || !ctHex) return "";
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

/** Whether a value is one of our encrypted blobs. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/**
 * Constant-time check that `signature` is a valid hex HMAC-SHA256 of `body`
 * under `secret`. Used to authenticate inbound provider webhooks.
 */
export function verifyHmac(
  body: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
