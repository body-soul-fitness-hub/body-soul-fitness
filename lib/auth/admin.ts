import "server-only";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/auth";

export type SuperAdmin = { id: string; fullName: string; email: string };

export async function getSuperAdmin(): Promise<SuperAdmin | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff } = await supabaseAdmin
    .from("staff_users")
    .select("full_name,email")
    .eq("auth_user_id", user.id)
    .eq("role", "administrator")
    .eq("is_active", true)
    .maybeSingle();

  return staff ? { id: user.id, fullName: staff.full_name, email: staff.email } : null;
}

export async function requireSuperAdmin() {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
