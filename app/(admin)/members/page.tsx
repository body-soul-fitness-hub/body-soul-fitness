import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react";
import { buildMembersQuery, getMemberIdsForPlanStatus, parseMemberFilters, parsePage, PAGE_SIZE, type MemberFilters } from "@/lib/members/filters";
import { supabaseAdmin } from "@/lib/supabase/server";
import { MEMBER_STATUSES, PLAN_STATUSES, type Member } from "@/lib/members/types";
import { labelFor } from "@/lib/enquiries/types";

type SearchParams = Record<string, string | string[] | undefined>;

function statusTone(status: string): string {
  switch (status) {
    case "active":
      return "bg-[#e7f7c5] text-[#4f6d1e]";
    case "frozen":
      return "bg-[#dbeafe] text-[#1e4b8f]";
    case "suspended":
      return "bg-[#ffe5dc] text-[#a94f37]";
    case "expired":
      return "bg-[#ffe9c7] text-[#8a5a12]";
    default:
      return "bg-[#e4efea] text-[#27463b]";
  }
}

function toQueryString(filters: MemberFilters, page?: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.trainer) params.set("trainer", filters.trainer);
  if (filters.planStatus) params.set("planStatus", filters.planStatus);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const filters = parseMemberFilters(resolvedSearchParams);
  const page = parsePage(resolvedSearchParams);
  const start = (page - 1) * PAGE_SIZE;

  const restrictToIds = filters.planStatus ? await getMemberIdsForPlanStatus(filters.planStatus) : undefined;

  const [{ data: members, count, error }, { data: trainerRows }] = await Promise.all([
    buildMembersQuery(filters, restrictToIds).order("created_at", { ascending: false }).range(start, start + PAGE_SIZE - 1),
    supabaseAdmin.from("members").select("assigned_trainer").not("assigned_trainer", "is", null),
  ]);

  const trainerOptions = Array.from(new Set((trainerRows ?? []).map((row) => row.assigned_trainer).filter(Boolean))) as string[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const rows = (members ?? []) as Member[];

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Membership</p>
          <h1 className="font-display mt-2 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Members</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e5] bg-white px-4 py-3 text-sm font-extrabold text-[#0f1816]"
            href={`/members/export${toQueryString(filters)}`}
          >
            <Download size={16} /> Export CSV
          </a>
          <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111c19] px-5 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15" href="/members/new">
            <Plus size={17} /> Add member
          </Link>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-[#e5e9e5] bg-white p-4" method="get">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#e5e9e5] bg-[#f9faf8] px-3.5 py-2.5">
          <Search size={16} className="text-[#6c7773]" />
          <input className="w-full bg-transparent text-sm font-medium outline-none" defaultValue={filters.q ?? ""} name="q" placeholder="Search member ID, name, or mobile" type="text" />
        </div>

        <select className={filterClass} defaultValue={filters.status ?? ""} name="status">
          <option value="">All statuses</option>
          {MEMBER_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select className={filterClass} defaultValue={filters.trainer ?? ""} name="trainer">
          <option value="">All trainers</option>
          {trainerOptions.map((trainer) => (
            <option key={trainer} value={trainer}>{trainer}</option>
          ))}
        </select>

        <select className={filterClass} defaultValue={filters.planStatus ?? ""} name="planStatus">
          <option value="">All plan statuses</option>
          {PLAN_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input className={filterClass} defaultValue={filters.from ?? ""} name="from" title="Joining date from" type="date" />
        <input className={filterClass} defaultValue={filters.to ?? ""} name="to" title="Joining date to" type="date" />

        <button className="rounded-xl bg-[#111c19] px-4 py-2.5 text-sm font-extrabold text-white" type="submit">Filter</button>
        {(filters.q || filters.status || filters.trainer || filters.planStatus || filters.from || filters.to) && (
          <Link className="text-xs font-extrabold text-[#6c7773] underline" href="/members">Clear</Link>
        )}
      </form>

      <div className="mt-5 overflow-x-auto rounded-3xl border border-[#e5e9e5] bg-white">
        {error ? (
          <p className="p-6 text-sm font-bold text-[#a94f37]">Could not load members: {error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-[#6c7773]">No members match these filters yet.</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e9e5] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
                <th className="px-5 py-3.5">Member ID</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Mobile</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Trainer</th>
                <th className="px-5 py-3.5">Joining date</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => (
                <tr className="border-b border-[#f0f2f0] last:border-0 hover:bg-[#f9faf8]" key={member.id}>
                  <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-[#577c25]">{member.member_id}</td>
                  <td className="px-5 py-3.5 font-extrabold">{member.full_name}</td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">{member.mobile_number}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone(member.status)}`}>{labelFor(MEMBER_STATUSES, member.status)}</span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">{member.assigned_trainer ?? "—"}</td>
                  <td className="px-5 py-3.5 font-medium text-[#3a4542]">{member.join_date}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link className="text-xs font-extrabold text-[#577c25]" href={`/members/${member.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs font-bold text-[#6c7773]">Page {page} of {totalPages} · {count} members</p>
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

function PageLink({ page, filters, disabled, direction }: { page: number; filters: MemberFilters; disabled: boolean; direction: "prev" | "next" }) {
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
    <Link className="inline-flex items-center gap-1 rounded-xl border border-[#e5e9e5] bg-white px-3.5 py-2 text-xs font-extrabold text-[#0f1816]" href={`/members${toQueryString(filters, page)}`}>
      {direction === "prev" && <Icon size={14} />} {label} {direction === "next" && <Icon size={14} />}
    </Link>
  );
}
