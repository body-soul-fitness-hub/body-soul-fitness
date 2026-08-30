"use server";

import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export type PortalState = { error?: string; success?: string; name?: string };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function activateMemberPortal(_previous: PortalState, form: FormData): Promise<PortalState> {
  const mobile = str(form, "mobile"); const memberId = str(form, "member_id").toUpperCase(); const code = str(form, "code"); const password = str(form, "password");
  if (!mobile || !memberId || !code || password.length < 8) return { error: "Enter the registered mobile number, Member ID, activation code, and an 8+ character password." };
  const { data: member } = await supabaseAdmin.from("members").select("id,full_name,auth_user_id,portal_activation_hash,portal_activation_expires_at").eq("mobile_number", mobile).eq("member_id", memberId).maybeSingle();
  if (!member || !member.portal_activation_hash || member.portal_activation_hash !== hash(code) || !member.portal_activation_expires_at || new Date(member.portal_activation_expires_at) < new Date()) return { error: "That activation information is invalid or has expired. Please ask reception for a new code." };
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
  const { data: member, error } = await supabaseAdmin.from("members").update({ portal_activation_hash: hash(code), portal_activation_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).eq("id", memberRowId).select("full_name").single();
  if (error) return { error: error.message };
  return { success: `Give this one-time code to ${member.full_name}: ${code}. It expires in 24 hours.` };
}
