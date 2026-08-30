"use client";

import { useEffect, useState } from "react";

function greetingFor(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export default function DashboardGreeting({ fullName }: { fullName: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const dateLabel = now ? now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) : "";
  const timeLabel = now ? now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
  const greeting = now ? greetingFor(now.getHours()) : "Hello";

  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#2563eb]">
        {dateLabel}{timeLabel ? ` · ${timeLabel}` : ""}
      </p>
      <h1 className="font-display mt-2 text-3xl font-black tracking-[-.055em] sm:text-4xl">{greeting}, {fullName}.</h1>
      <p className="mt-2 text-sm font-medium text-[#6980a5]">Here&apos;s what&apos;s moving at Body & Soul today.</p>
    </div>
  );
}
