import { supabaseAdmin } from "@/lib/supabase/server";

export type DateFilters = { from?: string; to?: string };
export const REPORT_TYPES = ["enquiries", "conversion", "registrations", "memberships", "expiring", "revenue", "balances", "attendance", "visitors"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

function applyDate<T extends { gte: Function; lte: Function }>(query: T, column: string, filters: DateFilters): T {
  if (filters.from) query = query.gte(column, filters.from);
  if (filters.to) query = query.lte(column, filters.to);
  return query;
}

export async function reportRows(type: ReportType, filters: DateFilters) {
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  switch (type) {
    case "enquiries": {
      const { data, error } = await applyDate(supabaseAdmin.from("enquiries").select("enquiry_date,source,status,full_name,mobile_number").order("enquiry_date", { ascending: false }).limit(5000), "enquiry_date", filters);
      return { rows: data ?? [], error };
    }
    case "conversion": {
      const { data, error } = await applyDate(supabaseAdmin.from("enquiries").select("enquiry_date,status,source"), "enquiry_date", filters);
      return { rows: data ?? [], error };
    }
    case "registrations": { const { data, error } = await applyDate(supabaseAdmin.from("members").select("join_date,member_id,full_name,mobile_number,status").order("join_date", { ascending: false }).limit(5000), "join_date", filters); return { rows: data ?? [], error }; }
    case "memberships": { const { data, error } = await supabaseAdmin.from("members").select("member_id,full_name,status,join_date").order("full_name").limit(5000); return { rows: data ?? [], error }; }
    case "expiring": { const { data, error } = await supabaseAdmin.from("member_subscriptions").select("plan_name,end_date,status,members!inner(member_id,full_name,mobile_number)").eq("status", "active").gte("end_date", today).lte("end_date", soon).order("end_date").limit(5000); return { rows: (data ?? []).map((r: any) => ({ member_id: r.members?.member_id, member: r.members?.full_name, mobile: r.members?.mobile_number, plan: r.plan_name, expiry_date: r.end_date, days_remaining: Math.ceil((new Date(r.end_date).getTime() - new Date(today).getTime()) / 86_400_000) })), error }; }
    case "revenue": { const { data, error } = await applyDate(supabaseAdmin.from("member_payments").select("payment_date,amount,currency,method,received_by,members(member_id,full_name),member_subscriptions(plan_name)").order("payment_date", { ascending: false }).limit(5000), "payment_date", filters); return { rows: (data ?? []).map((r: any) => ({ date: r.payment_date, member: r.members?.full_name, member_id: r.members?.member_id, plan: r.member_subscriptions?.plan_name, amount: r.amount, currency: r.currency, payment_mode: r.method, received_by: r.received_by })), error }; }
    case "balances": { const { data, error } = await supabaseAdmin.from("invoices").select("invoice_number,issue_date,total_amount,amount_paid,balance_due,status,members(member_id,full_name,mobile_number)").gt("balance_due", 0).order("balance_due", { ascending: false }).limit(5000); return { rows: (data ?? []).map((r: any) => ({ invoice: r.invoice_number, date: r.issue_date, member: r.members?.full_name, member_id: r.members?.member_id, mobile: r.members?.mobile_number, total: r.total_amount, paid: r.amount_paid, outstanding: r.balance_due, status: r.status })), error }; }
    case "attendance": { const { data, error } = await applyDate(supabaseAdmin.from("member_checkins").select("checked_in_at,checked_out_at,duration_minutes,method,members(member_id,full_name)").order("checked_in_at", { ascending: false }).limit(5000), "checked_in_at", filters); return { rows: (data ?? []).map((r: any) => ({ member: r.members?.full_name, member_id: r.members?.member_id, check_in: r.checked_in_at, check_out: r.checked_out_at, duration_minutes: r.duration_minutes, method: r.method })), error }; }
    case "visitors": { const { data, error } = await applyDate(supabaseAdmin.from("member_checkins").select("member_id,members(member_id,full_name)"), "checked_in_at", filters); const counts = new Map<string, { member: string; member_id: string; visits: number }>(); (data ?? []).forEach((r: any) => { const key = r.member_id; const c = counts.get(key) ?? { member: r.members?.full_name ?? "Unknown", member_id: r.members?.member_id ?? "—", visits: 0 }; c.visits++; counts.set(key, c); }); return { rows: Array.from(counts.values()).sort((a, b) => b.visits - a.visits), error }; }
  }
}
