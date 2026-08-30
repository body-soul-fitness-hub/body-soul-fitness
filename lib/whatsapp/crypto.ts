import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM at rest for the WhatsApp access token. The key never touches the database — it's a
// server-only env var, same trust boundary as SUPABASE_SERVICE_ROLE_KEY. Ciphertext is stored as
// "iv:authTag:ciphertext", all hex, so it round-trips through a single text column.

function getKey(): Buffer {
  const raw = process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new Error("Missing WHATSAPP_CREDENTIALS_ENCRYPTION_KEY environment variable.");
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) throw new Error("WHATSAPP_CREDENTIALS_ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters) — generate one with: openssl rand -hex 32");
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) throw new Error("Malformed encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}
