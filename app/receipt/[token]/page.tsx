import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_GYM_SETTINGS, GYM_SETTINGS_ID, type GymSettings } from "@/lib/settings/types";
import { labelFor } from "@/lib/enquiries/types";
import { durationLabel } from "@/lib/plans/types";
import type { Invoice } from "@/lib/invoices/types";
import { PAYMENT_STATUSES, type MemberPayment } from "@/lib/subscriptions/types";
import { PrintButton } from "@/app/(admin)/invoices/[id]/print-button";

type MemberInfo = { full_name: string; member_id: string; mobile_number: string };

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusTone(status: string): string {
  switch (status) {
    case "paid":
      return "bg-[#e7f7c5] text-[#4f6d1e]";
    case "partial":
      return "bg-[#ffe9c7] text-[#8a5a12]";
    default:
      return "bg-[#ffe5dc] text-[#a94f37]";
  }
}

// Public — reached via the receipt link sent over WhatsApp, so this deliberately has no admin
// chrome, no edit/back links, and looks the invoice up by the unguessable share_token rather than
// its internal id.
export default async function PublicReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [{ data: invoiceRow, error }, { data: settingsRow }] = await Promise.all([
    supabaseAdmin.from("invoices").select("*, members(full_name, member_id, mobile_number)").eq("share_token", token).maybeSingle(),
    supabaseAdmin.from("gym_settings").select("*").eq("id", GYM_SETTINGS_ID).maybeSingle(),
  ]);

  if (error || !invoiceRow) notFound();

  const record = invoiceRow as Invoice & { members: MemberInfo | null };
  const member = record.members;
  const settings: GymSettings = { id: GYM_SETTINGS_ID, updated_at: new Date().toISOString(), ...DEFAULT_GYM_SETTINGS, ...(settingsRow ?? {}) };

  const { data: payments } = await supabaseAdmin.from("member_payments").select("*").eq("invoice_id", record.id).order("payment_date", { ascending: true });
  const paymentRows = (payments ?? []) as MemberPayment[];
  const contactLines = [settings.address, [settings.phone, settings.email].filter(Boolean).join("  ·  ") || null, settings.website].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-[#f5f7f4] px-5 py-8 text-[#0f1816] sm:px-8 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-3xl items-center justify-end gap-3 print:hidden">
        <PrintButton />
        <a className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111c19] px-4 py-3 text-sm font-extrabold text-white" href={`/receipt/${token}/pdf`}>
          <Download size={16} /> Download PDF
        </a>
      </div>

      <div className="mx-auto mt-4 max-w-3xl rounded-3xl border border-[#e5e9e5] bg-white p-8 print:mt-0 print:max-w-none print:rounded-none print:border-0 print:p-0 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[#f0f2f0] pb-6">
          <div>
            <h2 className="font-display text-2xl font-black tracking-[-0.04em]">{settings.gym_name}</h2>
            <div className="mt-2 space-y-0.5 text-xs font-medium text-[#6c7773]">
              {contactLines.length === 0 && <p>—</p>}
              {contactLines.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">Receipt</p>
            <p className="mt-1 font-mono text-lg font-black">{record.invoice_number}</p>
            <p className="mt-1 text-xs font-medium text-[#6c7773]">{record.issue_date}</p>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone(record.status)}`}>{labelFor(PAYMENT_STATUSES, record.status)}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">Billed to</p>
            <p className="mt-1.5 text-sm font-extrabold">{member?.full_name ?? "—"}</p>
            <p className="text-xs font-medium text-[#6c7773]">Member ID: {member?.member_id ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">Plan</p>
            <p className="mt-1.5 text-sm font-extrabold">{record.plan_name ?? "—"}</p>
            <p className="text-xs font-medium text-[#6c7773]">
              {record.duration_unit && record.duration_value ? durationLabel(record.duration_unit, record.duration_value) : "—"}
            </p>
            {record.start_date && record.end_date && <p className="text-xs font-medium text-[#6c7773]">{record.start_date} → {record.end_date}</p>}
          </div>
        </div>

        <div className="mt-8 border-t border-[#f0f2f0] pt-6">
          <dl className="space-y-2.5 text-sm">
            <Row label="Amount" value={formatAmount(record.amount, record.currency)} />
            <Row label="Discount" value={`− ${formatAmount(record.discount_amount, record.currency)}`} />
            {record.tax_amount > 0 && <Row label={`${record.tax_label ?? "Tax"} (${record.tax_rate}%)`} value={formatAmount(record.tax_amount, record.currency)} />}
            <Row bold label="Total" value={formatAmount(record.total_amount, record.currency)} />
            <Row label="Amount paid" value={formatAmount(record.amount_paid, record.currency)} />
            <Row bold label="Balance due" value={formatAmount(record.balance_due, record.currency)} />
          </dl>
        </div>

        {paymentRows.length > 0 && (
          <div className="mt-8 border-t border-[#f0f2f0] pt-6">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">Payments received</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
                    <th className="py-1.5 pr-4">Date</th>
                    <th className="py-1.5 pr-4">Amount</th>
                    <th className="py-1.5">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((payment) => (
                    <tr className="border-t border-[#f0f2f0]" key={payment.id}>
                      <td className="py-2 pr-4 text-[#3a4542]">{payment.payment_date}</td>
                      <td className="py-2 pr-4 font-bold">{formatAmount(payment.amount, payment.currency)}</td>
                      <td className="py-2 capitalize text-[#3a4542]">{payment.method?.replace("_", " ") ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-[#f0f2f0] pt-6 text-center">
          <p className="text-sm font-medium italic text-[#6c7773]">{settings.thank_you_message}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-extrabold" : "font-medium text-[#3a4542]"}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
