import { getSuperAdmin } from "@/lib/auth/admin";
import { runConfirm } from "@/lib/legacy-import/service";

export const runtime = "nodejs";
// A run of ~1,250 rows with bounded concurrency still takes over a minute — this needs a Vercel
// plan whose function-duration limit covers that (Pro or higher; Hobby caps at 60s regardless of
// this value). For the actual LIVE import, running against local dev (as this session did against
// DEV) avoids the serverless time limit entirely and is the safer one-time approach anyway.
export const maxDuration = 300;

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
