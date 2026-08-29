import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react";
import { buildEnquiriesQuery, parseEnquiryFilters, parsePage, PAGE_SIZE, type EnquiryFilters } from "@/lib/enquiries/filters";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, labelFor, type Enquiry } from "@/lib/enquiries/types";

type SearchParams = Record<string, string | string[] | undefined>;

function statusTone(status: string): string {
  switch (status) {
    case "new":
      return "bg-[#e4efea] text-[#27463b]";
    case "contacted":
      return "bg-[#dbeafe] text-[#1e4b8f]";
    case "follow_up_due":
      return "bg-[#ffe9c7] text-[#8a5a12]";
    case "interested":
      return "bg-[#e7f7c5] text-[#4f6d1e]";
    case "not_interested":
      return "bg-[#ffe5dc] text-[#a94f37]";
    case "converted":
      return "bg-[#c9f36a] text-[#172a24]";
    default:
      return "bg-[#e4efea] text-[#27463b]";
  }
}

function toQueryString(filters: EnquiryFilters, page?: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (filters.staff) params.set("staff", filters.staff);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const filters = parseEnquiryFilters(resolvedSearchParams);
  const page = parsePage(resolvedSearchParams);
  const start = (page - 1) * PAGE_SIZE;

  const [{ data: enquiries, count, error }, { data: staffRows }] = await Promise.all([
    buildEnquiriesQuery(filters).order("created_at", { ascending: false }).range(start, start + PAGE_SIZE - 1),
    supabaseAdmin.from("enquiries").select("assigned_staff").not("assigned_staff", "is", null),
  ]);

  const staffOptions = Array.from(new Set((staffRows ?? []).map((row) => row.assigned_staff).filter(Boolean))) as string[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = (enquiries ?? []) as Enquiry[];

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Prospective members</p>
          <h1 className="font-display mt-2 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Enquiries</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e5] bg-white px-4 py-3 text-sm font-extrabold text-[#0f1816]"
            href={`/enquiries/export${toQueryString(filters)}`}
          >
            <Download size={16} /> Export CSV
          </a>
          <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111c19] px-5 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15" href="/enquiries/new">
            <Plus size={17} /> Add enquiry
          </Link>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-[#e5e9e5] bg-white p-4" method="get">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5">
          <Search size={16} className="text-[#6c7773]" />
          <input className="w-full bg-transparent text-sm font-medium outline-none" defaultValue={filters.q ?? ""} name="q" placeholder="Search name or mobile" type="text" />
        </div>

        <select className={filterClass} defaultValue={filters.status ?? ""} name="status">
          <option value="">All statuses</option>
          {ENQUIRY_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select className={filterClass} defaultValue={filters.source ?? ""} name="source">
          <option value="">All sources</option>
          {ENQUIRY_SOURCES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select className={filterClass} defaultValue={filters.staff ?? ""} name="staff">
          <option value="">All staff</option>
          {staffOptions.map((staff) => (
            <option key={staff} value={staff}>{staff}</option>
          ))}
        </select>

        <input className={filterClass} defaultValue={filters.from ?? ""} name="from" type="date" title="Enquiry date from" />
        <input className={filterClass} defaultValue={filters.to ?? ""} name="to" type="date" title="Enquiry date to" />

        <button className="rounded-xl bg-[#111c19] px-4 py-2.5 text-sm font-extrabold text-white" type="submit">Filter</button>
        {(filters.q || filters.status || filters.source || filters.staff || filters.from || filters.to) && (
          <Link className="text-xs font-extrabold text-[#6c7773] underline" href="/enquiries">Clear</Link>
        )}
      </form>

      <div className="mt-5 overflow-x-auto rounded-3xl border border-[#e5e9e5] bg-white">
        {error ? (
          <p className="p-6 text-sm font-bold text-[#a94f37]">Could not load enquiries: {error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-[#6c7773]">No enquiries match these filters yet.</p>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e9e5] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Mobile</th>
                <th className="px-5 py-3.5">Source</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Enquiry date</th>
                <th className="px-5 py-3.5">Follow-up</th>
                <th className="px-5 py-3.5">Staff</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((enquiry) => (
                <tr className="border-b border-[#f0f2f0] last:border-0 hover:bg-[#f9faf8]" key={enquiry.id}>
                  <td className="px-5 py-3.5 font-extrabold">{enquiry.full_name}</td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">{enquiry.mobile_number}</td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">{labelFor(ENQUIRY_SOURCES, enquiry.source)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone(enquiry.status)}`}>{labelFor(ENQUIRY_STATUSES, enquiry.status)}</span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">{enquiry.enquiry_date}</td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">{enquiry.follow_up_date ?? "—"}</td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">{enquiry.assigned_staff ?? "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link className="text-xs font-extrabold text-[#577c25]" href={`/enquiries/${enquiry.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs font-bold text-[#6c7773]">Page {page} of {totalPages} · {count} enquiries</p>
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

function PageLink({ page, filters, disabled, direction }: { page: number; filters: EnquiryFilters; disabled: boolean; direction: "prev" | "next" }) {
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
    <Link className="inline-flex items-center gap-1 rounded-xl border border-[#e5e9e5] bg-white px-3.5 py-2 text-xs font-extrabold text-[#0f1816]" href={`/enquiries${toQueryString(filters, page)}`}>
      {direction === "prev" && <Icon size={14} />} {label} {direction === "next" && <Icon size={14} />}
    </Link>
  );
}
