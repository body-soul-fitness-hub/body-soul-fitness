import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Send } from "lucide-react";
import { buildNotificationLogQuery, parseNotificationLogFilters, parsePage, PAGE_SIZE, type NotificationLogFilters } from "@/lib/whatsapp/filters";
import { DELIVERY_STATUSES, NOTIFICATION_TYPES, TRIGGER_SOURCES, type MemberNotificationLog } from "@/lib/whatsapp/types";
import MemberSearchInput from "../components/member-search-input";

type SearchParams = Record<string, string | string[] | undefined>;

type LogRow = MemberNotificationLog & {
  members: { id: string; member_id: string; full_name: string; mobile_number: string } | null;
};

function statusTone(status: string): string {
  switch (status) {
    case "delivered":
      return "bg-[#e7f7c5] text-[#4f6d1e]";
    case "sent":
      return "bg-[#dbeafe] text-[#1e4b8f]";
    case "queued":
      return "bg-[#ffe9c7] text-[#8a5a12]";
    default:
      return "bg-[#ffe5dc] text-[#a94f37]";
  }
}

function typeLabel(type: string | null): string {
  return NOTIFICATION_TYPES.find((t) => t.value === type)?.label ?? type ?? "—";
}

function toQueryString(filters: NotificationLogFilters, page?: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const filters = parseNotificationLogFilters(resolvedSearchParams);
  const page = parsePage(resolvedSearchParams);
  const start = (page - 1) * PAGE_SIZE;

  const { data: notifications, count, error } = await buildNotificationLogQuery(filters).order("sent_at", { ascending: false }).range(start, start + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = (notifications ?? []) as unknown as LogRow[];
  const sentParam = resolvedSearchParams.sent;
  const failedParam = resolvedSearchParams.failed;

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      {(sentParam || failedParam) && (
        <div className="mb-5 rounded-xl bg-[#e7f7c5] px-4 py-3 text-sm font-bold text-[#4f6d1e]">
          Sent to {sentParam ?? 0} recipient{sentParam === "1" ? "" : "s"}{failedParam && Number(failedParam) > 0 ? ` · ${failedParam} failed (see log below)` : ""}.
        </div>
      )}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">WhatsApp</p>
          <h1 className="font-display mt-2 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Notifications</h1>
          <p className="mt-2 max-w-xl text-sm font-medium text-[#6c7773]">Every WhatsApp message sent — automated or staff-sent — with delivery status.</p>
        </div>
        <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111c19] px-5 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15" href="/notifications/send">
          <Send size={16} /> Send custom message
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-[#e5e9e5] bg-white p-4" method="get">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5">
          <Search size={16} className="text-[#6c7773]" />
          <MemberSearchInput className="w-full bg-transparent text-sm font-medium outline-none" defaultValue={filters.q ?? ""} placeholder="Search member ID, name, or mobile" />
        </div>

        <select className={filterClass} defaultValue={filters.type ?? ""} name="type">
          <option value="">All types</option>
          {NOTIFICATION_TYPES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select className={filterClass} defaultValue={filters.status ?? ""} name="status">
          <option value="">All statuses</option>
          {DELIVERY_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input className={filterClass} defaultValue={filters.from ?? ""} name="from" title="From" type="date" />
        <input className={filterClass} defaultValue={filters.to ?? ""} name="to" title="To" type="date" />

        <button className="rounded-xl bg-[#111c19] px-4 py-2.5 text-sm font-extrabold text-white" type="submit">Filter</button>
        {(filters.q || filters.type || filters.status || filters.from || filters.to) && (
          <Link className="text-xs font-extrabold text-[#6c7773] underline" href="/notifications">Clear</Link>
        )}
      </form>

      <div className="mt-5 overflow-x-auto rounded-3xl border border-[#e5e9e5] bg-white">
        {error ? (
          <p className="p-6 text-sm font-bold text-[#a94f37]">Could not load notifications: {error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-[#6c7773]">No notifications match these filters yet.</p>
        ) : (
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e9e5] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
                <th className="px-5 py-3.5">Sent</th>
                <th className="px-5 py-3.5">Recipient</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Message</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Triggered by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b border-[#f0f2f0] align-top last:border-0 hover:bg-[#f9faf8]" key={row.id}>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-[#3a4542]">{new Date(row.sent_at).toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    {row.members ? (
                      <Link className="hover:underline" href={`/members/${row.members.id}`}>
                        <p className="font-extrabold">{row.members.full_name}</p>
                        <p className="text-xs font-medium text-[#89938f]">{row.members.member_id} · {row.recipient_number ?? row.members.mobile_number}</p>
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3.5 font-bold">{typeLabel(row.notification_type)}</td>
                  <td className="max-w-xs px-5 py-3.5 text-xs font-medium text-[#3a4542]">
                    <p className="line-clamp-2">{row.message}</p>
                    {row.status === "failed" && row.error_message && <p className="mt-1 font-bold text-[#a94f37]">{row.error_message}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone(row.status)}`}>{DELIVERY_STATUSES.find((s) => s.value === row.status)?.label ?? row.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-medium text-[#3a4542]">
                    {row.created_by ?? "—"}
                    {row.trigger_source && (
                      <span className="ml-1.5 text-[#89938f]">({TRIGGER_SOURCES.find((s) => s.value === row.trigger_source)?.label})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs font-bold text-[#6c7773]">Page {page} of {totalPages} · {count} notifications</p>
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

function PageLink({ page, filters, disabled, direction }: { page: number; filters: NotificationLogFilters; disabled: boolean; direction: "prev" | "next" }) {
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
    <Link className="inline-flex items-center gap-1 rounded-xl border border-[#e5e9e5] bg-white px-3.5 py-2 text-xs font-extrabold text-[#0f1816]" href={`/notifications${toQueryString(filters, page)}`}>
      {direction === "prev" && <Icon size={14} />} {label} {direction === "next" && <Icon size={14} />}
    </Link>
  );
}
