import { supabaseAdmin } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { getSuperAdmin } from "@/lib/auth/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const admin = await getSuperAdmin();
  if (!admin) return new Response("Not authorized.", { status: 401 });

  const { batchId } = await params;
  const { data: batch } = await supabaseAdmin.from("legacy_import_batches").select("summary").eq("id", batchId).maybeSingle();
  if (!batch) return new Response("Batch not found.", { status: 404 });

  const summary = (batch.summary ?? {}) as { errors?: unknown[]; warnings?: unknown[] };
  const rows = [
    ...(summary.errors ?? []).map((issue) => ({ level: "error", ...(issue as Record<string, unknown>) })),
    ...(summary.warnings ?? []).map((issue) => ({ level: "warning", ...(issue as Record<string, unknown>) })),
  ];

  const csv = toCsv(rows, [
    { key: "level", header: "Level" },
    { key: "code", header: "Code" },
    { key: "rowIndex", header: "Row" },
    { key: "legacyCode", header: "Legacy Code" },
    { key: "message", header: "Message" },
  ]);

  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="legacy-import-${batchId}-report.csv"` } });
}
