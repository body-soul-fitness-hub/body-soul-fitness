import { buildEnquiriesQuery, parseEnquiryFilters } from "@/lib/enquiries/filters";
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, labelFor, type Enquiry } from "@/lib/enquiries/types";
import { toCsv } from "@/lib/csv";

const EXPORT_ROW_LIMIT = 5000;

const COLUMNS = [
  { key: "full_name", header: "Full name" },
  { key: "mobile_number", header: "Mobile number" },
  { key: "whatsapp_number", header: "WhatsApp number" },
  { key: "gender", header: "Gender" },
  { key: "date_of_birth", header: "Date of birth" },
  { key: "address", header: "Address" },
  { key: "source", header: "Source" },
  { key: "fitness_goal", header: "Fitness goal" },
  { key: "interested_plan", header: "Interested plan" },
  { key: "preferred_workout_time", header: "Preferred workout time" },
  { key: "enquiry_date", header: "Enquiry date" },
  { key: "follow_up_date", header: "Follow-up date" },
  { key: "assigned_staff", header: "Assigned staff" },
  { key: "status", header: "Status" },
  { key: "notes", header: "Notes" },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parseEnquiryFilters(Object.fromEntries(url.searchParams));

  const { data, error } = await buildEnquiriesQuery(filters)
    .order("created_at", { ascending: false })
    .limit(EXPORT_ROW_LIMIT);

  if (error) {
    return new Response(`Could not export enquiries: ${error.message}`, { status: 500 });
  }

  const rows = ((data ?? []) as Enquiry[]).map((enquiry) => ({
    ...enquiry,
    source: labelFor(ENQUIRY_SOURCES, enquiry.source),
    status: labelFor(ENQUIRY_STATUSES, enquiry.status),
  }));

  const csv = toCsv(rows, COLUMNS);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
