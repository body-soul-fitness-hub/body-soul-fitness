import { Download } from "lucide-react";
import { REPORT_TYPES, reportRows, type ReportType } from "@/lib/reports/data";
import { ReportDashboard } from "@/components/report-dashboard";

const labels: Record<ReportType, string> = { enquiries: "New enquiries", conversion: "Enquiry conversion", registrations: "Member registrations", memberships: "Membership status", expiring: "Expiring subscriptions", revenue: "Revenue", balances: "Outstanding balances", attendance: "Check-in attendance", visitors: "Top visitors" };
type SearchParams = Record<string, string | string[] | undefined>;
const input = "rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3 py-2 text-sm font-medium outline-none focus:border-[#111c19]";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const type = (typeof params.report === "string" && REPORT_TYPES.includes(params.report as ReportType) ? params.report : "enquiries") as ReportType;
  const today = new Date().toISOString().slice(0, 10);
  const currentMonthStart = `${today.slice(0, 7)}-01`;
  const filters = {
    from: typeof params.from === "string" && params.from ? params.from : currentMonthStart,
    to: typeof params.to === "string" && params.to ? params.to : today,
  };
  const { rows, error } = await reportRows(type, filters);
  const query = new URLSearchParams({ report: type, ...(filters.from ? { from: filters.from } : {}), ...(filters.to ? { to: filters.to } : {}) });
  return <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#699238]">Business intelligence</p><h1 className="font-display mt-2 text-3xl font-black tracking-[-.055em] sm:text-4xl">Reports</h1><p className="mt-2 text-sm font-medium text-[#6c7773]">Every report starts with the current month. Choose a different date range whenever you need it.</p></div><a href={`/reports/export?${query}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e5] bg-white px-4 py-3 text-sm font-extrabold"><Download size={16}/> Export CSV</a></div><form method="get" className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-[#e5e9e5] bg-white p-4"><select className={input} defaultValue={type} name="report">{REPORT_TYPES.map((r) => <option key={r} value={r}>{labels[r]}</option>)}</select><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-extrabold uppercase tracking-wide text-[#699238]">Date range</span><input className={input} defaultValue={filters.from} name="from" aria-label="From date" type="date"/><span className="text-xs font-bold text-[#89938f]">to</span><input className={input} defaultValue={filters.to} name="to" aria-label="To date"/></div><button className="rounded-xl bg-[#111c19] px-4 py-2 text-sm font-extrabold text-white">Run report</button></form>{error ? <p className="mt-5 rounded-3xl border border-[#f0c6ba] bg-white p-6 text-sm font-bold text-[#a94f37]">Could not load this report: {error.message}</p> : <ReportDashboard type={type} rows={rows as Record<string, unknown>[]} from={filters.from} to={filters.to}/>}<p className="mt-4 text-xs font-medium text-[#89938f]">Membership status is current state; expiring subscriptions use the next 7 days.</p></div>;
}
