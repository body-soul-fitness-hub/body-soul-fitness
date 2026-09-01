import type { MemberSubscription } from "@/lib/subscriptions/types";

// Prefers a currently-active subscription (nearest end date); falls back to the most
// recently started subscription on record so an expired/legacy member still sees something.
export function pickCurrentSubscription(subscriptions: MemberSubscription[]): MemberSubscription | null {
  if (subscriptions.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const active = subscriptions.filter((s) => s.status === "active" && (!s.end_date || s.end_date >= today));
  if (active.length > 0) {
    return [...active].sort((a, b) => (a.end_date ?? "9999-12-31").localeCompare(b.end_date ?? "9999-12-31"))[0];
  }
  return [...subscriptions].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
}
