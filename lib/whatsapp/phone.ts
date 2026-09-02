// Shared with lib/invoices/types.ts's buildInvoiceWhatsAppLink heuristic: a bare 10-digit local
// number is assumed to be Indian (this gym's only market today) and gets "91" prepended; anything
// else is passed through digits-only, assumed to already include a country code.
export function normalizeToE164(raw: string, defaultCountryCode = "91"): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length === 10 ? `${defaultCountryCode}${digits}` : digits;
}

/**
 * Normalizes an Indian mobile number for WhatsApp click-to-chat. Unlike the
 * broader E.164 helper above, this deliberately rejects non-Indian or malformed
 * numbers so a staff member is never sent to an unusable wa.me link.
 */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  const localNumber = digits.length === 10 ? digits : digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : null;

  // Indian mobile numbers are ten digits and begin with 6–9.
  return localNumber && /^[6-9]\d{9}$/.test(localNumber) ? `91${localNumber}` : null;
}

export function isValidWhatsAppPhone(raw: string | null | undefined): boolean {
  return normalizeWhatsAppPhone(raw) !== null;
}

// Member records intentionally use digits-only phone numbers. Supabase Auth,
// however, requires the international E.164 representation for phone/password sign-in.
export function toSupabaseAuthPhone(raw: string): string | null {
  const digits = normalizeToE164(raw);
  return digits ? `+${digits}` : null;
}
