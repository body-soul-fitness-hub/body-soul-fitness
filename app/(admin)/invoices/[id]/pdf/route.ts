import PDFDocument from "pdfkit";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_GYM_SETTINGS, GYM_SETTINGS_ID, type GymSettings } from "@/lib/settings/types";
import { durationLabel } from "@/lib/plans/types";
import type { Invoice } from "@/lib/invoices/types";
import type { MemberPayment } from "@/lib/subscriptions/types";

export const runtime = "nodejs";

type MemberInfo = { id: string; member_id: string; full_name: string; mobile_number: string };

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: invoiceRow, error }, { data: settingsRow }, { data: payments }] = await Promise.all([
    supabaseAdmin.from("invoices").select("*, members(id, member_id, full_name, mobile_number)").eq("id", id).maybeSingle(),
    supabaseAdmin.from("gym_settings").select("*").eq("id", GYM_SETTINGS_ID).maybeSingle(),
    supabaseAdmin.from("member_payments").select("*").eq("invoice_id", id).order("payment_date", { ascending: true }),
  ]);

  if (error || !invoiceRow) {
    return new Response("Invoice not found.", { status: 404 });
  }

  const record = invoiceRow as Invoice & { members: MemberInfo | null };
  const member = record.members;
  const settings: GymSettings = { id: GYM_SETTINGS_ID, updated_at: new Date().toISOString(), ...DEFAULT_GYM_SETTINGS, ...(settingsRow ?? {}) };
  const paymentRows = (payments ?? []) as MemberPayment[];
  const authorizedStaff = record.created_by ?? paymentRows[paymentRows.length - 1]?.received_by ?? "—";

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const topY = doc.y;
  const contactLines = [settings.address, [settings.phone, settings.email].filter(Boolean).join("  ·  ") || null, settings.website, settings.gstin ? `GSTIN: ${settings.gstin}` : null].filter(
    (line): line is string => Boolean(line)
  );

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#000000").text(settings.gym_name, 50, topY, { width: 240 });
  doc.font("Helvetica").fontSize(9).fillColor("#555555").text(contactLines.join("\n"), 50, doc.y, { width: 240 });
  const leftBottom = doc.y;
  doc.fillColor("#000000");

  doc.font("Helvetica-Bold").fontSize(14).text("RECEIPT / INVOICE", 320, topY, { width: 225, align: "right" });
  doc.font("Helvetica").fontSize(10);
  doc.text(`Invoice #: ${record.invoice_number}`, 320, doc.y, { width: 225, align: "right" });
  doc.text(`Date: ${record.issue_date}`, 320, doc.y, { width: 225, align: "right" });
  doc.text(`Status: ${record.status.toUpperCase()}`, 320, doc.y, { width: 225, align: "right" });
  const rightBottom = doc.y;

  doc.x = 50;
  doc.y = Math.max(leftBottom, rightBottom) + 12;
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#dddddd").stroke();
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000").text("Billed to", 50, doc.y);
  doc.font("Helvetica").fontSize(10);
  doc.text(member?.full_name ?? "—");
  doc.text(`Member ID: ${member?.member_id ?? "—"}`);
  doc.text(`Mobile: ${member?.mobile_number ?? "—"}`);

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(11).text("Plan");
  doc.font("Helvetica").fontSize(10);
  doc.text(record.plan_name ?? "—");
  if (record.duration_unit && record.duration_value) doc.text(durationLabel(record.duration_unit, record.duration_value));
  if (record.start_date && record.end_date) doc.text(`${record.start_date} to ${record.end_date}`);

  doc.moveDown(1.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#dddddd").stroke();
  doc.moveDown(1);

  const rows: Array<[string, string, boolean]> = [
    ["Amount", formatAmount(record.amount, record.currency), false],
    ["Discount", `- ${formatAmount(record.discount_amount, record.currency)}`, false],
  ];
  if (record.tax_amount > 0) {
    rows.push([`${record.tax_label ?? "Tax"} (${record.tax_rate}%)`, formatAmount(record.tax_amount, record.currency), false]);
  }
  rows.push(["Total", formatAmount(record.total_amount, record.currency), true]);
  rows.push(["Amount paid", formatAmount(record.amount_paid, record.currency), false]);
  rows.push(["Balance due", formatAmount(record.balance_due, record.currency), true]);

  const labelX = 320;
  const valueX = 460;
  const rowHeight = 18;
  let y = doc.y;
  rows.forEach(([label, value, bold]) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10.5);
    doc.text(label, labelX, y, { width: 130 });
    doc.text(value, valueX, y, { width: 85, align: "right" });
    y += rowHeight;
  });
  doc.y = y + 12;

  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#dddddd").stroke();
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(11).text("Payments received", 50, doc.y);
  doc.font("Helvetica").fontSize(9.5);
  if (paymentRows.length === 0) {
    doc.text("No payments recorded yet.");
  } else {
    paymentRows.forEach((payment) => {
      const parts = [payment.payment_date, formatAmount(payment.amount, payment.currency), payment.method ?? "—"];
      if (payment.reference) parts.push(`Ref: ${payment.reference}`);
      if (payment.received_by) parts.push(`by ${payment.received_by}`);
      doc.text(parts.join("   ·   "));
    });
  }

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(10).text(`Authorized staff: ${authorizedStaff}`);

  doc.moveDown(1.5);
  doc.font("Helvetica-Oblique").fontSize(10).fillColor("#555555").text(settings.thank_you_message, { align: "center" });

  doc.end();
  const buffer = await finished;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${record.invoice_number}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
