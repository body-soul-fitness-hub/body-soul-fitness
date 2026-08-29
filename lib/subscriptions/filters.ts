import { supabaseAdmin } from "@/lib/supabase/server";
import { addDays, SUBSCRIPTION_EXPIRING_SOON_DAYS, type SubscriptionDisplayStatus } from "@/lib/subscriptions/types";

export const PAGE_SIZE = 20;

export type SubscriptionFilters = {
  status?: SubscriptionDisplayStatus;
  q?: string;
  from?: string;
  to?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseSubscriptionFilters(searchParams: SearchParams): SubscriptionFilters {
  return {
    status: first(searchParams.status) as SubscriptionDisplayStatus | undefined,
    q: first(searchParams.q),
    from: first(searchParams.from),
    to: first(searchParams.to),
  };
}

export function parsePage(searchParams: SearchParams): number {
  const raw = Number(first(searchParams.page) ?? "1");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

// member_subscriptions only stores member_id, so a name/mobile/member-ID search resolves to a
// set of member IDs first — same two-step pattern as lib/members/filters.ts's plan-status filter.
export async function getMemberIdsForQuery(q: string): Promise<string[]> {
  const escaped = q.replace(/[%_,]/g, (match) => `\\${match}`);
  const { data } = await supabaseAdmin
    .from("members")
    .select("id")
    .or(`full_name.ilike.%${escaped}%,mobile_number.ilike.%${escaped}%,member_id.ilike.%${escaped}%`);
  return (data ?? []).map((row) => row.id as string);
}

export function buildSubscriptionsQuery(filters: SubscriptionFilters, restrictToIds?: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  const soonCutoff = addDays(today, SUBSCRIPTION_EXPIRING_SOON_DAYS);

  let query = supabaseAdmin
    .from("member_subscriptions")
    .select("*, members(id, full_name, member_id, mobile_number)", { count: "exact" });

  if (filters.from) query = query.gte("start_date", filters.from);
  if (filters.to) query = query.lte("start_date", filters.to);
  if (restrictToIds) {
    query = query.in("member_id", restrictToIds.length > 0 ? restrictToIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  switch (filters.status) {
    case "frozen":
      query = query.eq("status", "frozen");
      break;
    case "cancelled":
      query = query.eq("status", "cancelled");
      break;
    case "active":
      query = query.eq("status", "active").or(`end_date.is.null,end_date.gt.${soonCutoff}`);
      break;
    case "expiring_soon":
      query = query.eq("status", "active").gte("end_date", today).lte("end_date", soonCutoff);
      break;
    case "expired":
      query = query.eq("status", "active").lt("end_date", today);
      break;
    default:
      break;
  }

  return query;
}

export type ExpiryAlertRow = {
  id: string;
  end_date: string;
  plan_name: string;
  members: { id: string; full_name: string; member_id: string; mobile_number: string } | null;
};

// Exact-day reminder cadence (expires in exactly 7 / 3 / 1 days), not a cumulative "within N
// days" bucket — matches the single documented SUBSCRIPTION_EXPIRING_SOON_DAYS window used
// elsewhere, fetched once and then split by exact day offset.
export async function getExpiryAlerts(): Promise<Record<7 | 3 | 1, ExpiryAlertRow[]>> {
  const today = new Date().toISOString().slice(0, 10);
  const farthest = addDays(today, 7);

  const { data } = await supabaseAdmin
    .from("member_subscriptions")
    .select("id, end_date, plan_name, members(id, full_name, member_id, mobile_number)")
    .eq("status", "active")
    .gte("end_date", today)
    .lte("end_date", farthest)
    .order("end_date", { ascending: true });

  const rows = (data ?? []) as unknown as ExpiryAlertRow[];
  const bucket = (days: number) => rows.filter((row) => row.end_date === addDays(today, days));

  return { 7: bucket(7), 3: bucket(3), 1: bucket(1) };
}
