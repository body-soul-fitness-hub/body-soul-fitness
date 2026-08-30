// Base URL used to build the public receipt link sent over WhatsApp. NEXT_PUBLIC_SITE_URL should
// be set to the real production domain; VERCEL_URL (deployment-specific) and localhost are
// fallbacks for preview/dev environments.
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
