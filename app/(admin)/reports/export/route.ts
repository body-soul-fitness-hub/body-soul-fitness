import { NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { REPORT_TYPES, reportRows, type ReportType } from "@/lib/reports/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("report") as ReportType;
  if (!REPORT_TYPES.includes(type)) return new Response("Unknown report.", { status: 400 });
  const { rows, error } = await reportRows(type, { from: searchParams.get("from") ?? undefined, to: searchParams.get("to") ?? undefined });
  if (error) return new Response("Could not generate report.", { status: 500 });
  const columns = Object.keys(rows[0] ?? {}).map((key) => ({ key, header: key.replace(/_/g, " ") }));
  return new Response(toCsv(rows as Array<Record<string, unknown>>, columns), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=${type}-report.csv` } });
}
