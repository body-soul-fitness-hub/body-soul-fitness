import { buildPaymentsQuery, parsePaymentFilters } from "@/lib/payments/filters";
import { PAYMENT_STATUSES, type MemberPayment } from "@/lib/subscriptions/types";
import { labelFor } from "@/lib/enquiries/types";
import { toCsv } from "@/lib/csv";

const EXPORT_ROW_LIMIT = 5000;

const COLUMNS = [
  { key: "payment_date", header: "Payment date" },
  { key: "member_id_code", header: "Member ID" },
  { key: "member_name", header: "Member name" },
  { key: "member_mobile", header: "Mobile number" },
  { key: "invoice_number", header: "Invoice number" },
  { key: "amount", header: "Amount" },
  { key: "currency", header: "Currency" },
  { key: "method", header: "Method" },
  { key: "reference", header: "Reference" },
  { key: "bill_status", header: "Bill status" },
  { key: "received_by", header: "Received by" },
];

type PaymentRow = MemberPayment & {
  invoices: { invoice_number: string; status: string } | null;
  members: { member_id: string; full_name: string; mobile_number: string } | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parsePaymentFilters(Object.fromEntries(url.searchParams));

  const { data, error } = await buildPaymentsQuery(filters).order("payment_date", { ascending: false }).limit(EXPORT_ROW_LIMIT);

  if (error) {
    return new Response(`Could not export payments: ${error.message}`, { status: 500 });
  }

  const rows = ((data ?? []) as unknown as PaymentRow[]).map((payment) => ({
    payment_date: payment.payment_date,
    member_id_code: payment.members?.member_id ?? "",
    member_name: payment.members?.full_name ?? "",
    member_mobile: payment.members?.mobile_number ?? "",
    invoice_number: payment.invoices?.invoice_number ?? "",
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method ?? "",
    reference: payment.reference ?? "",
    bill_status: payment.invoices ? labelFor(PAYMENT_STATUSES, payment.invoices.status) : "",
    received_by: payment.received_by ?? "",
  }));

  const csv = toCsv(rows, COLUMNS);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
