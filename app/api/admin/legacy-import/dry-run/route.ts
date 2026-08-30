import { getSuperAdmin } from "@/lib/auth/admin";
import { runDryRun } from "@/lib/legacy-import/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getSuperAdmin();
  if (!admin) return Response.json({ error: "Not authorized." }, { status: 401 });

  const formData = await request.formData();
  const customersFile = formData.get("customers_file");
  const salesFile = formData.get("sales_file");
  if (!(customersFile instanceof File) || customersFile.size === 0) return Response.json({ error: "Upload the customers workbook." }, { status: 400 });
  if (!(salesFile instanceof File) || salesFile.size === 0) return Response.json({ error: "Upload the sales workbook." }, { status: 400 });

  try {
    const result = await runDryRun({ customersFile, salesFile }, admin.email);
    return Response.json(result, { status: result.status === "failed" ? 422 : 200 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Dry run failed." }, { status: 500 });
  }
}
