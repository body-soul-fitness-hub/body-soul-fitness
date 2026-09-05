"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, CreditCard, DoorOpen, Dumbbell, FileBarChart, LayoutDashboard, LogOut, Menu, Receipt, Search, Settings, Users, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logout } from "@/app/admin/actions";

const navigation: Array<{ icon: LucideIcon; label: string; href: string }> = [
  { icon: LayoutDashboard, label: "Overview", href: "/" }, { icon: Users, label: "Members", href: "/members" }, { icon: UserPlus, label: "Enquiries", href: "/enquiries" }, { icon: CreditCard, label: "Plans & billing", href: "/subscriptions" }, { icon: Receipt, label: "Payments", href: "/payments" }, { icon: DoorOpen, label: "Attendance", href: "/attendance" }, { icon: FileBarChart, label: "Reports", href: "/reports" }, { icon: Bell, label: "Notifications", href: "/notifications" }, { icon: Settings, label: "Settings", href: "/settings" },
];

export default function AdminShell({ children, name }: { children: React.ReactNode; name: string }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const nav = (mobile = false) => <nav aria-label={mobile ? "Mobile navigation" : "Main navigation"} className={mobile ? "mt-8 grid gap-1" : "mt-9 flex w-full flex-col items-center gap-2"}>{navigation.map(({ icon: Icon, label, href }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={label} href={href} onClick={() => setMobileNavOpen(false)} title={label} className={mobile ? `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-extrabold ${active ? "bg-[#dceaff] text-[#2563eb]" : "text-[#526d98]"}` : `grid size-11 place-items-center rounded-xl transition ${active ? "bg-[#dceaff] text-[#2563eb] shadow-sm" : "text-[#6980a5] hover:bg-[#f0f6ff] hover:text-[#2563eb]"}`}><Icon size={mobile ? 18 : 20}/><span className={mobile ? "" : "sr-only"}>{label}</span></Link>;
  })}</nav>;

  return <main className="min-h-screen bg-[#f7fbff] text-[#10264a]">
    {mobileNavOpen && <div className="fixed inset-0 z-50 bg-[#10264a]/30 lg:hidden" onClick={() => setMobileNavOpen(false)}><div className="h-full w-72 bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#2563eb] text-white"><Dumbbell size={20}/></div><p className="font-display text-xl font-black">Body & Soul</p></div>{nav(true)}</div></div>}
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[76px] flex-col items-center border-r border-[#dceaff] bg-white py-5 shadow-[4px_0_24px_rgba(37,99,235,.04)] lg:flex"><Link aria-label="Body & Soul home" className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-lg shadow-[#2563eb]/20" href="/"><Dumbbell size={21} strokeWidth={2.8}/></Link>{nav()}<form action={logout} className="mt-auto"><button title="Sign out" aria-label="Sign out" className="grid size-10 place-items-center rounded-xl text-[#6980a5] hover:bg-[#f0f6ff] hover:text-[#2563eb]"><LogOut size={19}/></button></form></aside>
    <section className="lg:ml-[76px]"><header className="flex h-[82px] items-center justify-between border-b border-[#dceaff] bg-white/90 px-5 backdrop-blur-md sm:px-8 lg:px-10"><div className="flex items-center gap-3 lg:hidden"><button aria-label="Open navigation" onClick={() => setMobileNavOpen(true)} className="grid size-10 place-items-center rounded-xl border border-[#dceaff] bg-white"><Menu size={20}/></button><div className="grid size-10 place-items-center rounded-xl bg-[#2563eb] text-white"><Dumbbell size={20}/></div></div><form action="/members" className="hidden max-w-sm flex-1 items-center gap-3 rounded-xl border border-[#dceaff] bg-[#f7fbff] px-4 py-2.5 focus-within:border-[#2563eb] focus-within:bg-white lg:flex"><Search size={18} className="shrink-0 text-[#6980a5]"/><input aria-label="Search members" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#8aa0bf]" name="q" placeholder="Search member name, ID, or mobile…" type="search" /><button className="text-xs font-extrabold text-[#2563eb]" type="submit">Search</button></form><div className="ml-auto flex items-center gap-3"><button className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-[#2563eb]/15">AI command center</button><div className="hidden h-9 w-px bg-[#dceaff] sm:block"/><div className="hidden sm:block"><p className="text-sm font-extrabold">{name}</p><p className="text-[11px] font-semibold text-[#6980a5]">Super administrator</p></div><form action={logout} className="lg:hidden"><button aria-label="Sign out" className="grid size-10 place-items-center rounded-xl text-[#6980a5]"><LogOut size={19}/></button></form></div></header>{children}</section>
  </main>;
}
