import { supabaseAdmin } from "@/lib/supabase/server";
import type { PaymentMode, PaymentStatus } from "@/lib/subscriptions/types";

export const PAGE_SIZE = 20;

export type PaymentFilters = {
  q?: string;
  method?: PaymentMode;
  billStatus?: PaymentStatus;
  from?: string;
  to?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function parsePaymentFilters(searchParams: SearchParams): PaymentFilters {
  return {
    q: first(searchParams.q),
    method: first(searchParams.method) as PaymentMode | undefined,
    billStatus: first(searchParams.billStatus) as PaymentStatus | undefined,
    from: first(searchParams.from),
    to: first(searchParams.to),
  };
}

export function parsePage(searchParams: SearchParams): number {
  const raw = Number(first(searchParams.page) ?? "1");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

// `invoices!inner`/`members!inner` turn the embeds into inner joins, which is what lets
// .eq("invoices.status", ...) and the members .or() actually constrain the parent rows instead
// of just shaping the embedded object. Every payment recorded by this module always carries an
// invoice_id, so this join never drops a row created going forward.
export function buildPaymentsQuery(filters: PaymentFilters) {
  let query = supabaseAdmin
    .from("member_payments")
    .select("*, invoices!inner(id, invoice_number, status), members!inner(id, member_id, full_name, mobile_number)", { count: "exact" });

  if (filters.method) query = query.eq("method", filters.method);
  if (filters.from) query = query.gte("payment_date", filters.from);
  if (filters.to) query = query.lte("payment_date", filters.to);
  if (filters.billStatus) query = query.eq("invoices.status", filters.billStatus);
  if (filters.q) {
    const escaped = filters.q.replace(/[%_,]/g, (match) => `\\${match}`);
    query = query.or(`full_name.ilike.%${escaped}%,mobile_number.ilike.%${escaped}%,member_id.ilike.%${escaped}%`, { foreignTable: "members" });
  }

  return query;
}
