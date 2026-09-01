"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { MemberNav } from "../components/member-nav";
import { useMemberSession } from "@/lib/member-portal/use-member-session";
import { summarizeWorkout, type MemberWorkout } from "@/lib/member-portal/types";
import type { MemberCheckin } from "@/lib/members/types";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function MemberCalendarPage() {
  const ready = useMemberSession();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [workouts, setWorkouts] = useState<MemberWorkout[]>([]);
  const [checkins, setCheckins] = useState<MemberCheckin[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, year, month]);

  async function load() {
    setLoading(true);
    const monthStart = ymd(year, month, 1);
    const nextMonth = month === 11 ? ymd(year + 1, 0, 1) : ymd(year, month + 1, 1);
    const [{ data: workoutRows }, { data: checkinRows }] = await Promise.all([
      supabase.from("member_workouts").select("*").gte("workout_date", monthStart).lt("workout_date", nextMonth).order("workout_date", { ascending: true }),
      supabase
        .from("member_checkins")
        .select("id,member_id,checked_in_at,checked_out_at,method,created_by,created_at")
        .gte("checked_in_at", `${monthStart}T00:00:00`)
        .lt("checked_in_at", `${nextMonth}T00:00:00`),
    ]);
    setWorkouts((workoutRows ?? []) as MemberWorkout[]);
    setCheckins((checkinRows ?? []) as MemberCheckin[]);
    setSelected(null);
    setLoading(false);
  }

  const { weeks, workoutDays, checkinDays } = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeksArr: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeksArr.push(cells.slice(i, i + 7));

    const wDays = new Set(workouts.map((w) => w.workout_date));
    const cDays = new Set(checkins.map((c) => c.checked_in_at.slice(0, 10)));
    return { weeks: weeksArr, workoutDays: wDays, checkinDays: cDays };
  }, [year, month, workouts, checkins]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  const selectedWorkouts = selected ? workouts.filter((w) => w.workout_date === selected) : [];
  const selectedCheckins = selected ? checkins.filter((c) => c.checked_in_at.slice(0, 10) === selected) : [];

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#f5f7f4]">
        <MemberNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] pb-12">
      <MemberNav />
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} aria-label="Previous month" className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white">
            <ChevronLeft size={18} />
          </button>
          <h1 className="font-display text-lg font-black text-[#0f1816]">
            {new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </h1>
          <button onClick={() => changeMonth(1)} aria-label="Next month" className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-3xl border border-[#e5e9e5] bg-white p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-[#89938f]">
            {DOW.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-2 space-y-1">
            {loading ? (
              <p className="py-8 text-center text-sm font-bold text-[#6c7773]">Loading…</p>
            ) : (
              weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((day, di) => {
                    if (day === null) return <div key={di} />;
                    const dateStr = ymd(year, month, day);
                    const hasWorkout = workoutDays.has(dateStr);
                    const hasCheckin = checkinDays.has(dateStr);
                    const isSelected = selected === dateStr;
                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelected(hasWorkout || hasCheckin ? dateStr : null)}
                        className={`grid aspect-square place-items-center rounded-xl text-sm font-extrabold transition-colors ${
                          hasWorkout ? "bg-[#c9f36a] text-[#0f1816]" : hasCheckin ? "border-2 border-[#c9f36a] text-[#0f1816]" : "text-[#89938f]"
                        } ${isSelected ? "ring-2 ring-[#111c19]" : ""}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex items-center gap-4 border-t border-[#f0f2f0] pt-3 text-[11px] font-bold text-[#6c7773]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-[#c9f36a]" /> Workout logged
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm border-2 border-[#c9f36a]" /> Gym check-in
            </span>
          </div>
        </div>

        {selected && (
          <section className="mt-4 rounded-3xl border border-[#e5e9e5] bg-white p-5">
            <p className="text-sm font-extrabold text-[#0f1816]">
              {new Date(`${selected}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <div className="mt-3 space-y-3">
              {selectedWorkouts.map((w) => (
                <div key={w.id} className="rounded-xl bg-[#f5f7f4] p-3">
                  <p className="text-sm font-extrabold text-[#0f1816]">{summarizeWorkout(w)}</p>
                  {w.notes && <p className="mt-1 text-xs font-medium text-[#6c7773]">{w.notes}</p>}
                </div>
              ))}
              {selectedCheckins.map((c) => (
                <div key={c.id} className="rounded-xl bg-[#f5f7f4] p-3">
                  <p className="text-sm font-extrabold text-[#0f1816]">Gym check-in</p>
                  <p className="mt-1 text-xs font-medium text-[#6c7773]">
                    {new Date(c.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {c.checked_out_at ? ` – ${new Date(c.checked_out_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " · Still inside"}
                  </p>
                </div>
              ))}
              {selectedWorkouts.length === 0 && selectedCheckins.length === 0 && <p className="text-sm font-medium text-[#6c7773]">No activity on this date.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
