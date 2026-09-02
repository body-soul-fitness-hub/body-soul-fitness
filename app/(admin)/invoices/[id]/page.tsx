import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_GYM_SETTINGS, GYM_SETTINGS_ID, type GymSettings } from "@/lib/settings/types";
import { type Invoice } from "@/lib/invoices/types";
import { WhatsAppService } from "@/lib/whatsapp/click-to-chat";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { durationLabel } from "@/lib/plans/types";
import { labelFor } from "@/lib/enquiries/types";
import { PAYMENT_MODES, PAYMENT_STATUSES, type MemberPayment } from "@/lib/subscriptions/types";
import { PrintButton } from "./print-button";

type MemberInfo = { id: string; member_id: string; full_name: string; mobile_number: string; whatsapp_number?: string | null };

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: invoiceRow, error }, { data: settingsRow }, { data: payments }] = await Promise.all([
    supabaseAdmin.from("invoices").select("*, members(id, member_id, full_name, mobile_number, whatsapp_number)").eq("id", id).maybeSingle(),
    supabaseAdmin.from("gym_settings").select("*").eq("id", GYM_SETTINGS_ID).maybeSingle(),
    supabaseAdmin.from("member_payments").select("*").eq("invoice_id", id).order("payment_date", { ascending: true }),
  ]);

  if (error || !invoiceRow) {
    notFound();
  }

  const record = invoiceRow as Invoice & { members: MemberInfo | null };
  const member = record.members;
  const settings: GymSettings = { id: GYM_SETTINGS_ID, updated_at: new Date().toISOString(), ...DEFAULT_GYM_SETTINGS, ...(settingsRow ?? {}) };
  const paymentRows = (payments ?? []) as MemberPayment[];
  const authorizedStaff = record.created_by ?? paymentRows[paymentRows.length - 1]?.received_by ?? null;
  const waLink = member
    ? WhatsAppService.buildWhatsAppUrl(
        member.whatsapp_number || member.mobile_number,
        WhatsAppService.buildMessage("invoice", { memberName: member.full_name, gymName: settings.gym_name, invoiceNumber: record.invoice_number, amount: record.total_amount, paymentDate: record.issue_date, membershipPlan: record.plan_name, membershipExpiryDate: record.end_date })
      )
    : null;
  const contactLines = [settings.address, [settings.phone, settings.email].filter(Boolean).join("  ·  ") || null, settings.website, settings.gstin ? `GSTIN: ${settings.gstin}` : null].filter(Boolean) as string[];

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10 print:bg-white print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href={member ? `/members/${member.id}` : "/payments"}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">Invoice</p>
            <h1 className="font-display mt-1 text-2xl font-black tracking-[-0.05em] sm:text-3xl">{record.invoice_number}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PrintButton />
          <a className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e5] bg-white px-4 py-3 text-sm font-extrabold text-[#0f1816]" href={`/invoices/${record.id}/pdf`}>
            <Download size={16} /> Download PDF
          </a>
          <WhatsAppButton href={waLink} label="Send Invoice on WhatsApp" />
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-3xl rounded-3xl border border-[#e5e9e5] bg-white p-8 print:mt-0 print:max-w-none print:rounded-none print:border-0 print:p-0 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[#f0f2f0] pb-6">
          <div>
            <h2 className="font-display text-2xl font-black tracking-[-0.04em]">{settings.gym_name}</h2>
            <div className="mt-2 space-y-0.5 text-xs font-medium text-[#6c7773]">
              {contactLines.length === 0 && <p>—</p>}
              {contactLines.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">Invoice / Receipt</p>
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
            <p className="text-xs font-medium text-[#6c7773]">Mobile: {member?.mobile_number ?? "—"}</p>
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
            <Row label="Amount" value={formatAmount(record.amount)} />
            <Row label="Discount" value={`− ${formatAmount(record.discount_amount)}`} />
            {record.tax_amount > 0 && <Row label={`${record.tax_label ?? "Tax"} (${record.tax_rate}%)`} value={formatAmount(record.tax_amount)} />}
            <Row bold label="Total" value={formatAmount(record.total_amount)} />
            <Row label="Amount paid" value={formatAmount(record.amount_paid)} />
            <Row bold label="Balance due" value={formatAmount(record.balance_due)} />
          </dl>
        </div>

        <div className="mt-8 border-t border-[#f0f2f0] pt-6">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">Payments received</p>
          {paymentRows.length === 0 ? (
            <p className="mt-2 text-sm font-medium text-[#6c7773]">No payments recorded yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
                    <th className="py-1.5 pr-4">Date</th>
                    <th className="py-1.5 pr-4">Amount</th>
                    <th className="py-1.5 pr-4">Method</th>
                    <th className="py-1.5">Received by</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((payment) => (
                    <tr className="border-t border-[#f0f2f0]" key={payment.id}>
                      <td className="py-2 pr-4 text-[#3a4542]">{payment.payment_date}</td>
                      <td className="py-2 pr-4 font-bold">{formatAmount(payment.amount)}</td>
                      <td className="py-2 pr-4 text-[#3a4542]">{labelFor(PAYMENT_MODES, payment.method)}</td>
                      <td className="py-2 text-[#3a4542]">{payment.received_by ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#f0f2f0] pt-6">
          <p className="text-xs font-medium text-[#6c7773]">Authorized staff: <span className="font-extrabold text-[#0f1816]">{authorizedStaff ?? "—"}</span></p>
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
