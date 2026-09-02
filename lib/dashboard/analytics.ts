import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export type DashboardAnalytics = {
  generatedAt: string;
  todayCheckins: number;
  membersInside: number;
  averageVisitMinutes: number | null;
  expiringThisWeek: number;
  risk: { high: number; medium: number; low: number };
  insights: Array<{ title: string; text: string }>;
  suggestedAction: { count: number; text: string } | null;
};

function dayInIndia(offsetDays = 0) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = formatter.formatToParts(new Date()).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + offsetDays));
  return date.toISOString().slice(0, 10);
}

function indiaDayStartIso() {
  return `${dayInIndia()}T00:00:00+05:30`;
}

export async function dashboardAnalytics(): Promise<DashboardAnalytics> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const today = dayInIndia();
  const weekEnd = dayInIndia(7);
  const [todayCheckinsResult, recentCheckinsResult, subscriptionsResult, membersResult, invoicesResult] = await Promise.all([
    supabaseAdmin.from("member_checkins").select("checked_in_at,checked_out_at,duration_minutes").gte("checked_in_at", indiaDayStartIso()).limit(5000),
    supabaseAdmin.from("member_checkins").select("member_id,checked_in_at").gte("checked_in_at", fourteenDaysAgo).limit(10000),
    supabaseAdmin.from("member_subscriptions").select("member_id,end_date,balance_due,created_at").eq("status", "active").or(`end_date.gte.${today},end_date.is.null`).order("created_at", { ascending: false }).limit(10000),
    supabaseAdmin.from("members").select("id").eq("status", "active").limit(10000),
    supabaseAdmin.from("invoices").select("balance_due").in("status", ["unpaid", "partial"]).limit(10000),
  ]);

  const todayCheckins = todayCheckinsResult.data ?? [];
  const completed = todayCheckins.filter((checkin) => checkin.checked_out_at);
  const averageVisitMinutes = completed.length
    ? Math.round(completed.reduce((total, checkin) => total + (checkin.duration_minutes ?? Math.max(0, Math.round((new Date(checkin.checked_out_at!).getTime() - new Date(checkin.checked_in_at).getTime()) / 60_000))), 0) / completed.length)
    : null;
  const visitCounts = new Map<string, number>();
  for (const checkin of recentCheckinsResult.data ?? []) visitCounts.set(checkin.member_id, (visitCounts.get(checkin.member_id) ?? 0) + 1);

  // A member can have subscription history. The most recently created active record is the current one.
  const currentSubscriptions = new Map<string, { end_date: string | null; balance_due: number | string | null }>();
  for (const subscription of subscriptionsResult.data ?? []) if (!currentSubscriptions.has(subscription.member_id)) currentSubscriptions.set(subscription.member_id, subscription);
  let high = 0; let medium = 0;
  const activeMemberIds = (membersResult.data ?? []).map((member) => member.id);
  for (const memberId of activeMemberIds) {
    const subscription = currentSubscriptions.get(memberId);
    const visits = visitCounts.get(memberId) ?? 0;
    const balance = Number(subscription?.balance_due ?? 0);
    const expiringSoon = Boolean(subscription?.end_date && subscription.end_date <= weekEnd);
    if (!subscription || visits === 0 || expiringSoon || balance > 0) high += 1;
    else if (visits <= 2) medium += 1;
  }
  const activeMembers = activeMemberIds.length || currentSubscriptions.size;
  const low = Math.max(0, activeMembers - high - medium);
  const expiringThisWeek = [...currentSubscriptions.values()].filter((subscription) => subscription.end_date && subscription.end_date <= weekEnd).length;
  const outstandingBalance = (invoicesResult.data ?? []).reduce((sum, invoice) => sum + Number(invoice.balance_due ?? 0), 0);
  const attendanceByHour = new Map<number, number>();
  for (const checkin of recentCheckinsResult.data ?? []) {
    const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(new Date(checkin.checked_in_at)));
    attendanceByHour.set(hour, (attendanceByHour.get(hour) ?? 0) + 1);
  }
  const peakHour = [...attendanceByHour.entries()].sort((a, b) => b[1] - a[1])[0];
  const insights = [
    ...(peakHour ? [{ title: "Peak attendance", text: `${String(peakHour[0]).padStart(2, "0")}:00–${String((peakHour[0] + 1) % 24).padStart(2, "0")}:00 has been the busiest hour in the last 14 days.` }] : []),
    ...(expiringThisWeek ? [{ title: "Renewals due", text: `${expiringThisWeek} active membership${expiringThisWeek === 1 ? "" : "s"} end within the next 7 days.` }] : []),
    ...(outstandingBalance > 0 ? [{ title: "Outstanding balance", text: `₹${Math.round(outstandingBalance).toLocaleString("en-IN")} remains unpaid across open invoices.` }] : [{ title: "Payments status", text: "No outstanding invoice balance is currently recorded." }]),
  ].slice(0, 3);

  return {
    generatedAt: now.toISOString(), todayCheckins: todayCheckins.length,
    membersInside: todayCheckins.filter((checkin) => !checkin.checked_out_at).length,
    averageVisitMinutes, expiringThisWeek, risk: { high, medium, low }, insights,
    suggestedAction: high ? { count: high, text: `${high} member${high === 1 ? "" : "s"} need attention because of low attendance, an upcoming expiry, or an unpaid balance.` } : null,
  };
}
