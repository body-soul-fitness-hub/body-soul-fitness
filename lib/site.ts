// Base URL used to build public receipt links sent over WhatsApp. The verified public domain is
// the safe production fallback; NEXT_PUBLIC_SITE_URL can still override it per environment.
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return "https://www.bodyandsoul.co.in";
}
