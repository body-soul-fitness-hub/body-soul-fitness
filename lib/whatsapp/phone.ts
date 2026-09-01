// Shared with lib/invoices/types.ts's buildInvoiceWhatsAppLink heuristic: a bare 10-digit local
// number is assumed to be Indian (this gym's only market today) and gets "91" prepended; anything
// else is passed through digits-only, assumed to already include a country code.
export function normalizeToE164(raw: string, defaultCountryCode = "91"): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length === 10 ? `${defaultCountryCode}${digits}` : digits;
}

// Member records intentionally use digits-only phone numbers. Supabase Auth,
// however, requires the international E.164 representation for phone/password sign-in.
export function toSupabaseAuthPhone(raw: string): string | null {
  const digits = normalizeToE164(raw);
  return digits ? `+${digits}` : null;
}
