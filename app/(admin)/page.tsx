import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  DoorOpen,
  UserPlus,
  Users,
} from "lucide-react";

const chartHeights = [34, 48, 41, 66, 50, 74, 62, 85, 70, 93, 78, 100];

export default function DashboardPage() {
  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Friday, 29 August</p><h1 className="font-display mt-2 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Good morning, Harshdeep.</h1><p className="mt-2 text-sm font-medium text-[#6c7773]">Here&apos;s what&apos;s moving at Body & Soul today.</p></div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111c19] px-5 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15"><UserPlus size={17} /> Add member</button>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Collected this month" value="₹1,84,500" change="12.6%" positive icon={CircleDollarSign} tone="lime" />
        <StatCard title="Active memberships" value="328" change="8 new" positive icon={Users} tone="dark" />
        <StatCard title="Expiring this week" value="17" change="Take action" icon={CalendarClock} tone="orange" />
        <StatCard title="Check-ins today" value="24" change="6 inside now" positive icon={DoorOpen} tone="lime" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.9fr]">
        <div className="rounded-3xl border border-[#e5e9e5] bg-white p-5 shadow-[0_12px_45px_rgba(17,28,25,.045)] sm:p-6">
          <div className="flex items-start justify-between"><div><p className="text-sm font-extrabold">Revenue movement</p><p className="mt-1 text-xs font-medium text-[#6c7773]">Monthly collections · Last 12 months</p></div><button className="flex items-center gap-1 rounded-lg bg-[#f5f7f4] px-3 py-2 text-xs font-extrabold">2026 <ChevronRight size={14} /></button></div>
          <div className="mt-8 flex h-48 items-end gap-2 sm:gap-3">{chartHeights.map((height, index) => <div className="group flex flex-1 flex-col justify-end" key={index}><div className={`min-h-2 rounded-t-md transition group-hover:opacity-80 ${index === chartHeights.length - 1 ? "bg-[#c9f36a]" : "bg-[#dce4df]"}`} style={{ height: `${height}%` }} /><span className="mt-2 text-center text-[9px] font-bold text-[#89938f]">{["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"][index]}</span></div>)}</div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f3f8e8] px-3 py-2.5 text-xs font-bold text-[#45631e]"><ArrowUpRight size={15} /> Best month so far. You&apos;re ahead of July&apos;s collection by ₹20,700.</div>
        </div>

        <div className="rounded-3xl bg-[#172a24] p-5 text-white shadow-[0_12px_45px_rgba(17,28,25,.14)] sm:p-6"><div className="flex items-center justify-between"><p className="text-sm font-extrabold">Renewal attention</p><span className="rounded-full bg-[#ff7d5c] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#111c19]">17 due</span></div><p className="mt-2 text-xs font-medium leading-5 text-[#aebbb5]">Members needing a quick nudge before their plan ends.</p><div className="mt-6 space-y-3"><Renewal name="Rohit Sharma" plan="Yearly plan · Ends today" initial="R" tone="lime" /><Renewal name="Ishita Verma" plan="3 month plan · 2 days left" initial="I" tone="orange" /><Renewal name="Rahul Kapoor" plan="Monthly plan · 3 days left" initial="R" tone="blue" /></div><button className="mt-6 w-full rounded-xl bg-white/10 py-3 text-xs font-extrabold text-[#c9f36a] transition hover:bg-white/15">View renewal list</button></div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#e5e9e5] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-extrabold">Today&apos;s floor</p><p className="mt-1 text-xs font-medium text-[#6c7773]">Live attendance snapshot</p></div><span className="rounded-full bg-[#e7f7c5] px-3 py-1.5 text-xs font-extrabold text-[#46651e]">6 inside</span></div><div className="mt-5 grid grid-cols-3 divide-x divide-[#e5e9e5]"><MiniMetric value="24" label="Checked in" /><MiniMetric value="18" label="Checked out" /><MiniMetric value="01:18" label="Avg. visit" /></div></div>
        <div className="rounded-3xl border border-[#e5e9e5] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-extrabold">Plan mix</p><p className="mt-1 text-xs font-medium text-[#6c7773]">Active memberships by duration</p></div><button className="text-xs font-extrabold text-[#577c25]">View plans</button></div><div className="mt-5 space-y-3"><PlanRow label="Yearly plan" percent="44%" color="bg-[#c9f36a]" /><PlanRow label="6 month plan" percent="28%" color="bg-[#9ccf86]" /><PlanRow label="3 month plan" percent="19%" color="bg-[#f5bf7b]" /><PlanRow label="Monthly plan" percent="9%" color="bg-[#ff7d5c]" /></div></div>
      </section>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, tone, positive = false }: { title: string; value: string; change: string; icon: typeof Users; tone: "lime" | "dark" | "orange"; positive?: boolean }) {
  const colors = { lime: "bg-[#e7f7c5] text-[#4f6d1e]", dark: "bg-[#e4efea] text-[#27463b]", orange: "bg-[#ffe5dc] text-[#a94f37]" };
  return <div className="rounded-3xl border border-[#e5e9e5] bg-white p-5 shadow-[0_10px_35px_rgba(17,28,25,.035)]"><div className="flex items-start justify-between"><div className={`grid size-10 place-items-center rounded-xl ${colors[tone]}`}><Icon size={19} /></div><span className={`inline-flex items-center gap-0.5 text-xs font-extrabold ${positive ? "text-[#557a25]" : "text-[#a94f37]"}`}>{positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{change}</span></div><p className="mt-5 text-xs font-bold text-[#6c7773]">{title}</p><p className="font-display mt-1 text-2xl font-black tracking-[-0.05em]">{value}</p></div>;
}

function Renewal({ name, plan, initial, tone }: { name: string; plan: string; initial: string; tone: "lime" | "orange" | "blue" }) { const tones = { lime: "bg-[#c9f36a] text-[#172a24]", orange: "bg-[#ffb39f] text-[#172a24]", blue: "bg-[#a9d6e5] text-[#172a24]" }; return <div className="flex items-center gap-3"><div className={`grid size-9 place-items-center rounded-full text-xs font-black ${tones[tone]}`}>{initial}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{name}</p><p className="mt-0.5 text-[11px] font-medium text-[#aebbb5]">{plan}</p></div><ChevronRight size={16} className="text-[#aebbb5]" /></div>; }
function MiniMetric({ value, label }: { value: string; label: string }) { return <div className="px-3 first:pl-0 last:pr-0"><p className="font-display text-xl font-black tracking-[-.05em]">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#89938f]">{label}</p></div>; }
function PlanRow({ label, percent, color }: { label: string; percent: string; color: string }) { return <div><div className="mb-1.5 flex justify-between text-xs font-bold"><span>{label}</span><span className="text-[#6c7773]">{percent}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf0ed]"><div className={`h-full rounded-full ${color}`} style={{ width: percent }} /></div></div>; }
