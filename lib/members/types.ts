import type { MemberSubscription } from "@/lib/subscriptions/types";

export const MEMBER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "frozen", label: "Frozen" },
  { value: "expired", label: "Expired" },
  { value: "suspended", label: "Suspended" },
] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number]["value"];

// A member's plan status is derived from their subscriptions, not stored directly.
export const PLAN_STATUSES = [
  { value: "active", label: "Active plan" },
  { value: "expiring_soon", label: "Expiring soon" },
  { value: "expired", label: "Expired plan" },
  { value: "no_plan", label: "No plan" },
] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number]["value"];

// Days-to-expiry window used to classify a subscription as "expiring soon" across the
// members list, filters, and profile page. Keep this the single definition (see
// docs/PRODUCT_TECHNICAL_BLUEPRINT.md §4 on documented, consistent expiry windows).
export const PLAN_EXPIRING_SOON_DAYS = 7;

export type Member = {
  id: string;
  member_id: string;
  full_name: string;
  mobile_number: string;
  whatsapp_number: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  address: string | null;
  photo_path: string | null;
  join_date: string;
  fitness_goal: string | null;
  medical_notes: string | null;
  referred_by: string | null;
  assigned_trainer: string | null;
  plan: string | null;
  preferred_workout_time: string | null;
  status: MemberStatus;
  source_enquiry_id: string | null;
  assigned_staff: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MemberStatusChange = {
  id: string;
  member_id: string;
  previous_status: string;
  new_status: string;
  reason: string;
  changed_by: string | null;
  created_at: string;
};

// MemberSubscription and MemberPayment live in lib/subscriptions/types.ts (owned by the
// Plans & Subscriptions module); re-exported here isn't needed since nothing in this module
// constructs them directly — see derivePlanStatus below, which only needs a narrow Pick<>.

export type MemberCheckin = {
  id: string;
  member_id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  method: string;
  created_by: string | null;
  created_at: string;
};

export type MemberNotification = {
  id: string;
  member_id: string;
  channel: string;
  message: string;
  status: string;
  sent_at: string;
  created_by: string | null;
  created_at: string;
};

export type MemberNote = {
  id: string;
  member_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

export function derivePlanStatus(subscriptions: Pick<MemberSubscription, "status" | "end_date">[]): PlanStatus {
  if (subscriptions.length === 0) return "no_plan";

  const today = new Date().toISOString().slice(0, 10);
  const soonCutoff = new Date();
  soonCutoff.setDate(soonCutoff.getDate() + PLAN_EXPIRING_SOON_DAYS);
  const soonCutoffStr = soonCutoff.toISOString().slice(0, 10);

  const active = subscriptions.filter((s) => s.status === "active");
  if (active.length === 0) return "expired";

  const hasExpiringSoon = active.some((s) => s.end_date && s.end_date >= today && s.end_date <= soonCutoffStr);
  if (hasExpiringSoon) return "expiring_soon";

  const hasCurrentlyActive = active.some((s) => !s.end_date || s.end_date >= today);
  return hasCurrentlyActive ? "active" : "expired";
}
