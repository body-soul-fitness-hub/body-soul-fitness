import { toCsv } from "@/lib/csv";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const [members, subscriptions, payments, enquiries, attendance] = await Promise.all([
    supabaseAdmin.from("members").select("member_id,full_name,mobile_number,email,status,join_date").limit(10000),
    supabaseAdmin.from("member_subscriptions").select("plan_name,start_date,end_date,status,final_amount,balance_due").limit(10000),
    supabaseAdmin.from("member_payments").select("payment_date,amount,currency,method,reference").limit(10000),
    supabaseAdmin.from("enquiries").select("full_name,mobile_number,enquiry_date,source,status").limit(10000),
    supabaseAdmin.from("member_checkins").select("checked_in_at,checked_out_at,method,duration_minutes").limit(10000),
  ]);
  if ([members, subscriptions, payments, enquiries, attendance].some((result) => result.error)) return new Response("Could not prepare the data export.", { status: 500 });
  const files = [["members", members.data ?? []], ["subscriptions", subscriptions.data ?? []], ["payments", payments.data ?? []], ["enquiries", enquiries.data ?? []], ["attendance", attendance.data ?? []]].map(([name, rows]) => `\n\n### ${name}.csv\n${toCsv(rows as Array<Record<string, unknown>>, Object.keys((rows as any[])[0] ?? {}).map((key) => ({ key, header: key })))}`).join("");
  return new Response(`Body & Soul data backup${files}`, { headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": "attachment; filename=body-soul-data-backup.txt" } });
}
