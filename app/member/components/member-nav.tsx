"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, UserRound } from "lucide-react";

const TABS = [
  {
    href: "/member/dashboard",
    label: "Home",
    icon: Home,
    match: (p: string) => p === "/member/dashboard" || p.startsWith("/member/workout") || p.startsWith("/member/membership"),
  },
  { href: "/member/calendar", label: "Calendar", icon: CalendarDays, match: (p: string) => p === "/member/calendar" },
  { href: "/member/profile", label: "Profile", icon: UserRound, match: (p: string) => p === "/member/profile" },
] as const;

export function MemberNav() {
  const pathname = usePathname() ?? "";
  return (
    <header className="sticky top-0 z-30 bg-[#111c19] text-white">
      <div className="mx-auto max-w-md px-5 pt-4 pb-2 text-center">
        <p className="font-display text-lg font-black tracking-wide">
          BODY <span className="text-[#c9f36a]">&amp;</span> SOUL
        </p>
        <p className="mt-0.5 text-[10px] font-extrabold tracking-[0.35em] text-[#c9f36a]">FITNESS CENTER</p>
      </div>
      <nav className="mx-auto flex max-w-md items-stretch justify-around border-t border-white/10">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 border-b-2 py-3 text-xs font-bold transition-colors ${
                active ? "border-[#c9f36a] text-[#c9f36a]" : "border-transparent text-white/70"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
