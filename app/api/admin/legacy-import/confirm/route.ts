import { getSuperAdmin } from "@/lib/auth/admin";
import { runConfirm } from "@/lib/legacy-import/service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const admin = await getSuperAdmin();
  if (!admin) return Response.json({ error: "Not authorized." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const batchId = body?.batchId;
  if (!batchId || typeof batchId !== "string") return Response.json({ error: "Missing batchId." }, { status: 400 });

  try {
    const summary = await runConfirm(batchId, admin.email);
    return Response.json({ batchId, summary });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 409 });
  }
}
