import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { buildPaymentsQuery, parsePage, parsePaymentFilters, PAGE_SIZE, type PaymentFilters } from "@/lib/payments/filters";
import { labelFor } from "@/lib/enquiries/types";
import { PAYMENT_MODES, PAYMENT_STATUSES, type MemberPayment } from "@/lib/subscriptions/types";
import MemberSearchInput from "../components/member-search-input";

type SearchParams = Record<string, string | string[] | undefined>;

type PaymentRow = MemberPayment & {
  invoices: { id: string; invoice_number: string; status: string } | null;
  members: { id: string; member_id: string; full_name: string; mobile_number: string } | null;
};

function statusTone(status: string): string {
  switch (status) {
    case "paid":
      return "bg-[#e7f7c5] text-[#4f6d1e]";
    case "partial":
      return "bg-[#ffe9c7] text-[#8a5a12]";
    default:
      return "bg-[#ffe5dc] text-[#a94f37]";
  }
}

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toQueryString(filters: PaymentFilters, page?: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.method) params.set("method", filters.method);
  if (filters.billStatus) params.set("billStatus", filters.billStatus);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const filters = parsePaymentFilters(resolvedSearchParams);
  const page = parsePage(resolvedSearchParams);
  const start = (page - 1) * PAGE_SIZE;

  const { data: payments, count, error } = await buildPaymentsQuery(filters).order("payment_date", { ascending: false }).range(start, start + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = (payments ?? []) as unknown as PaymentRow[];

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Payments & bills</p>
          <h1 className="font-display mt-2 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Payments</h1>
        </div>
        <a
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e5] bg-white px-4 py-3 text-sm font-extrabold text-[#0f1816]"
          href={`/payments/export${toQueryString(filters)}`}
        >
          <Download size={16} /> Export CSV
        </a>
      </div>

      <form className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-[#e5e9e5] bg-white p-4" method="get">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5">
          <Search size={16} className="text-[#6c7773]" />
          <MemberSearchInput className="w-full bg-transparent text-sm font-medium outline-none" defaultValue={filters.q ?? ""} placeholder="Search member ID, name, or mobile" />
        </div>

        <select className={filterClass} defaultValue={filters.method ?? ""} name="method">
          <option value="">All methods</option>
          {PAYMENT_MODES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select className={filterClass} defaultValue={filters.billStatus ?? ""} name="billStatus">
          <option value="">All bill statuses</option>
          {PAYMENT_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input className={filterClass} defaultValue={filters.from ?? ""} name="from" title="Payment date from" type="date" />
        <input className={filterClass} defaultValue={filters.to ?? ""} name="to" title="Payment date to" type="date" />

        <button className="rounded-xl bg-[#111c19] px-4 py-2.5 text-sm font-extrabold text-white" type="submit">Filter</button>
        {(filters.q || filters.method || filters.billStatus || filters.from || filters.to) && (
          <Link className="text-xs font-extrabold text-[#6c7773] underline" href="/payments">Clear</Link>
        )}
      </form>

      <div className="mt-5 overflow-x-auto rounded-3xl border border-[#e5e9e5] bg-white">
        {error ? (
          <p className="p-6 text-sm font-bold text-[#a94f37]">Could not load payments: {error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-[#6c7773]">No payments match these filters yet.</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e9e5] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5">Invoice</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5">Bill status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((payment) => (
                <tr className="border-b border-[#f0f2f0] last:border-0 hover:bg-[#f9faf8]" key={payment.id}>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">{payment.payment_date}</td>
                  <td className="px-5 py-3.5">
                    {payment.members ? (
                      <div>
                        <p className="font-extrabold">{payment.members.full_name}</p>
                        <p className="text-xs font-medium text-[#89938f]">{payment.members.member_id} · {payment.members.mobile_number}</p>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-[#577c25]">{payment.invoices?.invoice_number ?? "—"}</td>
                  <td className="px-5 py-3.5 font-bold">{formatAmount(payment.amount)}</td>
                  <td className="px-5 py-3.5 text-[#3a4542]">{labelFor(PAYMENT_MODES, payment.method)}</td>
                  <td className="px-5 py-3.5">
                    {payment.invoices && (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone(payment.invoices.status)}`}>{labelFor(PAYMENT_STATUSES, payment.invoices.status)}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {payment.invoices && <Link className="text-xs font-extrabold text-[#577c25]" href={`/invoices/${payment.invoices.id}`}>View</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs font-bold text-[#6c7773]">Page {page} of {totalPages} · {count} payments</p>
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

function PageLink({ page, filters, disabled, direction }: { page: number; filters: PaymentFilters; disabled: boolean; direction: "prev" | "next" }) {
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
    <Link className="inline-flex items-center gap-1 rounded-xl border border-[#e5e9e5] bg-white px-3.5 py-2 text-xs font-extrabold text-[#0f1816]" href={`/payments${toQueryString(filters, page)}`}>
      {direction === "prev" && <Icon size={14} />} {label} {direction === "next" && <Icon size={14} />}
    </Link>
  );
}
