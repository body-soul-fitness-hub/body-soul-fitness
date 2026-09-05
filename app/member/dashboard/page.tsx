"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, DoorOpen, Dumbbell } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { MemberNav } from "../components/member-nav";
import { MiniAttendance } from "../components/mini-attendance";
import { useMemberSession } from "@/lib/member-portal/use-member-session";
import { greeting, localDateStr } from "@/lib/member-portal/format";
import { summarizeWorkout, type MemberWorkout } from "@/lib/member-portal/types";
import type { Member } from "@/lib/members/types";

type HomeMember = Pick<Member, "id" | "full_name">;
type OpenVisit = { id: string; checked_in_at: string };

export default function MemberHomePage() {
  const ready = useMemberSession();
  const [member, setMember] = useState<HomeMember | null>(null);
  const [todaysWorkouts, setTodaysWorkouts] = useState<MemberWorkout[]>([]);
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
  const [openVisit, setOpenVisit] = useState<OpenVisit | null>(null);
  const [checkinsToday, setCheckinsToday] = useState(0);
  const [visitMessage, setVisitMessage] = useState("");
  const [visitError, setVisitError] = useState(false);
  const [visitPending, setVisitPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready]);

  async function load() {
    const today = localDateStr();
    const monthStart = `${today.slice(0, 7)}-01`;
    const [{ data: memberRow }, { data: todays }, { data: checkinRows }, { data: workoutRows }] = await Promise.all([
      supabase.from("members").select("id,full_name").maybeSingle(),
      supabase.from("member_workouts").select("*").eq("workout_date", today).order("created_at", { ascending: false }),
      supabase.from("member_checkins").select("id,checked_in_at,checked_out_at").gte("checked_in_at", `${monthStart}T00:00:00`),
      supabase.from("member_workouts").select("workout_date").gte("workout_date", monthStart),
    ]);
    setMember((memberRow as HomeMember) ?? null);
    setTodaysWorkouts((todays ?? []) as MemberWorkout[]);
    const days = new Set<string>();
    const checkins = (checkinRows ?? []) as { id: string; checked_in_at: string; checked_out_at: string | null }[];
    checkins.forEach((c) => days.add(c.checked_in_at.slice(0, 10)));
    (workoutRows ?? []).forEach((w: { workout_date: string }) => days.add(w.workout_date));
    setActiveDays(days);
    const open = checkins.find((c) => !c.checked_out_at) ?? null;
    setOpenVisit(open ? { id: open.id, checked_in_at: open.checked_in_at } : null);
    setCheckinsToday(checkins.filter((c) => c.checked_in_at.slice(0, 10) === today).length);
    setLoading(false);
  }

  async function toggleVisit() {
    setVisitPending(true);
    setVisitMessage("");
    setVisitError(false);
    if (!navigator.geolocation) {
      setVisitPending(false);
      setVisitError(true);
      setVisitMessage("This device cannot provide location. Use a phone with location services enabled.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { data, error } = await supabase.rpc("member_portal_toggle_visit", {
          p_latitude: position.coords.latitude,
          p_longitude: position.coords.longitude,
          p_accuracy_meters: position.coords.accuracy,
        });
        setVisitPending(false);
        if (error) {
          setVisitError(true);
          setVisitMessage(error.message);
          return;
        }
        const distance = data?.[0]?.distance_meters;
        setVisitMessage(`Successfully ${data?.[0]?.action ?? "updated"}.${typeof distance === "number" ? ` Verified ${Math.round(distance)} m from the gym.` : ""}`);
        void load();
      },
      (error) => {
        setVisitPending(false);
        setVisitError(true);
        setVisitMessage(error.code === error.PERMISSION_DENIED ? "Location permission is required to check in or check out." : error.code === error.TIMEOUT ? "Location request timed out. Move to an open area and try again." : "Location could not be determined. Turn on phone location services and try again.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  if (!ready || loading || !member) {
    return (
      <main className="min-h-screen bg-[#f7fbff]">
        <MemberNav />
        <p className="px-5 py-10 text-center text-sm font-bold text-[#6980a5]">Loading your portal…</p>
      </main>
    );
  }

  const limitReached = !openVisit && checkinsToday >= 2;

  return (
    <main className="min-h-screen bg-[#f7fbff] pb-12">
      <MemberNav />
      <div className="mx-auto max-w-md px-5 py-6">
        <h1 className="font-display text-2xl font-black tracking-[-0.03em] text-[#10264a]">{greeting(member.full_name.split(" ")[0])}</h1>
        <div className="mt-1.5 h-1 w-10 rounded-full bg-[#2563eb]" />

        <section className="mt-5 rounded-3xl border border-[#dceaff] bg-white p-5 shadow-[0_12px_35px_rgba(37,99,235,.05)]">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#10264a]">
              <DoorOpen size={16} className="text-[#2563eb]" /> Gym visit
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                openVisit ? "bg-[#e7f7c5] text-[#4f6d1e]" : limitReached ? "bg-[#f0f4fa] text-[#6980a5]" : "bg-[#eaf3ff] text-[#2563eb]"
              }`}
            >
              {openVisit ? "Inside now" : limitReached ? "Limit reached" : "Ready"}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-[#6980a5]">
            {openVisit
              ? `Checked in at ${new Date(openVisit.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : limitReached
                ? "You've checked in twice today already"
                : "Check in when you arrive at the gym"}
          </p>
          <button
            onClick={toggleVisit}
            disabled={visitPending || limitReached}
            className={`mt-4 w-full rounded-xl py-3 text-center text-sm font-extrabold text-white shadow-lg disabled:opacity-60 ${
              openVisit ? "bg-[#10264a] shadow-[#10264a]/15" : "bg-[#2563eb] shadow-[#2563eb]/15"
            }`}
          >
            {visitPending ? "Updating…" : openVisit ? "Check out now" : limitReached ? "Limit reached" : "Check in now"}
          </button>
          <p className="mt-3 text-xs font-medium text-[#6980a5]">Self check-in and check-out require your current location within 30 m of the gym.</p>
          {visitMessage && <p className={`mt-3 text-xs font-bold ${visitError ? "text-[#a94f37]" : "text-[#4f6d1e]"}`}>{visitMessage}</p>}
        </section>

        <section className="mt-4 rounded-3xl border border-[#dceaff] bg-white p-5 shadow-[0_12px_35px_rgba(37,99,235,.05)]">
          <p className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#10264a]">
            <Dumbbell size={16} className="text-[#2563eb]" /> Today&apos;s workout
          </p>
          {todaysWorkouts.length > 0 ? (
            <div className="mt-3 space-y-2">
              {todaysWorkouts.map((w) => (
                <p key={w.id} className="rounded-xl bg-[#f7fbff] px-3 py-2 text-sm font-bold text-[#10264a]">
                  {summarizeWorkout(w)}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 text-sm font-medium text-[#6980a5]">Log your cardio or strength training</p>
          )}
          <Link
            href="/member/workout"
            className="mt-4 block rounded-xl bg-[#2563eb] py-3 text-center text-sm font-extrabold text-white shadow-lg shadow-[#2563eb]/15"
          >
            {todaysWorkouts.length > 0 ? "Log another workout" : "Log workout"}
          </Link>
        </section>

        <section className="mt-4 rounded-3xl bg-[#10264a] p-5 text-white shadow-[0_16px_45px_rgba(16,38,74,.18)]">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-sm font-extrabold">
              <CalendarDays size={16} className="text-[#8eb5ff]" /> Monthly attendance
            </p>
            <Link href="/member/calendar" className="text-xs font-extrabold text-[#8eb5ff]">
              View full calendar ›
            </Link>
          </div>
          <MiniAttendance activeDays={activeDays} />
        </section>
      </div>
    </main>
  );
}
