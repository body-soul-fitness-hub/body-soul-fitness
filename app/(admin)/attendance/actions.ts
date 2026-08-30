"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { memberIdFromQrPayload } from "@/lib/attendance/qr";
import type { AttendanceResult, AttendanceSettings } from "@/lib/attendance/types";

function value(formData: FormData, key: string) { const v = formData.get(key); return typeof v === "string" ? v.trim() : ""; }
function today() { return new Date().toISOString().slice(0, 10); }

async function eligible(member: { status: string; id: string }, settings: AttendanceSettings): Promise<string | null> {
  if (member.status === "suspended" && settings.block_suspended) return "Check-in blocked: this member is suspended.";
  if (["inactive", "frozen"].includes(member.status) && settings.block_inactive) return "Check-in blocked: this member is inactive or frozen.";
  if (member.status === "expired" && settings.block_expired) return "Check-in blocked: this member is expired.";
  const { data: subscriptions } = await supabaseAdmin.from("member_subscriptions").select("status,end_date").eq("member_id", member.id).eq("status", "active");
  const activePlan = (subscriptions ?? []).some((sub) => !sub.end_date || sub.end_date >= today());
  return !activePlan && settings.block_expired ? "Check-in blocked: no active subscription was found." : null;
}

export async function recordAttendance(_previous: AttendanceResult | null, formData: FormData): Promise<AttendanceResult> {
  const scanValue = value(formData, "scan_value");
  const mode = value(formData, "mode") || "manual";
  const staff = value(formData, "staff") || "Front desk";
  const device = value(formData, "device") || "Staff scanner";
  if (!scanValue) return { ok: false, message: "Scan a QR code or enter a member ID, mobile number, or name." };

  const qrMemberId = mode === "qr" ? memberIdFromQrPayload(scanValue) : null;
  if (mode === "qr" && !qrMemberId) return { ok: false, message: "Invalid or tampered QR code." };
  let query = supabaseAdmin.from("members").select("id,member_id,full_name,status").limit(2);
  if (qrMemberId) query = query.eq("member_id", qrMemberId);
  else query = query.or(`member_id.ilike.${scanValue},mobile_number.ilike.${scanValue},full_name.ilike.%${scanValue.replace(/[,%]/g, "")}%`);
  const { data: matches, error } = await query;
  if (error || !matches?.length) return { ok: false, message: "No member matched that value." };
  if (matches.length > 1) return { ok: false, message: "More than one member matched. Use Member ID or mobile number." };
  const member = matches[0];
  const { data: policy } = await supabaseAdmin.from("attendance_settings").select("block_expired,block_suspended,block_inactive").eq("id", true).maybeSingle();
  const blocked = await eligible(member, policy ?? { block_expired: true, block_suspended: true, block_inactive: true });
  if (blocked) return { ok: false, message: blocked, memberName: member.full_name };

  // The open visit is member-scoped; this prevents an accidental second check-in from creating a duplicate visit.
  const { data: openVisit } = await supabaseAdmin.from("member_checkins").select("id,checked_in_at").eq("member_id", member.id).is("checked_out_at", null).order("checked_in_at", { ascending: false }).limit(1).maybeSingle();
  const now = new Date();
  if (openVisit) {
    const duration = Math.max(0, Math.round((now.getTime() - new Date(openVisit.checked_in_at).getTime()) / 60_000));
    const { error: updateError } = await supabaseAdmin.from("member_checkins").update({ checked_out_at: now.toISOString(), checkout_staff: staff, checkout_device: device, duration_minutes: duration }).eq("id", openVisit.id);
    if (updateError) return { ok: false, message: updateError.message };
    revalidatePath("/"); revalidatePath("/attendance"); revalidatePath(`/members/${member.id}`);
    return { ok: true, action: "check-out", memberName: member.full_name, message: `${member.full_name} checked out · ${duration} min visit.` };
  }
  const { error: insertError } = await supabaseAdmin.from("member_checkins").insert({ member_id: member.id, checked_in_at: now.toISOString(), method: mode, created_by: staff, checkin_staff: staff, checkin_device: device });
  if (insertError) return { ok: false, message: insertError.message };
  revalidatePath("/"); revalidatePath("/attendance"); revalidatePath(`/members/${member.id}`);
  return { ok: true, action: "check-in", memberName: member.full_name, message: `${member.full_name} checked in successfully.` };
}

export async function updateAttendancePolicy(formData: FormData) {
  await supabaseAdmin.from("attendance_settings").upsert({ id: true, block_expired: formData.get("block_expired") === "on", block_suspended: formData.get("block_suspended") === "on", block_inactive: formData.get("block_inactive") === "on", updated_at: new Date().toISOString(), updated_by: "Administrator" });
  revalidatePath("/attendance");
}
