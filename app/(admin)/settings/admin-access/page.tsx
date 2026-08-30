import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import AdminAccessForm from "./admin-access-form";

export default async function AdminAccessPage() {
  const { data: administrators, error } = await supabaseAdmin.from("staff_users").select("id,full_name,email,is_active,created_at").eq("role", "administrator").order("full_name");
  return <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10"><Link href="/settings" className="inline-flex items-center gap-1 text-sm font-bold text-[#2563eb]"><ArrowLeft size={16}/> Settings</Link><div className="mt-4 max-w-3xl"><div className="flex items-center gap-2"><ShieldCheck className="text-[#2563eb]" size={22}/><h1 className="font-display text-3xl font-black">Super-admin access</h1></div><p className="mt-2 text-sm text-[#6980a5]">Each super-admin uses their own email and password. The dashboard shows the name of the person currently signed in.</p><div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.9fr]"><AdminAccessForm/><section className="rounded-3xl border border-[#dceaff] bg-white p-5"><h2 className="font-display text-xl font-black">Current access</h2>{error ? <p className="mt-4 text-sm font-bold text-[#a83848]">Could not load administrators.</p> : <div className="mt-4 divide-y divide-[#e7effb]">{(administrators ?? []).map((admin) => <div key={admin.id} className="py-3 first:pt-0"><p className="text-sm font-extrabold">{admin.full_name}</p><p className="mt-0.5 text-xs text-[#6980a5]">{admin.email} · {admin.is_active ? "Active" : "Disabled"}</p></div>)}</div>}</section></div></div></div>;
}
