import { supabaseAdmin } from "@/lib/supabase/server";
import type { DeliveryStatus, NotificationType } from "@/lib/whatsapp/types";

export const PAGE_SIZE = 20;

export type NotificationLogFilters = {
  q?: string;
  type?: NotificationType;
  status?: DeliveryStatus;
  from?: string;
  to?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseNotificationLogFilters(searchParams: SearchParams): NotificationLogFilters {
  return {
    q: first(searchParams.q),
    type: first(searchParams.type) as NotificationType | undefined,
    status: first(searchParams.status) as DeliveryStatus | undefined,
    from: first(searchParams.from),
    to: first(searchParams.to),
  };
}

export function parsePage(searchParams: SearchParams): number {
  const raw = Number(first(searchParams.page) ?? "1");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}

export function buildNotificationLogQuery(filters: NotificationLogFilters) {
  let query = supabaseAdmin
    .from("member_notifications")
    .select("*, members!inner(id, member_id, full_name, mobile_number)", { count: "exact" });

  if (filters.type) query = query.eq("notification_type", filters.type);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("sent_at", `${filters.from}T00:00:00`);
  if (filters.to) query = query.lte("sent_at", `${filters.to}T23:59:59`);
  if (filters.q) {
    const escaped = filters.q.replace(/[%_,]/g, (match) => `\\${match}`);
    query = query.or(`full_name.ilike.%${escaped}%,mobile_number.ilike.%${escaped}%,member_id.ilike.%${escaped}%`, { foreignTable: "members" });
  }

  return query;
}
