import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";

type InvoiceTemplateData = {
  memberName: string;
  gymName: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  membershipPlan?: string | null;
  membershipExpiryDate?: string | null;
};

type RenewalTemplateData = {
  memberName: string;
  gymName: string;
  membershipExpiryDate?: string | null;
  membershipPlan?: string | null;
  renewalAmount?: number | null;
};

function amount(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Centralized Phase 1 copy. Add future click-to-chat templates here. */
export const whatsappTemplates = {
  general: ({ memberName, gymName }: { memberName: string; gymName: string }) =>
    `Hi ${memberName},\n\nGreetings from ${gymName}.\n\nHow can we assist you today?`,
  invoice: (data: InvoiceTemplateData) => {
    const lines = [
      `Hi ${data.memberName},`,
      "",
      `Thank you for choosing ${data.gymName}.`,
      "",
      "Your payment/invoice details are:",
      `Invoice No: ${data.invoiceNumber}`,
      `Amount: ${amount(data.amount)}`,
      `Payment Date: ${data.paymentDate}`,
    ];
    if (data.membershipPlan) lines.push(`Membership Plan: ${data.membershipPlan}`);
    if (data.membershipExpiryDate) lines.push(`Valid Until: ${data.membershipExpiryDate}`);
    return `${lines.join("\n")}\n\nThank you,\n${data.gymName}`;
  },
  renewal: (data: RenewalTemplateData) => {
    const lines = [`Hi ${data.memberName},`, ""];
    if (data.membershipExpiryDate) lines.push(`Your ${data.gymName} membership is due for renewal on ${data.membershipExpiryDate}.`);
    else lines.push(`Your ${data.gymName} membership is due for renewal.`);
    lines.push("");
    if (data.membershipPlan) lines.push(`Membership Plan: ${data.membershipPlan}`);
    if (data.renewalAmount !== null && data.renewalAmount !== undefined) lines.push(`Renewal Amount: ${amount(data.renewalAmount)}`);
    lines.push("", "Please contact us or visit the gym to renew your membership.", "", "Thank you,", data.gymName);
    return lines.join("\n");
  },
} as const;

/**
 * The sole Phase 1 transport: opens a locally composed draft in WhatsApp.
 * Keeping URL creation here makes a later provider/API replacement isolated.
 */
export const WhatsAppService = {
  normalizePhone: normalizeWhatsAppPhone,
  validatePhone: (phone: string | null | undefined) => normalizeWhatsAppPhone(phone) !== null,
  buildMessage: <T extends keyof typeof whatsappTemplates>(template: T, data: Parameters<(typeof whatsappTemplates)[T]>[0]) =>
    (whatsappTemplates[template] as (value: typeof data) => string)(data),
  buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
    const normalized = normalizeWhatsAppPhone(phone);
    return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : null;
  },
};
