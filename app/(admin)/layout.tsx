"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  CreditCard,
  DoorOpen,
  Dumbbell,
  LayoutDashboard,
  Menu,
  Search,
  Users,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navigation: Array<{ icon: LucideIcon; label: string; href?: string }> = [
  { icon: LayoutDashboard, label: "Overview", href: "/" },
  { icon: Users, label: "Members", href: "/members" },
  { icon: UserPlus, label: "Enquiries", href: "/enquiries" },
  { icon: CreditCard, label: "Plans & billing" },
  { icon: DoorOpen, label: "Attendance" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#0f1816]">
      <aside className="fixed inset-y-0 left-0 hidden w-[252px] flex-col bg-[#111c19] p-6 text-white lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#c9f36a] text-[#111c19]">
            <Dumbbell size={21} strokeWidth={2.6} />
          </div>
          <div>
            <p className="font-display text-sm font-extrabold tracking-tight">BODY & SOUL</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#aebbb5]">Fitness Center</p>
          </div>
        </div>

        <nav className="mt-12 space-y-1">
          {navigation.map(({ icon: Icon, label, href }) => {
            const isActive = href !== undefined && (href === "/" ? pathname === "/" : pathname.startsWith(href));
            const className = `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${isActive ? "bg-[#c9f36a] text-[#111c19] shadow-lg shadow-[#c9f36a]/10" : "text-[#bbc5c0] hover:bg-white/8 hover:text-white"}`;
            if (href) {
              return (
                <Link className={className} href={href} key={label}>
                  <Icon size={18} />
                  {label}
                </Link>
              );
            }
            return (
              <button className={className} disabled key={label}>
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#c9f36a]"><Activity size={15} /> TODAY&apos;S PULSE</div>
          <p className="mt-3 text-2xl font-black">24<span className="text-sm font-bold text-[#aebbb5]"> check-ins</span></p>
          <p className="mt-1 text-xs leading-5 text-[#aebbb5]">A steady start to your day. Keep the energy up.</p>
        </div>
      </aside>

      <section className="lg:ml-[252px]">
        <header className="flex h-[82px] items-center justify-between border-b border-[#e5e9e5] bg-[#f5f7f4]/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-3 lg:hidden">
            <button className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white"><Menu size={20} /></button>
            <div className="grid size-10 place-items-center rounded-xl bg-[#c9f36a]"><Dumbbell size={20} /></div>
          </div>
          <div className="hidden max-w-sm flex-1 items-center gap-3 rounded-xl border border-[#e5e9e5] bg-white px-4 py-2.5 lg:flex">
            <Search size={18} className="text-[#6c7773]" />
            <span className="text-sm font-medium text-[#89938f]">Search members, invoices...</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white"><Bell size={18} /><span className="absolute right-2 top-2 size-2 rounded-full bg-[#ff7d5c]" /></button>
            <div className="hidden h-9 w-px bg-[#e5e9e5] sm:block" />
            <div className="flex items-center gap-2.5"><div className="grid size-10 place-items-center rounded-full bg-[#162c25] text-sm font-black text-[#c9f36a]">H</div><div className="hidden sm:block"><p className="text-sm font-extrabold">Harshdeep</p><p className="text-[11px] font-semibold text-[#6c7773]">Administrator</p></div></div>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
