import { round2, type DurationUnit } from "@/lib/plans/types";
import type { PaymentMode, PaymentStatus } from "@/lib/subscriptions/types";

export type Invoice = {
  id: string;
  invoice_number: string;
  member_id: string;
  subscription_id: string | null;
  issue_date: string;
  plan_name: string | null;
  duration_unit: DurationUnit | null;
  duration_value: number | null;
  start_date: string | null;
  end_date: string | null;
  amount: number;
  discount_amount: number;
  tax_label: string | null;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  amount_paid: number;
  balance_due: number;
  payment_mode: PaymentMode | null;
  status: PaymentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// Tax is applied on top of the post-discount amount. Returns the pieces an invoice row (and the
// receipt) needs: what's taxed, the tax itself, and the grand total actually owed.
export function computeInvoiceAmounts(amount: number, discountAmount: number, taxRatePercent: number) {
  const taxableAmount = round2(Math.max(0, amount - discountAmount));
  const taxAmount = taxRatePercent > 0 ? round2((taxableAmount * taxRatePercent) / 100) : 0;
  const totalAmount = round2(taxableAmount + taxAmount);
  return { taxableAmount, taxAmount, totalAmount };
}

// Deep-links to WhatsApp with a prefilled draft message — staff still have to hit send
// themselves, so this is not automated delivery, just a shortcut into their own WhatsApp.
export function buildInvoiceWhatsAppLink(
  member: { full_name: string; mobile_number: string },
  invoice: Pick<Invoice, "invoice_number" | "total_amount" | "amount_paid" | "balance_due" | "currency">
): string {
  const digits = member.mobile_number.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  const message =
    `Hi ${member.full_name}, here is your invoice ${invoice.invoice_number} from Body & Soul Fitness Center. ` +
    `Total: ${invoice.currency} ${invoice.total_amount.toFixed(2)}, Paid: ${invoice.currency} ${invoice.amount_paid.toFixed(2)}, ` +
    `Balance due: ${invoice.currency} ${invoice.balance_due.toFixed(2)}. Thank you!`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
