"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, LogOut, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

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

async function signOut() {
  await supabase.auth.signOut();
  window.location.assign("/member/login");
}

export function MemberNav() {
  const pathname = usePathname() ?? "";
  return (
    <header className="sticky top-0 z-30 bg-[#10264a] text-white">
      <div className="relative mx-auto max-w-md px-5 pt-4 pb-2 text-center">
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={17} />
        </button>
        <p className="font-display text-lg font-black tracking-wide">
          BODY <span className="text-[#8eb5ff]">&amp;</span> SOUL
        </p>
        <p className="mt-0.5 text-[10px] font-extrabold tracking-[0.35em] text-[#8eb5ff]">FITNESS CENTER</p>
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
                active ? "border-[#8eb5ff] text-[#8eb5ff]" : "border-transparent text-white/70"
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
