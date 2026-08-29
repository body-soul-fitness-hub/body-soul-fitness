import { supabaseAdmin } from "@/lib/supabase/server";
import { PLAN_EXPIRING_SOON_DAYS, type MemberStatus, type PlanStatus } from "@/lib/members/types";

export const PAGE_SIZE = 20;

export type MemberFilters = {
  q?: string;
  status?: MemberStatus;
  trainer?: string;
  planStatus?: PlanStatus;
  from?: string;
  to?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseMemberFilters(searchParams: SearchParams): MemberFilters {
  return {
    q: first(searchParams.q),
    status: first(searchParams.status) as MemberStatus | undefined,
    trainer: first(searchParams.trainer),
    planStatus: first(searchParams.planStatus) as PlanStatus | undefined,
    from: first(searchParams.from),
    to: first(searchParams.to),
  };
}

export function parsePage(searchParams: SearchParams): number {
  const raw = Number(first(searchParams.page) ?? "1");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

// Plan status lives on member_subscriptions, not members, so filtering by it means first
// resolving which member IDs currently match, then constraining the members query to that set.
export async function getMemberIdsForPlanStatus(planStatus: PlanStatus): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const soonCutoff = new Date();
  soonCutoff.setDate(soonCutoff.getDate() + PLAN_EXPIRING_SOON_DAYS);
  const soonCutoffStr = soonCutoff.toISOString().slice(0, 10);

  if (planStatus === "no_plan") {
    const { data: withPlans } = await supabaseAdmin.from("member_subscriptions").select("member_id");
    const idsWithPlans = new Set((withPlans ?? []).map((row) => row.member_id as string));
    const { data: allMembers } = await supabaseAdmin.from("members").select("id");
    return (allMembers ?? []).map((row) => row.id as string).filter((id) => !idsWithPlans.has(id));
  }

  if (planStatus === "active") {
    const { data } = await supabaseAdmin
      .from("member_subscriptions")
      .select("member_id")
      .eq("status", "active")
      .or(`end_date.is.null,end_date.gt.${soonCutoffStr}`);
    return Array.from(new Set((data ?? []).map((row) => row.member_id as string)));
  }

  if (planStatus === "expiring_soon") {
    const { data } = await supabaseAdmin
      .from("member_subscriptions")
      .select("member_id")
      .eq("status", "active")
      .gte("end_date", today)
      .lte("end_date", soonCutoffStr);
    return Array.from(new Set((data ?? []).map((row) => row.member_id as string)));
  }

  // expired: no active, non-expired subscription remains
  const { data: expiredCandidates } = await supabaseAdmin
    .from("member_subscriptions")
    .select("member_id, status, end_date");
  const byMember = new Map<string, { status: string; end_date: string | null }[]>();
  for (const row of expiredCandidates ?? []) {
    const list = byMember.get(row.member_id as string) ?? [];
    list.push({ status: row.status as string, end_date: row.end_date as string | null });
    byMember.set(row.member_id as string, list);
  }
  const expiredIds: string[] = [];
  for (const [memberId, subs] of byMember) {
    const hasCurrentlyActive = subs.some((s) => s.status === "active" && (!s.end_date || s.end_date >= today));
    if (!hasCurrentlyActive) expiredIds.push(memberId);
  }
  return expiredIds;
}

export function buildMembersQuery(filters: MemberFilters, restrictToIds?: string[]) {
  let query = supabaseAdmin.from("members").select("*", { count: "exact" });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.trainer) query = query.eq("assigned_trainer", filters.trainer);
  if (filters.from) query = query.gte("join_date", filters.from);
  if (filters.to) query = query.lte("join_date", filters.to);
  if (filters.q) {
    const escaped = filters.q.replace(/[%_,]/g, (match) => `\\${match}`);
    query = query.or(`full_name.ilike.%${escaped}%,mobile_number.ilike.%${escaped}%,member_id.ilike.%${escaped}%`);
  }
  if (restrictToIds) {
    query = query.in("id", restrictToIds.length > 0 ? restrictToIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  return query;
}
