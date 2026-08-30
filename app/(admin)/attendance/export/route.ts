import { supabaseAdmin } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const url = new URL(request.url); const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10); const status = url.searchParams.get("status") || "all";
  let query = supabaseAdmin.from("member_checkins").select("checked_in_at,checked_out_at,duration_minutes,method,checkin_staff,checkout_staff,members!inner(member_id,full_name,mobile_number)").gte("checked_in_at", `${date}T00:00:00.000Z`).lte("checked_in_at", `${date}T23:59:59.999Z`).order("checked_in_at", { ascending: false }).limit(5000);
  if (status === "inside") query = query.is("checked_out_at", null); if (status === "completed") query = query.not("checked_out_at", "is", null);
  const { data, error } = await query; if (error) return new Response(error.message, { status: 500 });
  const rows = (data ?? []) as unknown as Array<{ checked_in_at: string; checked_out_at: string | null; duration_minutes: number | null; method: string; checkin_staff: string | null; checkout_staff: string | null; members: Array<{ member_id: string; full_name: string; mobile_number: string }> }>;
  const csv = toCsv(rows.map((v) => ({ member_id: v.members[0]?.member_id, member: v.members[0]?.full_name, mobile: v.members[0]?.mobile_number, check_in: v.checked_in_at, check_out: v.checked_out_at, duration_minutes: v.duration_minutes, status: v.checked_out_at ? "Checked out" : "Inside", method: v.method, checkin_staff: v.checkin_staff, checkout_staff: v.checkout_staff })), [{ key: "member_id", header: "Member ID" }, { key: "member", header: "Member" }, { key: "mobile", header: "Mobile" }, { key: "check_in", header: "Check-in" }, { key: "check_out", header: "Check-out" }, { key: "duration_minutes", header: "Duration (minutes)" }, { key: "status", header: "Status" }, { key: "method", header: "Method" }, { key: "checkin_staff", header: "Check-in staff" }, { key: "checkout_staff", header: "Check-out staff" }]);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="attendance-${date}.csv"` } });
}
