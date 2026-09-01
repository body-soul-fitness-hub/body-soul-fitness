"use client";
import { localDateStr } from "@/lib/member-portal/format";

const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function MiniAttendance({ activeDays }: { activeDays: Set<string> }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeekStart = startOfWeek(today);
  const weeks = [2, 1, 0].map((offset) => {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  });

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-extrabold text-white/50">
        {DOW.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-2 space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const key = localDateStr(d);
              const isFuture = d > today;
              const active = activeDays.has(key);
              return (
                <div
                  key={key}
                  className={`grid aspect-square place-items-center rounded-lg text-xs font-extrabold ${
                    isFuture ? "text-white/20" : active ? "bg-[#2f6df1] text-white" : "border border-white/15 text-white/60"
                  }`}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] font-bold text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#2f6df1]" /> Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-white/40" /> Not completed
        </span>
      </div>
    </div>
  );
}
