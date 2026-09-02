"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

export default function DashboardLive({ generatedAt }: Pick<DashboardAnalytics, "generatedAt">) {
  const router = useRouter(); const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => {
    const refresh = () => router.refresh();
    const interval = window.setInterval(refresh, 30_000);
    const channel = browserSupabase.channel("admin-dashboard-live").on("postgres_changes", { event: "*", schema: "public", table: "member_checkins" }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "member_subscriptions" }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, refresh).subscribe();
    return () => { window.clearInterval(interval); browserSupabase.removeChannel(channel); };
  }, [router]);
  async function ask() {
    setError(""); setAnswer(""); if (!question.trim()) return; setLoading(true);
    try { const response = await fetch("/api/admin/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not get an answer."); setAnswer(data.answer); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not get an answer."); }
    finally { setLoading(false); }
  }
  return <section className="rounded-3xl border border-[#dceaff] bg-white p-5 shadow-[0_12px_35px_rgba(37,99,235,.05)] sm:p-6"><div className="flex items-center gap-2 text-sm font-extrabold text-[#2563eb]"><Bot size={19} /> Ask B&S AI <span className="ml-auto text-[11px] text-[#6980a5]">Updated {new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><div className="mt-4 flex gap-3 rounded-2xl border border-[#dceaff] bg-[#f7fbff] p-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") ask(); }} placeholder="Ask about attendance, renewals, or revenue…" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[#8aa0bf]" /><button type="button" disabled={loading} onClick={ask} aria-label="Send AI question" className="grid size-10 place-items-center rounded-xl bg-[#2563eb] text-white disabled:opacity-50"><Send size={17} /></button></div>{answer && <p className="mt-3 rounded-xl bg-[#eef6ff] p-3 text-sm leading-6 text-[#24476f]">{answer}</p>}{error && <p className="mt-3 text-xs font-semibold text-[#c43f4b]">{error}</p>}</section>;
}
