import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, UserCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getMemberPhotoUrl } from "@/lib/members/photo";
import {
  MEMBER_STATUSES,
  type Member,
  type MemberCheckin,
  type MemberNote,
  type MemberNotification,
  type MemberPayment,
  type MemberStatusChange,
  type MemberSubscription,
} from "@/lib/members/types";
import { GENDERS, WORKOUT_TIMES, calculateAge, labelFor } from "@/lib/enquiries/types";
import { NoteForm, StatusChangeForm } from "./detail-forms";

function statusTone(status: string): string {
  switch (status) {
    case "active":
      return "bg-[#e7f7c5] text-[#4f6d1e]";
    case "frozen":
      return "bg-[#dbeafe] text-[#1e4b8f]";
    case "suspended":
      return "bg-[#ffe5dc] text-[#a94f37]";
    case "expired":
      return "bg-[#ffe9c7] text-[#8a5a12]";
    default:
      return "bg-[#e4efea] text-[#27463b]";
  }
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  return `${currency} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [
    { data: member, error },
    { data: subscriptions },
    { data: payments },
    { data: checkins },
    { data: notifications },
    { data: notes },
    { data: statusChanges },
  ] = await Promise.all([
    supabaseAdmin.from("members").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin.from("member_subscriptions").select("*").eq("member_id", id).order("start_date", { ascending: false }),
    supabaseAdmin.from("member_payments").select("*").eq("member_id", id).order("payment_date", { ascending: false }),
    supabaseAdmin.from("member_checkins").select("*").eq("member_id", id).order("checked_in_at", { ascending: false }).limit(50),
    supabaseAdmin.from("member_notifications").select("*").eq("member_id", id).order("sent_at", { ascending: false }).limit(50),
    supabaseAdmin.from("member_notes").select("*").eq("member_id", id).order("created_at", { ascending: false }),
    supabaseAdmin.from("member_status_changes").select("*").eq("member_id", id).order("created_at", { ascending: false }),
  ]);

  if (error || !member) {
    notFound();
  }

  const record = member as Member;
  const age = calculateAge(record.date_of_birth);
  const photoUrl = await getMemberPhotoUrl(record.photo_path);

  return (
    <div className="grid-pattern px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link className="grid size-10 place-items-center rounded-xl border border-[#e5e9e5] bg-white" href="/members">
            <ArrowLeft size={18} />
          </Link>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={record.full_name} className="size-14 rounded-2xl border border-[#e5e9e5] object-cover" src={photoUrl} />
          ) : (
            <div className="grid size-14 place-items-center rounded-2xl border border-[#e5e9e5] bg-[#f9faf8] text-[#89938f]">
              <UserCircle size={26} />
            </div>
          )}
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#699238]">{record.member_id}</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="font-display text-2xl font-black tracking-[-0.05em] sm:text-3xl">{record.full_name}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusTone(record.status)}`}>{labelFor(MEMBER_STATUSES, record.status)}</span>
            </div>
          </div>
        </div>

        <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111c19] px-5 py-3 text-sm font-extrabold text-white shadow-xl shadow-[#111c19]/15" href={`/members/${record.id}/edit`}>
          <Pencil size={16} /> Edit member
        </Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Personal information</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Mobile number" value={record.mobile_number} />
              <Detail label="WhatsApp number" value={record.whatsapp_number} />
              <Detail label="Email" value={record.email} />
              <Detail label="Gender" value={labelFor(GENDERS, record.gender)} />
              <Detail label="Date of birth" value={record.date_of_birth ? `${record.date_of_birth}${age !== null ? ` (${age} yrs)` : ""}` : null} />
              <Detail label="Joining date" value={record.join_date} />
              <Detail className="sm:col-span-2" label="Address" value={record.address} />
              <Detail label="Emergency contact" value={record.emergency_contact_name} />
              <Detail label="Emergency contact number" value={record.emergency_contact_number} />
              <Detail label="Fitness goal" value={record.fitness_goal} />
              <Detail label="Plan" value={record.plan} />
              <Detail label="Preferred workout time" value={labelFor(WORKOUT_TIMES, record.preferred_workout_time)} />
              <Detail label="Referred by" value={record.referred_by} />
              <Detail label="Assigned trainer" value={record.assigned_trainer} />
              <Detail label="Assigned staff" value={record.assigned_staff} />
              <Detail className="sm:col-span-2" label="Medical notes / health declaration" value={record.medical_notes} />
            </dl>
          </section>

          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Subscriptions</p>
            <p className="mt-1 text-xs font-medium text-[#89938f]">Current and past membership plan terms.</p>
            <SubscriptionsTable subscriptions={(subscriptions ?? []) as MemberSubscription[]} />
          </section>

          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Payments & bills</p>
            <PaymentsTable payments={(payments ?? []) as MemberPayment[]} />
          </section>

          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Check-in / check-out history</p>
            <CheckinsTable checkins={(checkins ?? []) as MemberCheckin[]} />
          </section>

          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Notifications sent</p>
            <NotificationsList notifications={(notifications ?? []) as MemberNotification[]} />
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Change status</p>
            <p className="mt-1 text-xs font-medium text-[#89938f]">Deactivate, freeze, suspend, or reactivate with an audit reason.</p>
            <div className="mt-4">
              <StatusChangeForm currentStatus={record.status} memberRowId={record.id} />
            </div>
            {(statusChanges ?? []).length > 0 && (
              <div className="mt-5 space-y-3 border-t border-[#f0f2f0] pt-4">
                {(statusChanges as MemberStatusChange[]).map((change) => (
                  <div key={change.id}>
                    <p className="text-xs font-bold leading-snug">
                      {labelFor(MEMBER_STATUSES, change.previous_status)} → {labelFor(MEMBER_STATUSES, change.new_status)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-[#6c7773]">{change.reason}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-[#89938f]">
                      {new Date(change.created_at).toLocaleString()}{change.changed_by ? ` · ${change.changed_by}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#e5e9e5] bg-white p-6">
            <p className="text-sm font-extrabold">Notes</p>
            <div className="mt-4">
              <NoteForm memberRowId={record.id} />
            </div>
            <ol className="mt-5 space-y-4 border-t border-[#f0f2f0] pt-4">
              {(notes ?? []).length === 0 && <p className="text-sm font-medium text-[#6c7773]">No notes yet.</p>}
              {(notes as MemberNote[] | null ?? []).map((note) => (
                <li key={note.id}>
                  <p className="text-sm font-medium leading-snug">{note.note}</p>
                  <p className="mt-0.5 text-xs font-medium text-[#89938f]">
                    {new Date(note.created_at).toLocaleString()}{note.created_by ? ` · ${note.created_by}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
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

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td className="px-0 py-6 text-center text-sm font-medium text-[#6c7773]" colSpan={colSpan}>{label}</td>
    </tr>
  );
}

function SubscriptionsTable({ subscriptions }: { subscriptions: MemberSubscription[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#f0f2f0] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
            <th className="py-2.5 pr-4">Plan</th>
            <th className="py-2.5 pr-4">Start</th>
            <th className="py-2.5 pr-4">End</th>
            <th className="py-2.5 pr-4">Amount</th>
            <th className="py-2.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.length === 0 ? (
            <EmptyRow colSpan={5} label="No subscriptions on record yet." />
          ) : (
            subscriptions.map((sub) => (
              <tr className="border-b border-[#f0f2f0] last:border-0" key={sub.id}>
                <td className="py-2.5 pr-4 font-bold">{sub.plan_name}</td>
                <td className="py-2.5 pr-4 text-[#3a4542]">{sub.start_date}</td>
                <td className="py-2.5 pr-4 text-[#3a4542]">{sub.end_date ?? "—"}</td>
                <td className="py-2.5 pr-4 text-[#3a4542]">{formatAmount(sub.amount, sub.currency)}</td>
                <td className="py-2.5 capitalize text-[#3a4542]">{sub.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTable({ payments }: { payments: MemberPayment[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#f0f2f0] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
            <th className="py-2.5 pr-4">Date</th>
            <th className="py-2.5 pr-4">Amount</th>
            <th className="py-2.5 pr-4">Method</th>
            <th className="py-2.5 pr-4">Reference</th>
            <th className="py-2.5">Received by</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <EmptyRow colSpan={5} label="No payments recorded yet." />
          ) : (
            payments.map((payment) => (
              <tr className="border-b border-[#f0f2f0] last:border-0" key={payment.id}>
                <td className="py-2.5 pr-4 text-[#3a4542]">{payment.payment_date}</td>
                <td className="py-2.5 pr-4 font-bold">{formatAmount(payment.amount, payment.currency)}</td>
                <td className="py-2.5 pr-4 text-[#3a4542]">{payment.method ?? "—"}</td>
                <td className="py-2.5 pr-4 text-[#3a4542]">{payment.reference ?? "—"}</td>
                <td className="py-2.5 text-[#3a4542]">{payment.received_by ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function CheckinsTable({ checkins }: { checkins: MemberCheckin[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#f0f2f0] text-xs font-extrabold uppercase tracking-wide text-[#89938f]">
            <th className="py-2.5 pr-4">Checked in</th>
            <th className="py-2.5 pr-4">Checked out</th>
            <th className="py-2.5">Method</th>
          </tr>
        </thead>
        <tbody>
          {checkins.length === 0 ? (
            <EmptyRow colSpan={3} label="No visits recorded yet." />
          ) : (
            checkins.map((visit) => (
              <tr className="border-b border-[#f0f2f0] last:border-0" key={visit.id}>
                <td className="py-2.5 pr-4 text-[#3a4542]">{new Date(visit.checked_in_at).toLocaleString()}</td>
                <td className="py-2.5 pr-4 text-[#3a4542]">{visit.checked_out_at ? new Date(visit.checked_out_at).toLocaleString() : "Still inside"}</td>
                <td className="py-2.5 capitalize text-[#3a4542]">{visit.method}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function NotificationsList({ notifications }: { notifications: MemberNotification[] }) {
  if (notifications.length === 0) {
    return <p className="mt-4 text-sm font-medium text-[#6c7773]">No notifications sent yet.</p>;
  }
  return (
    <ol className="mt-4 space-y-3">
      {notifications.map((notification) => (
        <li className="border-b border-[#f0f2f0] pb-3 last:border-0 last:pb-0" key={notification.id}>
          <p className="text-sm font-medium leading-snug">{notification.message}</p>
          <p className="mt-0.5 text-xs font-medium text-[#89938f]">
            {notification.channel} · {new Date(notification.sent_at).toLocaleString()} · {notification.status}
          </p>
        </li>
      ))}
    </ol>
  );
}
