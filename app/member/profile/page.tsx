"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { MemberNav } from "../components/member-nav";
import { useMemberSession } from "@/lib/member-portal/use-member-session";
import { pickCurrentSubscription } from "@/lib/member-portal/subscription";
import { formatIndiaDate, remainingDays } from "@/lib/member-portal/format";
import type { MemberSubscription } from "@/lib/subscriptions/types";
import type { Member } from "@/lib/members/types";

type ProfileMember = Pick<Member, "id" | "member_id" | "full_name" | "mobile_number" | "email" | "join_date" | "fitness_goal" | "assigned_trainer" | "photo_path">;

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
        supabase.from("members").select("id,member_id,full_name,mobile_number,email,join_date,fitness_goal,assigned_trainer,photo_path").maybeSingle(),
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
        <div className="flex items-center gap-4">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={member.full_name} className="size-16 rounded-2xl border border-[#e5e9e5] object-cover" />
          ) : (
            <div className="grid size-16 place-items-center rounded-2xl border border-[#e5e9e5] bg-white text-[#89938f]">
              <UserCircle size={30} />
            </div>
          )}
          <div>
            <h1 className="font-display text-xl font-black text-[#0f1816]">{member.full_name}</h1>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#577c25]">{member.member_id}</p>
          </div>
        </div>

        <section className="mt-5 rounded-3xl border border-[#e5e9e5] bg-white p-5">
          <p className="text-sm font-extrabold text-[#0f1816]">Contact details</p>
          <dl className="mt-3 space-y-3">
            <Detail label="Mobile number" value={member.mobile_number} />
            <Detail label="Email" value={member.email} />
            <Detail label="Joining date" value={formatIndiaDate(member.join_date)} />
            <Detail label="Fitness goal" value={member.fitness_goal} />
            <Detail label="Assigned trainer" value={member.assigned_trainer} />
          </dl>
        </section>

        <section className="mt-4 rounded-3xl border border-[#e5e9e5] bg-white p-5">
          <p className="text-sm font-extrabold text-[#0f1816]">Membership</p>
          {subscription ? (
            <>
              <p className="mt-2 text-base font-black text-[#0f1816]">{subscription.plan_name}</p>
              <p className="mt-1 text-sm font-medium text-[#6c7773]">
                {days !== null ? (days >= 0 ? `${days} days remaining` : "Expired") : "No end date on file"}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-medium text-[#6c7773]">No active membership plan recorded</p>
          )}
          <Link href="/member/membership" className="mt-3 inline-block text-sm font-extrabold text-[#577c25]">
            View membership ›
          </Link>
        </section>

        <section className="mt-4 rounded-3xl border border-[#e5e9e5] bg-white p-5">
          <p className="text-sm font-extrabold text-[#0f1816]">Workout history</p>
          <p className="mt-2 text-sm font-medium text-[#6c7773]">{workoutCount} workout{workoutCount === 1 ? "" : "s"} logged in total</p>
          <Link href="/member/calendar" className="mt-3 inline-block text-sm font-extrabold text-[#577c25]">
            View calendar ›
          </Link>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f0f2f0] pb-2.5 last:border-0 last:pb-0">
      <dt className="text-xs font-bold text-[#89938f]">{label}</dt>
      <dd className="text-right text-sm font-bold text-[#0f1816]">{value || "—"}</dd>
    </div>
  );
}
