import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const PREFIX = "BSQR";

function secret(): string {
  const value = process.env.ATTENDANCE_QR_SECRET;
  if (!value) throw new Error("Missing ATTENDANCE_QR_SECRET. Set a long random value before enabling QR scanning.");
  return value;
}

function signature(memberId: string) {
  return createHmac("sha256", secret()).update(`${PREFIX}:${memberId}`).digest("base64url");
}

export function createQrPayload(memberId: string): string {
  return `${PREFIX}:${memberId}:${signature(memberId)}`;
}

export function memberIdFromQrPayload(value: string): string | null {
  const [prefix, memberId, supplied, ...extra] = value.trim().split(":");
  if (prefix !== PREFIX || !memberId || !supplied || extra.length) return null;
  const expected = signature(memberId);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? memberId : null;
}
