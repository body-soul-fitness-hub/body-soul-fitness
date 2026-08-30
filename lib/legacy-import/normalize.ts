import { normalizeToE164 } from "@/lib/whatsapp/phone";
import { derivePaymentStatus, type PaymentMode, type PaymentStatus } from "@/lib/subscriptions/types";

export { normalizeToE164 };

export function normalizeName(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Excel's date epoch is 1899-12-30 (accounting for the historical leap-year bug) — only used as
// a defensive fallback if a future re-export stores dates as real Excel date cells instead of
// the plain text strings the current GymMaster exports use ("YYYY-MM-DD" on the sales sheet,
// "DD-MM-YYYY" on the customers sheet).
const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

export function normalizeLegacyDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const date = new Date(EXCEL_EPOCH_UTC_MS + Math.round(raw) * 86_400_000);
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
  }

  const text = String(raw).trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return isValidCalendarDate(+yyyy, +mm, +dd) ? `${yyyy}-${pad2(+mm)}-${pad2(+dd)}` : null;
  }

  match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return isValidCalendarDate(+yyyy, +mm, +dd) ? `${yyyy}-${pad2(+mm)}-${pad2(+dd)}` : null;
  }

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return isValidCalendarDate(+yyyy, +mm, +dd) ? `${yyyy}-${pad2(+mm)}-${pad2(+dd)}` : null;
  }

  return null;
}

export function toAmount(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const text = String(raw ?? "").trim();
  if (!text) return 0;
  const value = Number(text.replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

// legacy_sale_row_key is the importer's idempotency key for a sale row. Customer ID + a stable
// row index is used rather than the source Invoice No, since ~70% of invoice numbers repeat
// across rows in the real export (renewals appear to reuse the same invoice number) and ~3% of
// rows have no invoice number at all — neither is usable as a unique key on its own.
export function computeLegacySaleRowKey(customerId: string, rowIndex: number): string {
  return `${customerId}#${rowIndex}`;
}

export function mapPaymentStatus(
  rawStatus: string,
  finalAmount: number,
  amountPaid: number
): { status: PaymentStatus; warning?: string } {
  const derived = derivePaymentStatus(finalAmount, amountPaid);
  const code = rawStatus.trim().toUpperCase();

  let sourceStatus: PaymentStatus;
  if (code === "PD") sourceStatus = "paid";
  else if (code === "PI") sourceStatus = amountPaid < finalAmount ? "partial" : "paid";
  else return { status: derived, warning: code ? `Unrecognized legacy payment status code "${rawStatus}"; used amount-derived status "${derived}" instead.` : undefined };

  if (sourceStatus !== derived) {
    return {
      status: sourceStatus,
      warning: `Legacy payment status "${rawStatus}" implies "${sourceStatus}" but paid amount (${amountPaid}) vs total (${finalAmount}) derives "${derived}".`,
    };
  }
  return { status: sourceStatus };
}

const PAYMENT_MODE_MAP: Record<string, PaymentMode> = {
  cash: "cash",
  upi: "upi",
  "google pay": "upi",
  paytm: "upi",
  "credit card": "card",
  // "Online" doesn't reliably mean bank transfer in this export — "other" avoids a false claim.
  online: "other",
};

export function mapPaymentMode(raw: string): PaymentMode | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  return PAYMENT_MODE_MAP[key] ?? "other";
}
