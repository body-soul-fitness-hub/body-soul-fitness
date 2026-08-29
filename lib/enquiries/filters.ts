import { supabaseAdmin } from "@/lib/supabase/server";
import type { EnquirySource, EnquiryStatus } from "@/lib/enquiries/types";

export const PAGE_SIZE = 20;

export type EnquiryFilters = {
  q?: string;
  status?: EnquiryStatus;
  source?: EnquirySource;
  staff?: string;
  from?: string;
  to?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseEnquiryFilters(searchParams: SearchParams): EnquiryFilters {
  return {
    q: first(searchParams.q),
    status: first(searchParams.status) as EnquiryStatus | undefined,
    source: first(searchParams.source) as EnquirySource | undefined,
    staff: first(searchParams.staff),
    from: first(searchParams.from),
    to: first(searchParams.to),
  };
}

export function parsePage(searchParams: SearchParams): number {
  const raw = Number(first(searchParams.page) ?? "1");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

export function buildEnquiriesQuery(filters: EnquiryFilters) {
  let query = supabaseAdmin.from("enquiries").select("*", { count: "exact" });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.staff) query = query.eq("assigned_staff", filters.staff);
  if (filters.from) query = query.gte("enquiry_date", filters.from);
  if (filters.to) query = query.lte("enquiry_date", filters.to);
  if (filters.q) {
    const escaped = filters.q.replace(/[%_,]/g, (match) => `\\${match}`);
    query = query.or(`full_name.ilike.%${escaped}%,mobile_number.ilike.%${escaped}%`);
  }

  return query;
}
