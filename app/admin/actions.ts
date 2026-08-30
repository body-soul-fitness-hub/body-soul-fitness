"use server";

import { timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/auth";
import { getSuperAdmin } from "@/lib/auth/admin";

export type AdminFormState = { error?: string; success?: string };
const read = (form: FormData, field: string) => String(form.get(field) ?? "").trim();

export async function createFirstSuperAdmin(_previous: AdminFormState, form: FormData): Promise<AdminFormState> {
  const setupKey = read(form, "setup_key"); const fullName = read(form, "full_name"); const email = read(form, "email").toLowerCase(); const password = String(form.get("password") ?? "");
  const expected = process.env.SUPER_ADMIN_SETUP_KEY;
  if (!expected) return { error: "Initial setup is not configured. Add SUPER_ADMIN_SETUP_KEY to the server environment first." };
  const matches = setupKey.length === expected.length && timingSafeEqual(Buffer.from(setupKey), Buffer.from(expected));
  if (!matches) return { error: "The setup key is incorrect." };
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12) return { error: "Enter your name, a valid email, and a password of at least 12 characters." };
  const { count } = await supabaseAdmin.from("staff_users").select("id", { count: "exact", head: true }).eq("role", "administrator");
  if (count && count > 0) return { error: "The super-admin account has already been created. Please sign in instead." };
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return { error: error?.message ?? "Could not create the account." };
  const { error: staffError } = await supabaseAdmin.from("staff_users").insert({ auth_user_id: data.user.id, full_name: fullName, email, role: "administrator", is_active: true });
  if (staffError) { await supabaseAdmin.auth.admin.deleteUser(data.user.id); return { error: "Could not save the super-admin account. Please try again." }; }
  return { success: "Your super-admin account is ready. You can now sign in." };
}

export async function changeAdminPassword(_previous: AdminFormState, form: FormData): Promise<AdminFormState> {
  const password = String(form.get("password") ?? ""); const confirm = String(form.get("confirm_password") ?? "");
  if (password.length < 12) return { error: "Use a password of at least 12 characters." };
  if (password !== confirm) return { error: "The passwords do not match." };
  const supabase = await createServerSupabaseClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Please request a new one." };
  const { data: admin } = await supabaseAdmin.from("staff_users").select("id").eq("auth_user_id", user.id).eq("role", "administrator").eq("is_active", true).maybeSingle();
  if (!admin) return { error: "This reset link is not for an active super-admin account." };
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { error: error.message } : { success: "Password changed. You can now sign in with it." };
}

export async function createSuperAdmin(_previous: AdminFormState, form: FormData): Promise<AdminFormState> {
  const inviter = await getSuperAdmin();
  if (!inviter) return { error: "Only a signed-in super-admin can create another super-admin." };
  const fullName = read(form, "full_name"); const email = read(form, "email").toLowerCase();
  const password = String(form.get("password") ?? ""); const confirm = String(form.get("confirm_password") ?? "");
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter their full name and a valid email address." };
  if (password.length < 12) return { error: "Use an initial password of at least 12 characters." };
  if (password !== confirm) return { error: "The two password fields do not match." };
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return { error: error?.message ?? "Could not create the account." };
  const { error: staffError } = await supabaseAdmin.from("staff_users").insert({ auth_user_id: data.user.id, full_name: fullName, email, role: "administrator", is_active: true });
  if (staffError) { await supabaseAdmin.auth.admin.deleteUser(data.user.id); return { error: "Could not grant dashboard access. The account was not kept." }; }
  return { success: `${fullName}'s super-admin account is ready. Give them the email and initial password securely.` };
}

export async function logout() { const supabase = await createServerSupabaseClient(); await supabase.auth.signOut(); redirect("/admin/login"); }
