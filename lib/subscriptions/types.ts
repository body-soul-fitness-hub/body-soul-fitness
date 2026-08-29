import { round2, type DiscountType, type DurationUnit } from "@/lib/plans/types";

export const PAYMENT_STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "unpaid", label: "Unpaid" },
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]["value"];

export const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number]["value"];

// Staff-controlled lifecycle state. "Expired" and "Expiring soon" are never stored — they're
// always derived from end_date (see deriveSubscriptionStatus below) so they can't drift out of
// sync with the calendar the way a stored value could.
export const SUBSCRIPTION_STORED_STATUSES = [
  { value: "active", label: "Active" },
  { value: "frozen", label: "Frozen" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type SubscriptionStoredStatus = (typeof SUBSCRIPTION_STORED_STATUSES)[number]["value"];

export const SUBSCRIPTION_DISPLAY_STATUSES = [
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "frozen", label: "Frozen" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type SubscriptionDisplayStatus = (typeof SUBSCRIPTION_DISPLAY_STATUSES)[number]["value"];

export const SUBSCRIPTION_EXPIRING_SOON_DAYS = 7;

// The reminder cadence for the expiring-soon alerts on the subscriptions list.
export const EXPIRY_ALERT_WINDOWS = [7, 3, 1] as const;

export type MemberSubscription = {
  id: string;
  member_id: string;
  plan_id: string | null;
  plan_name: string;
  duration_unit: DurationUnit | null;
  duration_value: number | null;
  start_date: string;
  end_date: string | null;
  standard_price: number | null;
  discount_type: DiscountType | null;
  discount_value: number;
  final_amount: number;
  currency: string;
  payment_status: PaymentStatus;
  amount_paid: number;
  balance_due: number;
  payment_mode: PaymentMode | null;
  notes: string | null;
  status: SubscriptionStoredStatus;
  frozen_at: string | null;
  freeze_reason: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  renewed_from_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionEventType = "created" | "renewed" | "extended" | "frozen" | "unfrozen" | "cancelled" | "payment_recorded";

export type SubscriptionEvent = {
  id: string;
  subscription_id: string;
  member_id: string;
  event_type: SubscriptionEventType;
  details: string;
  performed_by: string | null;
  created_at: string;
};

export type MemberPayment = {
  id: string;
  member_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  payment_date: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  received_by: string | null;
  created_at: string;
};

export function derivePaymentStatus(finalAmount: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid >= finalAmount) return "paid";
  return "partial";
}

// Start and end dates are both inclusive — a 1-month plan starting Aug 29 covers through
// Sep 28, not Sep 29 — so a subscription's span always reads as exactly N months/days of access.
export function addDuration(startDate: string, unit: DurationUnit, value: number): string {
  const date = new Date(`${startDate}T00:00:00Z`);
  if (unit === "days") {
    date.setUTCDate(date.getUTCDate() + value);
  } else {
    date.setUTCMonth(date.getUTCMonth() + value);
  }
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromStr: string, toStr: string): number {
  const from = new Date(`${fromStr}T00:00:00Z`).getTime();
  const to = new Date(`${toStr}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function deriveSubscriptionStatus(
  sub: Pick<MemberSubscription, "status" | "end_date">,
  today: string = new Date().toISOString().slice(0, 10)
): SubscriptionDisplayStatus {
  if (sub.status === "cancelled") return "cancelled";
  if (sub.status === "frozen") return "frozen";
  if (!sub.end_date) return "active";
  if (sub.end_date < today) return "expired";
  const soonCutoff = addDays(today, SUBSCRIPTION_EXPIRING_SOON_DAYS);
  if (sub.end_date <= soonCutoff) return "expiring_soon";
  return "active";
}

export { round2 };
