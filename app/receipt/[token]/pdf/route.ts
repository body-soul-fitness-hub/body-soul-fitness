import { supabaseAdmin } from "@/lib/supabase/server";
import { buildInvoicePdf } from "@/lib/invoices/pdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: invoice } = await supabaseAdmin.from("invoices").select("id").eq("share_token", token).maybeSingle();
  if (!invoice) return new Response("Receipt not found.", { status: 404 });

  const result = await buildInvoicePdf(invoice.id);
  if (!result) return new Response("Receipt not found.", { status: 404 });

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": String(result.buffer.length),
    },
  });
}
