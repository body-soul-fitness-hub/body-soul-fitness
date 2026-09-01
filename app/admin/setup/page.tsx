import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import SetupForm from "./setup-form";

export default async function SetupPage() {
  const { count } = await supabaseAdmin.from("staff_users").select("id", { count: "exact", head: true }).eq("role", "administrator");
  if (count && count > 0) redirect("/admin/login");
  return <SetupForm />;
}
