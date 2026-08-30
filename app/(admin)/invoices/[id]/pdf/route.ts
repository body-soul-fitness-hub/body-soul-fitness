import { buildInvoicePdf } from "@/lib/invoices/pdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await buildInvoicePdf(id);

  if (!result) return new Response("Invoice not found.", { status: 404 });

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": String(result.buffer.length),
    },
  });
}
