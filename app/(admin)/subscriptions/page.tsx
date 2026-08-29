import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, ListFilter, Plus, Search } from "lucide-react";
import { buildSubscriptionsQuery, getExpiryAlerts, getMemberIdsForQuery, parsePage, parseSubscriptionFilters, PAGE_SIZE, type SubscriptionFilters } from "@/lib/subscriptions/filters";
import { labelFor } from "@/lib/enquiries/types";
import { deriveSubscriptionStatus, SUBSCRIPTION_DISPLAY_STATUSES, type MemberSubscription } from "@/lib/subscriptions/types";

type SearchParams = Record<string, string | string[] | undefined>;
type MemberInfo = { id: string; member_id: string; full_name: string; mobile_number: string };

function statusTone(status: string): string {
  switch (status) {
    case "active":
      return "bg-[#e7f7c5] text-[#4f6d1e]";
    case "expiring_soon":
      return "bg-[#ffe9c7] text-[#8a5a12]";
    case "expired":
      return "bg-[#ffe5dc] text-[#a94f37]";
    case "frozen":
      return "bg-[#dbeafe] text-[#1e4b8f]";
    default:
      return "bg-[#e4efea] text-[#27463b]";
  }
}

function toQueryString(filters: SubscriptionFilters, page?: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const filters = parseSubscriptionFilters(resolvedSearchParams);
  const page = parsePage(resolvedSearchParams);
  const start = (page - 1) * PAGE_SIZE;

  const restrictToIds = filters.q ? await getMemberIdsForQuery(filters.q) : undefined;

  const [{ data: subscriptions, count, error }, alerts] = await Promise.all([
    buildSubscriptionsQuery(filters, restrictToIds).order("start_date", { ascending: false }).range(start, start + PAGE_SIZE - 1),
    getExpiryAlerts(),
  ]);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = (subscriptions ?? []) as Array<MemberSubscription & { members: MemberInfo | null }>;

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Plans & billing</p>
          <h1 className="font-display mt-2 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Subscriptions</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e5] bg-white px-4 py-3 text-sm font-extrabold text-[#0f1816]" href="/plans">
            <ListFilter size={16} /> Manage plans
          </Link>
          <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111c19] px-5 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15" href="/subscriptions/new">
            <Plus size={17} /> New subscription
          </Link>
        </div>
      </div>

      {(alerts[7].length > 0 || alerts[3].length > 0 || alerts[1].length > 0) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <ExpiryAlertCard days={7} rows={alerts[7]} />
          <ExpiryAlertCard days={3} rows={alerts[3]} />
          <ExpiryAlertCard days={1} rows={alerts[1]} />
        </div>
      )}

      <form className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-[#e5e9e5] bg-white p-4" method="get">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5">
          <Search size={16} className="text-[#6c7773]" />
          <input className="w-full bg-transparent text-sm font-medium outline-none" defaultValue={filters.q ?? ""} name="q" placeholder="Search member ID, name, or mobile" type="text" />
        </div>

        <select className={filterClass} defaultValue={filters.status ?? ""} name="status">
          <option value="">All statuses</option>
          {SUBSCRIPTION_DISPLAY_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input className={filterClass} defaultValue={filters.from ?? ""} name="from" title="Start date from" type="date" />
        <input className={filterClass} defaultValue={filters.to ?? ""} name="to" title="Start date to" type="date" />

        <button className="rounded-xl bg-[#111c19] px-4 py-2.5 text-sm font-extrabold text-white" type="submit">Filter</button>
        {(filters.q || filters.status || filters.from || filters.to) && (
          <Link className="text-xs font-extrabold text-[#6c7773] underline" href="/subscriptions">Clear</Link>
        )}
      </form>

      <div className="mt-5 overflow-x-auto rounded-3xl border border-[#e5e9e5] bg-white">
        {error ? (
          <p className="p-6 text-sm font-bold text-[#a94f37]">Could not load subscriptions: {error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-[#6c7773]">No subscriptions match these filters yet.</p>
        ) : (
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e9e5] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5">Plan</th>
                <th className="px-5 py-3.5">Start</th>
                <th className="px-5 py-3.5">End</th>
                <th className="px-5 py-3.5">Final amount</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((sub) => {
                const displayStatus = deriveSubscriptionStatus(sub);
                return (
                  <tr className="border-b border-[#f0f2f0] last:border-0 hover:bg-[#f9faf8]" key={sub.id}>
                    <td className="px-5 py-3.5">
                      <p className="font-extrabold">{sub.members?.full_name ?? "—"}</p>
                      <p className="text-xs font-medium text-[#89938f]">{sub.members?.member_id}</p>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#3a4542]">{sub.plan_name}</td>
                    <td className="px-5 py-3.5 font-medium text-[#3a4542]">{sub.start_date}</td>
                    <td className="px-5 py-3.5 font-medium text-[#3a4542]">{sub.end_date ?? "—"}</td>
                    <td className="px-5 py-3.5 font-extrabold text-[#27463b]">₹{sub.final_amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 font-medium capitalize text-[#3a4542]">{sub.payment_status}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone(displayStatus)}`}>{labelFor(SUBSCRIPTION_DISPLAY_STATUSES, displayStatus)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link className="text-xs font-extrabold text-[#577c25]" href={`/subscriptions/${sub.id}`}>View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs font-bold text-[#6c7773]">Page {page} of {totalPages} · {count} subscriptions</p>
          <div className="flex items-center gap-2">
            <PageLink direction="prev" disabled={page <= 1} filters={filters} page={page - 1} />
            <PageLink direction="next" disabled={page >= totalPages} filters={filters} page={page + 1} />
          </div>
        </div>
      )}
    </div>
  );
}

const filterClass = "rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5 text-sm font-medium outline-none";

function ExpiryAlertCard({ days, rows }: { days: 7 | 3 | 1; rows: Array<{ id: string; end_date: string; members: MemberInfo | null }> }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e5e9e5] bg-white p-4">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">Expiring in {days} day{days === 1 ? "" : "s"}</p>
        <p className="mt-2 text-sm font-medium text-[#6c7773]">None</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-[#ffe9c7] bg-[#fff8ec] p-4">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#8a5a12]">
        <AlertTriangle size={14} /> Expiring in {days} day{days === 1 ? "" : "s"} · {rows.length}
      </div>
      <ul className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <li key={row.id}>
            <Link className="text-sm font-bold text-[#0f1816] underline" href={`/subscriptions/${row.id}`}>
              {row.members?.full_name ?? "Member"}
            </Link>
            <span className="ml-1.5 text-xs font-medium text-[#8a5a12]">{row.members?.mobile_number}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageLink({ page, filters, disabled, direction }: { page: number; filters: SubscriptionFilters; disabled: boolean; direction: "prev" | "next" }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Previous" : "Next";
  if (disabled) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-[#e5e9e5] px-3.5 py-2 text-xs font-extrabold text-[#c3cac6]">
        {direction === "prev" && <Icon size={14} />} {label} {direction === "next" && <Icon size={14} />}
      </span>
    );
  }
  return (
    <Link className="inline-flex items-center gap-1 rounded-xl border border-[#e5e9e5] bg-white px-3.5 py-2 text-xs font-extrabold text-[#0f1816]" href={`/subscriptions${toQueryString(filters, page)}`}>
      {direction === "prev" && <Icon size={14} />} {label} {direction === "next" && <Icon size={14} />}
    </Link>
  );
}
