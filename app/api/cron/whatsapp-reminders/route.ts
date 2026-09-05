import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_GYM_SETTINGS, GYM_SETTINGS_ID } from "@/lib/settings/types";
import { addDays } from "@/lib/subscriptions/types";
import { sendNotification } from "@/lib/whatsapp/send";
import type { NotificationType } from "@/lib/whatsapp/types";

export const runtime = "nodejs";

type Candidate = {
  id: string;
  member_id: string;
  plan_name: string;
  end_date: string;
  members: { full_name: string } | null;
};

const reminderType = (days: number): NotificationType | null => days === 7 ? "expiry_reminder_7" : days === 3 ? "expiry_reminder_3" : days === 1 ? "expiry_reminder_1" : null;

// Vercel Cron calls this daily. Reminders fire for subscriptions whose end_date is exactly N days
// out; the expired notice fires the day after end_date. A subscription that's been renewed keeps
// its old `status = 'active'` row (renewal creates a new row rather than mutating the old one —
// see app/(admin)/subscriptions/actions.ts), so candidates are filtered against any newer
// subscription that names them via `renewed_from_id` before sending.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: settingsRow } = await supabaseAdmin.from("gym_settings").select("gym_name,expiry_reminder_days").eq("id", GYM_SETTINGS_ID).maybeSingle();
  const gymName = settingsRow?.gym_name ?? DEFAULT_GYM_SETTINGS.gym_name;

  const results: Array<{ type: NotificationType; memberId: string; ok: boolean; errorMessage?: string }> = [];

  async function excludeRenewed(candidates: Candidate[]): Promise<Candidate[]> {
    if (candidates.length === 0) return candidates;
    const { data: renewals } = await supabaseAdmin.from("member_subscriptions").select("renewed_from_id").in("renewed_from_id", candidates.map((c) => c.id));
    const renewedIds = new Set((renewals ?? []).map((r) => r.renewed_from_id as string));
    return candidates.filter((c) => !renewedIds.has(c.id));
  }

  async function alreadyNotifiedIds(type: NotificationType, subscriptionIds: string[]): Promise<Set<string>> {
    if (subscriptionIds.length === 0) return new Set();
    const { data } = await supabaseAdmin
      .from("member_notifications")
      .select("subscription_id")
      .eq("notification_type", type)
      .in("subscription_id", subscriptionIds)
      .gte("sent_at", `${today}T00:00:00`)
      .in("status", ["sent", "delivered"]);
    return new Set((data ?? []).map((row) => row.subscription_id as string));
  }

  async function processWindow(type: NotificationType, endDate: string, performedByLabel: string) {
    const { data } = await supabaseAdmin
      .from("member_subscriptions")
      .select("id, member_id, plan_name, end_date, members(full_name)")
      .eq("status", "active")
      .eq("end_date", endDate);

    const candidates = await excludeRenewed(((data ?? []) as unknown) as Candidate[]);
    const notified = await alreadyNotifiedIds(type, candidates.map((c) => c.id));
    const pending = candidates.filter((c) => !notified.has(c.id));

    for (const sub of pending) {
      const result = await sendNotification({
        memberId: sub.member_id,
        notificationType: type,
        triggerSource: "automation",
        performedBy: performedByLabel,
        subscriptionId: sub.id,
        variables: {
          member_name: sub.members?.full_name ?? "",
          plan_name: sub.plan_name,
          end_date: sub.end_date,
          gym_name: gymName,
        },
      });
      results.push({ type, memberId: sub.member_id, ok: result.ok, errorMessage: result.errorMessage });
    }
  }

  async function processBirthdays() {
    const monthDay = today.slice(5);
    const { data: members } = await supabaseAdmin
      .from("members")
      .select("id, full_name, date_of_birth")
      .not("date_of_birth", "is", null)
      .like("date_of_birth", `%-${monthDay}`);
    const yearStart = `${today.slice(0, 4)}-01-01T00:00:00.000Z`;

    for (const member of members ?? []) {
      const { data: previous } = await supabaseAdmin
        .from("member_notifications")
        .select("id")
        .eq("member_id", member.id)
        .eq("notification_type", "birthday")
        .gte("sent_at", yearStart)
        .in("status", ["sent", "delivered"])
        .limit(1);
      if ((previous ?? []).length > 0) continue;

      const result = await sendNotification({
        memberId: member.id,
        notificationType: "birthday",
        triggerSource: "automation",
        performedBy: "Automation: Birthday greeting",
        variables: { member_name: member.full_name ?? "", gym_name: gymName },
      });
      results.push({ type: "birthday", memberId: member.id, ok: result.ok, errorMessage: result.errorMessage });
    }
  }

  const configuredDays = (settingsRow?.expiry_reminder_days ?? [7, 3, 1]) as number[];
  const windows = configuredDays.map((days: number) => ({ daysBeforeEnd: days, type: reminderType(days) })).filter((window: { daysBeforeEnd: number; type: NotificationType | null }): window is { daysBeforeEnd: number; type: NotificationType } => Boolean(window.type));
  for (const window of windows) {
    await processWindow(window.type, addDays(today, window.daysBeforeEnd), `Automation: Expiry reminder (${window.daysBeforeEnd} day${window.daysBeforeEnd === 1 ? "" : "s"})`);
  }
  await processWindow("expired", addDays(today, -1), "Automation: Subscription expired");
  await processBirthdays();

  return Response.json({ ok: true, date: today, processed: results.length, results });
}
