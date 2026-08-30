"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function saveStaff(formData: FormData) {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "staff");
  if (!full_name || !/^\S+@\S+\.\S+$/.test(email)) return;
  await supabaseAdmin.from("staff_users").upsert({ full_name, email, role, is_active: formData.get("is_active") === "on", updated_at: new Date().toISOString() }, { onConflict: "email" });
  revalidatePath("/settings/staff");
}

export async function toggleStaff(formData: FormData) {
  const id = String(formData.get("id") ?? ""); const is_active = formData.get("is_active") === "true";
  if (id) await supabaseAdmin.from("staff_users").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/settings/staff");
}
