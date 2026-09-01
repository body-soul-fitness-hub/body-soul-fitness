import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";

const LABELS: Record<string, string> = {
  success: "Signed in",
  invalid_credentials: "Incorrect password",
  captcha_failed: "hCaptcha failed",
  member_inactive: "Member inactive",
  membership_inactive: "Membership inactive",
  account_not_ready: "Portal not set up",
  unknown_member: "Mobile not found",
  invalid_request: "Incomplete request",
  service_error: "System error",
};

export default async function MemberLoginIssuesPage() {
  const { data, error } = await supabaseAdmin
    .from("member_auth_events")
    .select("id,mobile_masked,outcome,auth_error_code,device_summary,created_at,members(member_id,full_name)")
    .order("created_at", { ascending: false })
    .limit(250);

  return <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10">
    <Link href="/settings" className="inline-flex items-center gap-1 text-sm font-bold text-[#577c25]"><ArrowLeft size={16}/> Settings</Link>
    <div className="mt-4 flex items-start gap-3"><CircleAlert className="mt-1 text-[#c07818]" size={22}/><div><h1 className="font-display text-3xl font-black">Member login issues</h1><p className="mt-2 max-w-2xl text-sm text-[#6c7773]">Latest member portal sign-in results. Passwords, hCaptcha tokens, and raw IP addresses are never recorded.</p></div></div>
    <div className="mt-6 overflow-x-auto rounded-3xl border border-[#e5e9e5] bg-white">
      {error ? <p className="p-6 text-sm font-bold text-[#a94f37]">Could not load login events: {error.message}</p> : <table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[#e5e9e5] text-xs uppercase text-[#89938f]"><th className="px-5 py-3">Time</th><th className="px-5 py-3">Member / mobile</th><th className="px-5 py-3">Result</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Device</th></tr></thead><tbody>{(data ?? []).map((row: any) => <tr className="border-b border-[#f0f2f0]" key={row.id}><td className="whitespace-nowrap px-5 py-3">{new Date(row.created_at).toLocaleString()}</td><td className="px-5 py-3"><p className="font-bold">{row.members?.full_name ?? "Unknown member"}</p><p className="text-xs text-[#89938f]">{row.members?.member_id ?? row.mobile_masked}</p></td><td className="px-5 py-3"><span className={row.outcome === "success" ? "inline-flex items-center gap-1 font-bold text-[#577c25]" : "inline-flex items-center gap-1 font-bold text-[#a94f37]"}>{row.outcome === "success" && <CheckCircle2 size={15}/>} {LABELS[row.outcome] ?? row.outcome}</span></td><td className="px-5 py-3 font-mono text-xs text-[#6c7773]">{row.auth_error_code ?? "—"}</td><td className="max-w-xs truncate px-5 py-3 text-xs text-[#6c7773]" title={row.device_summary ?? undefined}>{row.device_summary ?? "—"}</td></tr>)}</tbody></table>}
    </div>
  </div>;
}
