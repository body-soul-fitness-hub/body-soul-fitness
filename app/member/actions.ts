"use server";

import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizeToE164 } from "@/lib/whatsapp/phone";

export type PortalState = { error?: string; success?: string; name?: string };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

async function canUsePortal(memberId: string, status: string): Promise<boolean> {
  if (status !== "active") return false;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from("member_subscriptions")
    .select("id")
    .eq("member_id", memberId)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${today}`)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function activateMemberPortal(_previous: PortalState, form: FormData): Promise<PortalState> {
  const rawMobile = str(form, "mobile"); const memberId = str(form, "member_id").toUpperCase(); const code = str(form, "code"); const password = str(form, "password");
  if (!rawMobile || !memberId || !code || password.length < 8) return { error: "Enter the registered mobile number, Member ID, activation code, and an 8+ character password." };
  const mobile = normalizeToE164(rawMobile);
  if (!mobile) return { error: "Enter a valid mobile number." };
  const { data: member } = await supabaseAdmin.from("members").select("id,full_name,status,auth_user_id,portal_activation_hash,portal_activation_expires_at").eq("mobile_number", mobile).eq("member_id", memberId).maybeSingle();
  if (!member || !member.portal_activation_hash || member.portal_activation_hash !== hash(code) || !member.portal_activation_expires_at || new Date(member.portal_activation_expires_at) < new Date()) return { error: "That activation information is invalid or has expired. Please ask reception for a new code." };
  if (!await canUsePortal(member.id, member.status)) return { error: "Portal access is available only to members with a current active membership." };
  let authId = member.auth_user_id as string | null;
  const credentials = { password, phone_confirm: true };
  const response = authId ? await supabaseAdmin.auth.admin.updateUserById(authId, credentials) : await supabaseAdmin.auth.admin.createUser({ phone: mobile, ...credentials });
  if (response.error || (!authId && !response.data.user)) return { error: response.error?.message ?? "Could not create the member login." };
  authId = authId ?? response.data.user!.id;
  const { error } = await supabaseAdmin.from("members").update({ auth_user_id: authId, portal_activation_hash: null, portal_activation_expires_at: null, portal_activated_at: new Date().toISOString() }).eq("id", member.id);
  if (error) return { error: error.message };
  return { success: "Password set successfully. You can now sign in.", name: member.full_name };
}

export async function issuePortalCode(_previous: PortalState, form: FormData): Promise<PortalState> {
  const memberRowId = str(form, "member_row_id"); if (!memberRowId) return { error: "Member not found." };
  const code = randomBytes(6).toString("base64url").slice(0, 8).toUpperCase();
  const { data: member, error } = await supabaseAdmin.from("members").select("id,full_name,status").eq("id", memberRowId).single();
  if (error) return { error: error.message };
  if (!await canUsePortal(member.id, member.status)) return { error: "Only a member with a current active membership can receive portal access." };
  const { error: updateError } = await supabaseAdmin.from("members").update({ portal_activation_hash: hash(code), portal_activation_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).eq("id", memberRowId);
  if (updateError) return { error: updateError.message };
  return { success: `Give this one-time code to ${member.full_name}: ${code}. It expires in 24 hours.` };
}
