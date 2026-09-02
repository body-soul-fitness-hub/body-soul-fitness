import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { dashboardAnalytics } from "@/lib/dashboard/analytics";

export async function GET() {
  await requireSuperAdmin();
  return NextResponse.json(await dashboardAnalytics(), { headers: { "Cache-Control": "no-store" } });
}
