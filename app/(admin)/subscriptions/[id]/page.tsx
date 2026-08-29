import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, RefreshCw } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { labelFor } from "@/lib/enquiries/types";
import { durationLabel } from "@/lib/plans/types";
import {
  deriveSubscriptionStatus,
  PAYMENT_STATUSES,
  SUBSCRIPTION_DISPLAY_STATUSES,
  type MemberPayment,
  type MemberSubscription,
  type SubscriptionEvent,
} from "@/lib/subscriptions/types";
import { CancelForm, ExtendForm, FreezeForm, RecordPaymentForm, UnfreezeForm } from "./subscription-actions-forms";

function statusTone(status: string): string {
  switch (status) {
    case "active":
      return "bg-[#e7f7c5] text-[#4f6d1e]";
    case "expiring_soon":
      return "bg-[#ffe9c7] text-[#8a5a12]";
    case "expired":
      return "bg-[#ffe5dc] text-[#a94f37]";
    case "frozen":
      return "bg-[#dbeafe] text-[#1e4b8f]";
    default:
      return "bg-[#e4efea] text-[#27463b]";
  }
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  return `${currency} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type MemberInfo = { id: string; member_id: string; full_name: string; mobile_number: string };

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: sub, error } = await supabaseAdmin
    .from("member_subscriptions")
    .select("*, members(id, member_id, full_name, mobile_number)")
    .eq("id", id)
    .maybeSingle();

  if (error || !sub) {
    notFound();
  }

  const record = sub as MemberSubscription & { members: MemberInfo | null };
  const member = record.members;
  const displayStatus = deriveSubscriptionStatus(record);

  const [{ data: events }, { data: payments }, { data: renewal }, { data: invoice }] = await Promise.all([
    supabaseAdmin.from("subscription_events").select("*").eq("subscription_id", id).order("created_at", { ascending: false }),
    supabaseAdmin.from("member_payments").select("*").eq("subscription_id", id).order("payment_date", { ascending: false }),
    supabaseAdmin.from("member_subscriptions").select("id, plan_name, start_date").eq("renewed_from_id", id).maybeSingle(),
    supabaseAdmin.from("invoices").select("id, invoice_number").eq("subscription_id", id).maybeSingle(),
  ]);

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href={member ? `/members/${member.id}` : "/subscriptions"}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">
              {member ? <Link className="underline" href={`/members/${member.id}`}>{member.member_id} · {member.full_name}</Link> : "Subscription"}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="font-display text-2xl font-black tracking-[-0.05em] sm:text-3xl">{record.plan_name}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone(displayStatus)}`}>{labelFor(SUBSCRIPTION_DISPLAY_STATUSES, displayStatus)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {invoice && (
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e5] bg-white px-5 py-3 text-sm font-extrabold text-[#0f1816]"
              href={`/invoices/${invoice.id}`}
            >
              <FileText size={16} /> {invoice.invoice_number}
            </Link>
          )}
          {member && displayStatus !== "cancelled" && (
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111c19] px-5 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15"
              href={`/subscriptions/new?memberId=${member.id}&renewedFromId=${record.id}`}
            >
              <RefreshCw size={16} /> Renew
            </Link>
          )}
        </div>
      </div>

      {renewal && (
        <p className="mt-4 text-sm font-medium text-[#6c7773]">
          Renewed as <Link className="font-bold underline" href={`/subscriptions/${renewal.id}`}>{renewal.plan_name}</Link> starting {renewal.start_date}.
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Subscription details</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Plan" value={record.plan_name} />
              <Detail label="Duration" value={record.duration_unit && record.duration_value ? durationLabel(record.duration_unit, record.duration_value) : null} />
              <Detail label="Start date" value={record.start_date} />
              <Detail label="End date" value={record.end_date} />
              <Detail label="Standard price" value={formatAmount(record.standard_price, record.currency)} />
              <Detail label="Discount" value={record.discount_type ? `${record.discount_value}${record.discount_type === "percentage" ? "%" : ` ${record.currency}`}` : "None"} />
              <Detail label="Final amount" value={formatAmount(record.final_amount, record.currency)} />
              <Detail label="Notes" value={record.notes} />
              {record.status === "frozen" && <Detail label="Freeze reason" value={record.freeze_reason} />}
              {record.status === "cancelled" && <Detail label="Cancel reason" value={record.cancel_reason} />}
              <Detail label="Created by" value={record.created_by} />
              <Detail label="Created" value={new Date(record.created_at).toLocaleString()} />
            </dl>
          </section>

          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Payment</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Payment status" value={labelFor(PAYMENT_STATUSES, record.payment_status)} />
              <Detail label="Payment mode" value={record.payment_mode ? record.payment_mode.replace("_", " ") : null} />
              <Detail label="Amount paid" value={formatAmount(record.amount_paid, record.currency)} />
              <Detail label="Balance due" value={formatAmount(record.balance_due, record.currency)} />
            </dl>

            <div className="mt-5 overflow-x-auto border-t border-[#f0f2f0] pt-4">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {(payments ?? []).length === 0 ? (
                    <tr><td className="py-3 text-sm font-medium text-[#6c7773]" colSpan={4}>No payments recorded yet.</td></tr>
                  ) : (
                    (payments as MemberPayment[]).map((payment) => (
                      <tr className="border-t border-[#f0f2f0]" key={payment.id}>
                        <td className="py-2.5 pr-4 text-[#3a4542]">{payment.payment_date}</td>
                        <td className="py-2.5 pr-4 font-bold">{formatAmount(payment.amount, payment.currency)}</td>
                        <td className="py-2.5 pr-4 capitalize text-[#3a4542]">{payment.method?.replace("_", " ") ?? "—"}</td>
                        <td className="py-2.5 text-[#3a4542]">{payment.reference ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {record.status !== "cancelled" && record.balance_due > 0 && (
              <div className="mt-5 border-t border-[#f0f2f0] pt-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-[#89938f]">Record a payment</p>
                <RecordPaymentForm subscriptionId={record.id} />
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">History</p>
            <ol className="mt-4 space-y-4 border-t border-[#f0f2f0] pt-4">
              {(events ?? []).length === 0 && <p className="text-sm font-medium text-[#6c7773]">No events yet.</p>}
              {(events as SubscriptionEvent[] | null ?? []).map((event) => (
                <li key={event.id}>
                  <p className="text-sm font-bold capitalize leading-snug">{event.event_type.replace("_", " ")}</p>
                  <p className="mt-0.5 text-xs font-medium text-[#6c7773]">{event.details}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#89938f]">
                    {new Date(event.created_at).toLocaleString()}{event.performed_by ? ` · ${event.performed_by}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-5">
          {record.status === "active" && (
            <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
              <p className="text-sm font-extrabold">Extend</p>
              <p className="mt-1 text-xs font-medium text-[#89938f]">Push the end date out without creating a new subscription.</p>
              <div className="mt-4"><ExtendForm subscriptionId={record.id} /></div>
            </section>
          )}

          {record.status === "active" && (
            <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
              <p className="text-sm font-extrabold">Freeze</p>
              <p className="mt-1 text-xs font-medium text-[#89938f]">Pause this subscription temporarily.</p>
              <div className="mt-4"><FreezeForm subscriptionId={record.id} /></div>
            </section>
          )}

          {record.status === "frozen" && (
            <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
              <p className="text-sm font-extrabold">Resume</p>
              <p className="mt-1 text-xs font-medium text-[#89938f]">Frozen since {record.frozen_at ? new Date(record.frozen_at).toLocaleDateString() : "—"}.</p>
              <div className="mt-4"><UnfreezeForm subscriptionId={record.id} /></div>
            </section>
          )}

          {record.status !== "cancelled" && (
            <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
              <p className="text-sm font-extrabold">Cancel</p>
              <p className="mt-1 text-xs font-medium text-[#89938f]">Ends this subscription for good — this cannot be undone.</p>
              <div className="mt-4"><CancelForm subscriptionId={record.id} /></div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, className }: { label: string; value: string | null | undefined; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-extrabold uppercase tracking-wide text-[#89938f]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#0f1816]">{value || "—"}</dd>
    </div>
  );
}
