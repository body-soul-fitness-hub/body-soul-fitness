import { buildMembersQuery, getMemberIdsForPlanStatus, parseMemberFilters } from "@/lib/members/filters";
import { MEMBER_STATUSES, type Member } from "@/lib/members/types";
import { labelFor } from "@/lib/enquiries/types";
import { toCsv } from "@/lib/csv";

const EXPORT_ROW_LIMIT = 5000;

const COLUMNS = [
  { key: "member_id", header: "Member ID" },
  { key: "full_name", header: "Full name" },
  { key: "mobile_number", header: "Mobile number" },
  { key: "whatsapp_number", header: "WhatsApp number" },
  { key: "email", header: "Email" },
  { key: "gender", header: "Gender" },
  { key: "date_of_birth", header: "Date of birth" },
  { key: "emergency_contact_name", header: "Emergency contact name" },
  { key: "emergency_contact_number", header: "Emergency contact number" },
  { key: "address", header: "Address" },
  { key: "join_date", header: "Joining date" },
  { key: "fitness_goal", header: "Fitness goal" },
  { key: "plan", header: "Plan" },
  { key: "referred_by", header: "Referred by" },
  { key: "assigned_trainer", header: "Assigned trainer" },
  { key: "assigned_staff", header: "Assigned staff" },
  { key: "status", header: "Status" },
  { key: "medical_notes", header: "Medical notes" },
  { key: "notes", header: "Notes" },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parseMemberFilters(Object.fromEntries(url.searchParams));
  const restrictToIds = filters.planStatus ? await getMemberIdsForPlanStatus(filters.planStatus) : undefined;

  const { data, error } = await buildMembersQuery(filters, restrictToIds)
    .order("created_at", { ascending: false })
    .limit(EXPORT_ROW_LIMIT);

  if (error) {
    return new Response(`Could not export members: ${error.message}`, { status: 500 });
  }

  const rows = ((data ?? []) as Member[]).map((member) => ({
    ...member,
    status: labelFor(MEMBER_STATUSES, member.status),
  }));

  const csv = toCsv(rows, COLUMNS);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
