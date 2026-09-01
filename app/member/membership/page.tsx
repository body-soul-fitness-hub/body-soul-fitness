"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { MemberNav } from "../components/member-nav";
import { useMemberSession } from "@/lib/member-portal/use-member-session";
import { pickCurrentSubscription } from "@/lib/member-portal/subscription";
import { formatIndiaDate, remainingDays } from "@/lib/member-portal/format";
import type { MemberSubscription } from "@/lib/subscriptions/types";

export default function MembershipPage() {
  const ready = useMemberSession();
  const [legacyPlan, setLegacyPlan] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<MemberSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const [{ data: memberRow }, { data: subs }] = await Promise.all([
        supabase.from("members").select("plan").maybeSingle(),
        supabase.from("member_subscriptions").select("*").order("start_date", { ascending: false }),
      ]);
      setLegacyPlan((memberRow as { plan: string | null } | null)?.plan ?? null);
      setSubscription(pickCurrentSubscription((subs ?? []) as MemberSubscription[]));
      setLoading(false);
    })();
  }, [ready]);

  if (!ready || loading) {
    return (
      <main className="min-h-screen bg-[#f5f7f4]">
        <MemberNav />
        <p className="px-5 py-10 text-center text-sm font-bold text-[#6c7773]">Loading…</p>
      </main>
    );
  }

  const days = remainingDays(subscription?.end_date ?? null);

  return (
    <main className="min-h-screen bg-[#f5f7f4] pb-12">
      <MemberNav />
      <div className="mx-auto max-w-md px-5 py-6">
        <Link href="/member/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6c7773]">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <h1 className="mt-3 font-display text-2xl font-black tracking-[-0.03em] text-[#0f1816]">Membership</h1>

        {subscription ? (
          <div className="mt-5 space-y-4">
            <section className="rounded-3xl border border-[#e5e9e5] bg-white p-5">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">Plan</p>
              <p className="mt-1 text-xl font-black text-[#0f1816]">{subscription.plan_name}</p>
              <span className="mt-3 inline-block rounded-full bg-[#e7f7c5] px-3 py-1 text-xs font-extrabold text-[#4f6d1e]">
                {subscription.status === "active" ? "Active" : subscription.status}
              </span>
            </section>
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#e5e9e5] bg-white p-4">
                <p className="text-xs font-bold text-[#89938f]">Start date</p>
                <p className="mt-1 text-sm font-extrabold text-[#0f1816]">{formatIndiaDate(subscription.start_date)}</p>
              </div>
              <div className="rounded-2xl border border-[#e5e9e5] bg-white p-4">
                <p className="text-xs font-bold text-[#89938f]">End date</p>
                <p className="mt-1 text-sm font-extrabold text-[#0f1816]">{formatIndiaDate(subscription.end_date)}</p>
              </div>
            </section>
            <section className="rounded-2xl border border-[#e5e9e5] bg-white p-4">
              <p className="text-xs font-bold text-[#89938f]">Days remaining</p>
              <p className="mt-1 text-sm font-extrabold text-[#0f1816]">
                {days === null ? "No end date on file" : days >= 0 ? `${days} days` : "Expired"}
              </p>
            </section>
            {subscription.notes && (
              <section className="rounded-2xl border border-[#e5e9e5] bg-white p-4">
                <p className="text-xs font-bold text-[#89938f]">Notes</p>
                <p className="mt-1 text-sm font-medium text-[#0f1816]">{subscription.notes}</p>
              </section>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-[#e5e9e5] bg-white p-5">
            <p className="text-base font-bold text-[#0f1816]">No active membership plan recorded</p>
            {legacyPlan ? (
              <p className="mt-2 text-sm font-medium text-[#6c7773]">
                Legacy plan on file: {legacyPlan}. Start and end dates aren&apos;t available for this record — please contact reception for details.
              </p>
            ) : (
              <p className="mt-2 text-sm font-medium text-[#6c7773]">Contact reception to set up your membership.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
