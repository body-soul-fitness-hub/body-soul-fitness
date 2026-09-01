"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, UserCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { MemberNav } from "../components/member-nav";
import { useMemberSession } from "@/lib/member-portal/use-member-session";
import { pickCurrentSubscription } from "@/lib/member-portal/subscription";
import { formatIndiaDate, remainingDays } from "@/lib/member-portal/format";
import type { MemberSubscription } from "@/lib/subscriptions/types";
import type { Member } from "@/lib/members/types";

type ProfileMember = Pick<
  Member,
  "id" | "member_id" | "full_name" | "mobile_number" | "email" | "join_date" | "fitness_goal" | "assigned_trainer" | "photo_path" | "plan"
>;

export default function MemberProfilePage() {
  const ready = useMemberSession();
  const [member, setMember] = useState<ProfileMember | null>(null);
  const [subscription, setSubscription] = useState<MemberSubscription | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const [{ data: memberRow }, { data: subs }, { count }] = await Promise.all([
        supabase.from("members").select("id,member_id,full_name,mobile_number,email,join_date,fitness_goal,assigned_trainer,photo_path,plan").maybeSingle(),
        supabase.from("member_subscriptions").select("*").order("start_date", { ascending: false }),
        supabase.from("member_workouts").select("id", { count: "exact", head: true }),
      ]);
      setMember((memberRow as ProfileMember) ?? null);
      setSubscription(pickCurrentSubscription((subs ?? []) as MemberSubscription[]));
      setWorkoutCount(count ?? 0);
      if (token) {
        try {
          const response = await fetch("/api/member/photo", { headers: { Authorization: `Bearer ${token}` } });
          const json = await response.json();
          setPhotoUrl(json.url ?? null);
        } catch {
          // Photo is optional — profile still renders without it.
        }
      }
      setLoading(false);
    })();
  }, [ready]);

  if (!ready || loading || !member) {
    return (
      <main className="min-h-screen bg-[#f7fbff]">
        <MemberNav />
        <p className="px-5 py-10 text-center text-sm font-bold text-[#6980a5]">Loading…</p>
      </main>
    );
  }

  const days = remainingDays(subscription?.end_date ?? null);

  return (
    <main className="min-h-screen bg-[#f7fbff] pb-12">
      <MemberNav />
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="flex items-center gap-4">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={member.full_name} className="size-16 rounded-2xl border border-[#dceaff] object-cover" />
          ) : (
            <div className="grid size-16 place-items-center rounded-2xl border border-[#dceaff] bg-white text-[#8aa0bf]">
              <UserCircle size={30} />
            </div>
          )}
          <div>
            <h1 className="font-display text-xl font-black text-[#10264a]">{member.full_name}</h1>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#2563eb]">{member.member_id}</p>
          </div>
        </div>

        <section className="mt-5 rounded-3xl border border-[#dceaff] bg-white p-5 shadow-[0_12px_35px_rgba(37,99,235,.05)]">
          {subscription ? (
            <>
              <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#2563eb]">
                <ShieldCheck size={14} /> Membership {subscription.status === "active" ? "active" : subscription.status}
              </p>
              <p className="mt-2 text-xl font-black text-[#10264a]">{subscription.plan_name}</p>
              {days !== null && (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#6980a5]">
                  <span className="inline-block size-2 rounded-full bg-[#2563eb]" />
                  {days >= 0 ? `${days} days remaining` : "Expired"}
                </p>
              )}
              <Link
                href="/member/membership"
                className="mt-4 block rounded-xl bg-[#2563eb] py-3 text-center text-sm font-extrabold text-white shadow-lg shadow-[#2563eb]/15"
              >
                View membership
              </Link>
              <div className="mt-4 flex items-center justify-between border-t border-[#dceaff] pt-4 text-sm">
                <div>
                  <p className="text-xs font-bold text-[#8aa0bf]">Start</p>
                  <p className="mt-0.5 font-bold text-[#10264a]">{formatIndiaDate(subscription.start_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[#8aa0bf]">End</p>
                  <p className="mt-0.5 font-bold text-[#10264a]">{formatIndiaDate(subscription.end_date)}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#8aa0bf]">Membership</p>
              <p className="mt-2 text-base font-bold text-[#10264a]">No active membership plan recorded</p>
              {member.plan && <p className="mt-1 text-sm font-medium text-[#6980a5]">Legacy plan on file: {member.plan}</p>}
              <Link
                href="/member/membership"
                className="mt-4 block rounded-xl bg-[#2563eb] py-3 text-center text-sm font-extrabold text-white shadow-lg shadow-[#2563eb]/15"
              >
                View membership
              </Link>
            </>
          )}
        </section>

        <section className="mt-4 rounded-3xl border border-[#dceaff] bg-white p-5 shadow-[0_12px_35px_rgba(37,99,235,.05)]">
          <p className="text-sm font-extrabold text-[#10264a]">Contact details</p>
          <dl className="mt-3 space-y-3">
            <Detail label="Mobile number" value={member.mobile_number} />
            <Detail label="Email" value={member.email} />
            <Detail label="Joining date" value={formatIndiaDate(member.join_date)} />
            <Detail label="Fitness goal" value={member.fitness_goal} />
            <Detail label="Assigned trainer" value={member.assigned_trainer} />
          </dl>
        </section>

        <section className="mt-4 rounded-3xl border border-[#dceaff] bg-white p-5 shadow-[0_12px_35px_rgba(37,99,235,.05)]">
          <p className="text-sm font-extrabold text-[#10264a]">Workout history</p>
          <p className="mt-2 text-sm font-medium text-[#6980a5]">{workoutCount} workout{workoutCount === 1 ? "" : "s"} logged in total</p>
          <Link href="/member/calendar" className="mt-3 inline-block text-sm font-extrabold text-[#2563eb]">
            View calendar ›
          </Link>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#dceaff] pb-2.5 last:border-0 last:pb-0">
      <dt className="text-xs font-bold text-[#8aa0bf]">{label}</dt>
      <dd className="text-right text-sm font-bold text-[#10264a]">{value || "—"}</dd>
    </div>
  );
}
